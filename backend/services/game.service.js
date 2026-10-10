const crypto = require('crypto');
const db = require('../db');
const engine = require('./game.engine');
const push = require('./push.service');

const COLLECTION = 'games';
const HOUR = 3600 * 1000;
const TURN_HOURS = [24, 12, 6, 1];
const MIN_PLAYERS = Number(process.env.MIN_PLAYERS) || 4;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

class GameError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const games = () => db.collection(COLLECTION);
const ordersOf = (ref) => ref.collection('orders');

function randomCode() {
  return Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/* Vue d'une partie pour un joueur donné (les ordres des autres restent secrets) */
function viewFor(game, id, uid, ordersDocs) {
  const me = game.players.findIndex((p) => p.uid === uid);
  const current = ordersDocs.filter((o) => o.day === game.day);
  const mine = current.find((o) => o.uid === uid);
  return {
    id,
    code: game.code,
    name: game.name,
    hostId: game.hostId,
    status: game.status,
    turnHours: game.turnHours,
    earlyResolve: game.earlyResolve,
    minPlayers: MIN_PLAYERS,
    maxPlayers: engine.MAX_PLAYERS,
    maxDays: engine.MAX_DAYS,
    shieldDuration: engine.SHIELD_DURATION,
    palette: engine.COLORS,
    emblems: engine.EMBLEMS,
    players: game.players,
    day: game.day ?? 0,
    lots: game.lots ?? [],
    lastWeather: game.lastWeather ?? null,
    log: game.log ?? [],
    history: game.history ?? [],
    ranking: game.ranking ?? null,
    deadline: game.deadline ?? null,
    ready: game.players.map((p) => !!current.find((o) => o.uid === p.uid && o.ready)),
    me,
    myOrders: mine ? mine.orders : engine.emptyOrders(),
    myReady: !!mine?.ready,
  };
}

function summaryFor(game, id, uid) {
  const me = game.players.find((p) => p.uid === uid);
  return {
    id,
    code: game.code,
    name: game.name,
    status: game.status,
    day: game.day ?? 0,
    deadline: game.deadline ?? null,
    playerCount: game.players.length,
    batteries: me?.batteries ?? null,
    razoonium: me?.razoonium ?? 0,
    alive: me?.alive ?? true,
    isHost: game.hostId === uid,
  };
}

// ── Notifications ────────────────────────────────────────────────────────────

const WEATHER_TXT = { calm: '☾ Calme', storm: '⚡ Tempête', abundance: '☀ Abondance' };
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

function turnMessages(id, game) {
  const last = game.log[0];
  const tag = `game-${id}`;
  const url = `/game/${id}?tab=journal`;
  return game.players.flatMap((p, idx) => {
    if (game.status === 'over') {
      const rank = game.ranking.indexOf(idx) + 1;
      return [{
        uid: p.uid,
        payload: {
          title: `🏆 ${game.name} — partie terminée`,
          body: rank !== 1 ? `Tu finis #${rank} sur ${game.players.length}.`
            : p.alive ? `Victoire ! Tu finis #1 avec ${p.razoonium || 0} Razoonium.`
              : 'Tous les dômes se sont éteints — tu as tenu le plus longtemps (#1).',
          url: `/game/${id}?tab=score`, tag,
        },
      }];
    }
    if (p.elimDay === last.day) {
      return [{ uid: p.uid, payload: { title: `☠ ${game.name}`, body: `Jour ${last.day} : ton dôme s'est éteint.`, url, tag } }];
    }
    if (!p.alive) return [];
    const b = last.bilan.find((x) => x.id === idx);
    return [{
      uid: p.uid,
      payload: {
        title: `${game.name} · Jour ${last.day} résolu`,
        body: `${WEATHER_TXT[last.weather]} — 🔋 ${b.before} → ${b.after} (${signed(b.after - b.before)}). Donne tes ordres pour le jour ${game.day} !`,
        url, tag,
      },
    }];
  });
}

function launchMessages(id, game) {
  return game.players.filter((p) => p.uid !== game.hostId).map((p) => ({
    uid: p.uid,
    payload: {
      title: `⚡ ${game.name} a commencé`,
      body: `Jour 1 — tu as ${engine.START_BATTERIES} 🔋. Résolution dans ${game.turnHours}h : donne tes ordres !`,
      url: `/game/${id}`, tag: `game-${id}`,
    },
  }));
}

/* Rappel aux retardataires avant l'échéance (1h, ou un quart du tour s'il est plus court) */
async function remindLatecomers(doc, now) {
  const game = doc.data();
  const before = Math.min(HOUR, (game.turnHours * HOUR) / 4);
  if (game.reminderDay === game.day || game.deadline - now > before || game.deadline <= now) return false;
  const orders = (await ordersOf(doc.ref).get()).docs.filter((d) => d.data().day === game.day && d.data().ready);
  const late = game.players.filter((p) => p.alive && !orders.some((d) => d.id === p.uid));
  await doc.ref.update({ reminderDay: game.day });
  const minutes = Math.max(1, Math.round((game.deadline - now) / 60000));
  await push.sendMany(late.map((p) => ({
    uid: p.uid,
    payload: {
      title: `⏱ ${game.name} · Jour ${game.day}`,
      body: `Résolution dans ${minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${minutes} min`} et tu n'as pas validé tes ordres.`,
      url: `/game/${doc.id}`, tag: `game-${doc.id}`,
    },
  })));
  return late.length > 0;
}

/* Résout tous les tours dus (échéance passée, ou tout le monde prêt). Transactionnel.
   Renvoie true si au moins un tour a été résolu (et prévient alors les joueurs). */
async function maybeResolve(ref) {
  const resolvedGame = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
    const game = snap.data();
    if (game.status !== 'running') return null;

    const orders = (await tx.get(ordersOf(ref))).docs.map((d) => ({ uid: d.id, ...d.data() }));
    const now = Date.now();
    let resolved = 0;

    while (game.status === 'running' && resolved < engine.MAX_DAYS) {
      const current = orders.filter((o) => o.day === game.day);
      const alive = game.players.filter((p) => p.alive);
      const allReady = alive.every((p) => current.some((o) => o.uid === p.uid && o.ready));
      const late = now >= game.deadline;
      if (!late && !(game.earlyResolve && allReady)) break;

      const byIdx = new Map();
      current.forEach((o) => {
        const idx = game.players.findIndex((p) => p.uid === o.uid);
        if (idx >= 0) byIdx.set(idx, o.orders);
      });
      engine.resolveTurn(game, byIdx);
      game.deadline = late ? game.deadline + game.turnHours * HOUR : now + game.turnHours * HOUR;
      resolved++;
    }

    if (resolved) {
      if (game.status === 'over') game.deadline = null;
      tx.set(ref, game);
    }
    return resolved ? game : null;
  });
  // hors transaction : une transaction peut être rejouée, pas les notifications
  if (resolvedGame) await push.sendMany(turnMessages(ref.id, resolvedGame));
  return !!resolvedGame;
}

async function loadView(ref, uid) {
  const [snap, ordersSnap] = await Promise.all([ref.get(), ordersOf(ref).get()]);
  if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
  const game = snap.data();
  if (!game.playerIds.includes(uid)) throw new GameError(403, 'Tu ne fais pas partie de cette partie.');
  return viewFor(game, snap.id, uid, ordersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
}

// ── API ──────────────────────────────────────────────────────────────────────

async function listMyGames(uid) {
  const snap = await games().where('playerIds', 'array-contains', uid).get();
  const order = { running: 0, lobby: 1, over: 2 };
  return snap.docs
    .map((d) => ({ ...summaryFor(d.data(), d.id, uid), createdAt: d.data().createdAt?.toMillis?.() ?? 0 }))
    .sort((a, b) => order[a.status] - order[b.status] || b.createdAt - a.createdAt);
}

async function createGame(user, { name, turnHours, earlyResolve }) {
  const hours = TURN_HOURS.includes(Number(turnHours)) ? Number(turnHours) : 24;
  const ref = games().doc();
  const game = {
    code: randomCode(),
    name: String(name || `Secteur ${Math.floor(Math.random() * 900 + 100)}`).trim().slice(0, 32),
    hostId: user.uid,
    status: 'lobby',
    turnHours: hours,
    earlyResolve: earlyResolve !== false,
    playerIds: [user.uid],
    players: [{ uid: user.uid, name: user.name, ...engine.freeLook([]) }],
    createdAt: new Date(),
  };
  await ref.set(game);
  return viewFor(game, ref.id, user.uid, []);
}

async function joinGame(user, code) {
  const snap = await games().where('code', '==', String(code || '').toUpperCase().trim()).limit(1).get();
  if (snap.empty) throw new GameError(404, 'Aucune partie avec ce code.');
  const ref = snap.docs[0].ref;
  await db.runTransaction(async (tx) => {
    const game = (await tx.get(ref)).data();
    if (game.playerIds.includes(user.uid)) return;
    if (game.status !== 'lobby') throw new GameError(409, 'La partie a déjà commencé.');
    if (game.players.length >= engine.MAX_PLAYERS) throw new GameError(409, 'La partie est complète.');
    game.playerIds.push(user.uid);
    game.players.push({ uid: user.uid, name: user.name, ...engine.freeLook(game.players) });
    tx.update(ref, { playerIds: game.playerIds, players: game.players });
  });
  return loadView(ref, user.uid);
}

async function leaveGame(user, id) {
  const ref = games().doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
    const game = snap.data();
    if (game.status !== 'lobby') throw new GameError(409, 'Impossible de quitter une partie lancée.');
    if (game.hostId === user.uid) return tx.delete(ref);
    tx.update(ref, {
      playerIds: game.playerIds.filter((u) => u !== user.uid),
      players: game.players.filter((p) => p.uid !== user.uid),
    });
  });
}

/* Choix de la couleur et/ou de l'emblème dans le lobby (uniques dans la partie) */
async function setLook(user, id, { color, icon } = {}) {
  const ref = games().doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
    const game = snap.data();
    const me = game.players.find((p) => p.uid === user.uid);
    if (!me) throw new GameError(403, 'Tu ne fais pas partie de cette partie.');
    if (game.status !== 'lobby') throw new GameError(409, 'La partie a déjà commencé.');
    const others = game.players.filter((p) => p !== me);
    if (color !== undefined) {
      if (!engine.COLORS.includes(color)) throw new GameError(400, 'Couleur invalide.');
      if (others.some((p) => p.color === color)) throw new GameError(409, 'Couleur déjà prise.');
      me.color = color;
    }
    if (icon !== undefined) {
      if (!engine.EMBLEMS.includes(icon)) throw new GameError(400, 'Emblème invalide.');
      if (others.some((p) => p.icon === icon)) throw new GameError(409, 'Emblème déjà pris.');
      me.icon = icon;
    }
    tx.update(ref, { players: game.players });
  });
  return loadView(ref, user.uid);
}

/* L'hôte supprime définitivement la partie, quel que soit son état (ordres compris) */
async function deleteGame(user, id) {
  const ref = games().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
  const game = snap.data();
  if (game.hostId !== user.uid) throw new GameError(403, 'Seul l\'hôte peut supprimer la partie.');
  const batch = db.batch();
  (await ordersOf(ref).get()).docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref);
  await batch.commit();
  if (game.status !== 'lobby') {
    await push.sendMany(game.players.filter((p) => p.uid !== user.uid).map((p) => ({
      uid: p.uid,
      payload: { title: `🗑 ${game.name}`, body: 'L\'hôte a supprimé la partie.', url: '/', tag: `game-${id}` },
    })));
  }
}

async function launchGame(user, id) {
  const ref = games().doc(id);
  const started = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
    const game = snap.data();
    if (game.hostId !== user.uid) throw new GameError(403, 'Seul l\'hôte peut lancer la partie.');
    if (game.status !== 'lobby') throw new GameError(409, 'La partie a déjà commencé.');
    if (game.players.length < MIN_PLAYERS) throw new GameError(409, `Il faut au moins ${MIN_PLAYERS} joueurs.`);
    engine.startGame(game);
    game.startedAt = Date.now();
    game.deadline = game.startedAt + game.turnHours * HOUR;
    tx.set(ref, game);
    return game;
  });
  await push.sendMany(launchMessages(id, started));
  return loadView(ref, user.uid);
}

async function getGame(user, id) {
  const ref = games().doc(id);
  await maybeResolve(ref);
  return loadView(ref, user.uid);
}

async function submitOrders(user, id, rawOrders, ready) {
  const ref = games().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
  const game = snap.data();
  const idx = game.players.findIndex((p) => p.uid === user.uid);
  if (idx < 0) throw new GameError(403, 'Tu ne fais pas partie de cette partie.');
  if (game.status !== 'running') throw new GameError(409, 'La partie n\'est pas en cours.');
  if (!game.players[idx].alive) throw new GameError(409, 'Ton dôme est éteint.');

  let orders;
  try {
    orders = engine.sanitizeOrders(rawOrders, game, idx);
  } catch (e) {
    throw new GameError(400, e.message);
  }
  await ordersOf(ref).doc(user.uid).set({ day: game.day, orders, ready: !!ready, updatedAt: new Date() });
  return getGame(user, id);
}

/* Appelé par Cloud Scheduler : résout les parties arrivées à échéance et relance les retardataires */
async function tick() {
  const snap = await games().where('status', '==', 'running').get();
  const now = Date.now();
  let resolved = 0;
  let reminded = 0;
  for (const doc of snap.docs) {
    if (doc.data().deadline <= now) {
      if (await maybeResolve(doc.ref)) resolved++;
    } else if (push.enabled && await remindLatecomers(doc, now)) {
      reminded++;
    }
  }
  return { checked: snap.size, resolved, reminded };
}

module.exports = {
  GameError, listMyGames, createGame, joinGame, leaveGame, setLook, deleteGame, launchGame, getGame, submitOrders, tick,
};
