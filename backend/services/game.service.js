const crypto = require('crypto');
const db = require('../db');
const engine = require('./game.engine');
const push = require('./push.service');

const COLLECTION = 'games';
const GAME_KIND = 'chateau'; // distingue les parties de ce jeu des anciennes (Razoonium)
const TURN_SECONDS = [60, 180, 900, 7200, 43200];
const MIN_PLAYERS = Number(process.env.MIN_PLAYERS) || engine.MIN_PLAYERS;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CHAT_LIMIT = 150;
const CHAT_MAX_LEN = 300;

class GameError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const games = () => db.collection(COLLECTION);
const chatOf = (ref) => ref.collection('chat');
const isLegacy = (game) => game.kind !== GAME_KIND;

function randomCode() {
  return Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/* Les règles lèvent des Error simples : on les traduit en 400 */
function rule(fn) {
  try {
    return fn();
  } catch (e) {
    throw new GameError(400, e.message);
  }
}

// ── Délais ───────────────────────────────────────────────────────────────────

function phaseMs(game) {
  if (game.status !== 'running') return null;
  return game.turnSeconds * 1000;
}

function resetDeadline(game, from = Date.now()) {
  const ms = phaseMs(game);
  game.deadline = ms === null ? null : from + ms;
}

/* Fait avancer la partie quand l'échéance est dépassée.
   Chaque nouvelle étape repart d'un délai complet : un joueur notifié en retard garde tout son temps. */
function advance(game, now = Date.now()) {
  let steps = 0;
  while (game.status === 'running' && steps < 50) {
    if (now < game.deadline) break;
    if (game.phase === 'order') engine.timeoutOrder(game);
    else engine.timeoutTurn(game);
    resetDeadline(game, now);
    steps++;
  }
  return steps > 0;
}

// ── Notifications ────────────────────────────────────────────────────────────

/* Étape de jeu courante : une notification n'est envoyée que lorsqu'elle change */
const stageOf = (game) => `${game.status}:${game.round}:${game.phase}:${game.turn}:${game.pending ? 1 : 0}`;

function stageMessages(id, game) {
  const tag = `game-${id}`;
  const url = `/game/${id}`;
  const all = (payload) => game.players.map((p) => ({ uid: p.uid, payload }));
  if (game.status === 'over') {
    const k = game.players[game.killer];
    return all({
      title: `🏰 ${game.name} — partie terminée`,
      body: game.winner === 'killer' ? `Le Tueur ${k.name} a éliminé tous les survivants.` : `Le Tueur ${k.name} est tombé. Les survivants l'emportent !`,
      url, tag,
    });
  }
  if (game.phase === 'order') {
    const choose = 'Choisis ta position dans l\'ordre de passage.';
    const last = game.history[game.history.length - 1];
    if (!last) {
      return [{ uid: game.players[game.killer].uid, payload: { title: `🗡 ${game.name} · Manche ${game.round}`, body: choose, url, tag } }];
    }
    // fin de manche : le bilan à tous (le débat se tient hors du jeu), et au Tueur son choix
    const dead = last.deaths.map((d) => game.players[d.id].name);
    const news = dead.length ? `Cadavre(s) découvert(s) : ${dead.join(', ')}.` : 'Personne n\'est mort… cette fois.';
    return game.players.map((p, i) => ({
      uid: p.uid,
      payload: { title: `🏰 ${game.name} · Fin de la manche ${last.round}`, body: i === game.killer ? `${news} ${choose}` : news, url, tag },
    }));
  }
  if (game.phase === 'action' && !game.pending) {
    const actor = game.players[engine.currentActor(game)];
    return [{
      uid: actor.uid,
      payload: { title: `🕯 ${game.name} · Manche ${game.round}`, body: 'C\'est ton tour d\'agir.', url, tag },
    }];
  }
  return [];
}

/* Applique une mutation dans une transaction, fait avancer la partie, puis prévient les joueurs concernés */
async function mutate(ref, fn) {
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
    const game = snap.data();
    if (isLegacy(game)) return { game, changed: false };
    const before = stageOf(game);
    const touched = fn ? fn(game) !== false : false;
    const advanced = advance(game);
    const changed = touched || advanced || before !== stageOf(game);
    if (changed) tx.set(ref, game);
    return { game, changed, notify: before !== stageOf(game) };
  });
  // hors transaction : une transaction peut être rejouée, pas les notifications
  if (result.notify) await push.sendMany(stageMessages(ref.id, result.game));
  return result.game;
}

// ── Vues ─────────────────────────────────────────────────────────────────────

function settingsOf(game) {
  return { turnSeconds: game.turnSeconds };
}

function viewFor(game, id, uid, chat) {
  const me = game.players.findIndex((p) => p.uid === uid);
  const base = {
    id,
    code: game.code,
    name: game.name,
    hostId: game.hostId,
    status: game.status,
    legacy: isLegacy(game),
    ...settingsOf(game),
    minPlayers: MIN_PLAYERS,
    maxPlayers: engine.MAX_PLAYERS,
    me,
    players: game.players.map((p) => ({ uid: p.uid, name: p.name, color: p.color ?? null })),
    chat,
  };
  if (base.legacy || game.status === 'lobby') return base;

  const p = game.players[me];
  const order = game.order ?? [];
  const myTurn = game.status === 'running' && p.alive && engine.currentActor(game) === me;
  const last = game.history[game.history.length - 1];
  const over = game.status === 'over';
  const here = engine.roomOfViewer(game, me); // mort : la salle où erre son fantôme
  const seesAll = !p.alive && p.sight === 'yes';
  const running = game.status === 'running';
  return {
    ...base,
    rooms: engine.ROOMS,
    passages: engine.PASSAGES,
    startPv: engine.START_PV,
    round: game.round,
    phase: game.phase,
    deadline: game.deadline,
    blackout: !!game.blackout,
    turnNumber: game.phase === 'action' ? game.turn + 1 : null,
    turnCount: game.phase === 'action' ? order.length : engine.alive(game).length,
    // état public : celui du dernier bilan (blessures et morts annoncées)
    public: last ? last.players : game.players.map(() => ({ pv: engine.START_PV, alive: true })),
    history: game.history,
    events: game.events.filter((e) => e.to.includes(me) || (seesAll && e.all)).map(({ to, ...e }) => e),
    my: {
      role: p.role,
      pv: p.pv,
      alive: p.alive,
      room: here,
      hidden: p.hidden,
      position: order.includes(me) && game.phase === 'action' ? order.indexOf(me) + 1 : null,
      played: game.phase === 'action' && order.indexOf(me) >= 0 && order.indexOf(me) < game.turn,
      adjacent: engine.ADJACENT[here],
      visible: engine.visibleTo(game, me),
      corpses: engine.corpsesFor(game, me),
      wall: engine.wallFor(game, me),
      canWrite: engine.canWrite(game, me),
      nearby: running ? engine.nearbyFor(game, me) : {},
      // mort : demande de tout voir (null | 'pending' | 'yes' | 'no') ; Tueur : demandes à trancher
      sight: p.alive ? null : p.sight ?? null,
      sightRequests: running && me === game.killer && p.alive ? engine.sightRequests(game) : [],
      chooseOrder: game.status === 'running' && game.phase === 'order' && me === game.killer,
      blackoutAvailable: p.role === 'TUEUR' && !game.blackoutUsed,
      myTurn,
      pending: myTurn ? game.pending ?? null : null, // { moved, attacked } entre deux actions du tour
      steps: myTurn ? engine.stepsFor(game) : [],
      targets: myTurn ? engine.targetsFor(game, me) : [],
    },
    winner: game.winner ?? null,
    // mort autorisé par le Tueur : tout le château, en direct
    omni: seesAll && running ? {
      killer: game.killer,
      players: game.players.map((x) => ({ room: x.room, hidden: x.hidden, alive: x.alive, pv: x.pv })),
    } : null,
    // fin de partie : tout est révélé
    reveal: over ? {
      killer: game.killer,
      players: game.players.map((x) => ({ role: x.role, pv: x.pv, alive: x.alive, room: x.room })),
    } : null,
  };
}

function summaryFor(game, id, uid) {
  const me = game.players.findIndex((p) => p.uid === uid);
  const p = game.players[me];
  const legacy = isLegacy(game);
  return {
    id,
    code: game.code,
    name: game.name,
    status: game.status,
    legacy,
    round: legacy ? null : game.round ?? null,
    phase: legacy ? null : game.phase ?? null,
    deadline: legacy ? null : game.deadline ?? null,
    playerCount: game.players.length,
    maxPlayers: engine.MAX_PLAYERS,
    alive: !legacy && game.status !== 'lobby' ? p?.alive : null,
    pv: !legacy && game.status !== 'lobby' ? p?.pv : null,
    myTurn: !legacy && game.status === 'running'
      && (engine.currentActor(game) === me || (game.phase === 'order' && game.killer === me)),
    isHost: game.hostId === uid,
  };
}

async function loadChat(ref) {
  const snap = await chatOf(ref).orderBy('at', 'desc').limit(CHAT_LIMIT).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
}

async function loadView(ref, uid) {
  const [snap, chat] = await Promise.all([ref.get(), loadChat(ref)]);
  if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
  const game = snap.data();
  if (!game.playerIds.includes(uid)) throw new GameError(403, 'Tu ne fais pas partie de cette partie.');
  return viewFor(game, snap.id, uid, chat);
}

function playerIndex(game, uid) {
  const idx = game.players.findIndex((p) => p.uid === uid);
  if (idx < 0) throw new GameError(403, 'Tu ne fais pas partie de cette partie.');
  return idx;
}

function requireRunning(game) {
  if (game.status !== 'running') throw new GameError(409, 'La partie n\'est pas en cours.');
}

// ── Lobby ────────────────────────────────────────────────────────────────────

async function listMyGames(uid) {
  const snap = await games().where('playerIds', 'array-contains', uid).get();
  const order = { running: 0, lobby: 1, over: 2 };
  return snap.docs
    .map((d) => ({ ...summaryFor(d.data(), d.id, uid), createdAt: d.data().createdAt?.toMillis?.() ?? 0 }))
    .sort((a, b) => a.legacy - b.legacy || (order[a.status] ?? 3) - (order[b.status] ?? 3) || b.createdAt - a.createdAt);
}

async function createGame(user, { name, turnSeconds }) {
  const ref = games().doc();
  const game = {
    kind: GAME_KIND,
    code: randomCode(),
    name: String(name || `Château n°${Math.floor(Math.random() * 900 + 100)}`).trim().slice(0, 32),
    hostId: user.uid,
    status: 'lobby',
    turnSeconds: TURN_SECONDS.includes(Number(turnSeconds)) ? Number(turnSeconds) : 180,
    playerIds: [user.uid],
    players: [{ uid: user.uid, name: user.name }],
    createdAt: new Date(),
  };
  await ref.set(game);
  return viewFor(game, ref.id, user.uid, []);
}

function addToLobby(game, uid, name) {
  if (game.playerIds.includes(uid)) return false;
  if (isLegacy(game)) throw new GameError(409, 'Cette partie appartient à l\'ancien jeu.');
  if (game.status !== 'lobby') throw new GameError(409, 'La partie a déjà commencé.');
  if (game.players.length >= engine.MAX_PLAYERS) throw new GameError(409, 'La partie est complète.');
  game.playerIds.push(uid);
  game.players.push({ uid, name });
  return true;
}

async function joinGame(user, code) {
  const snap = await games().where('code', '==', String(code || '').toUpperCase().trim()).limit(1).get();
  if (snap.empty) throw new GameError(404, 'Aucune partie avec ce code.');
  const ref = snap.docs[0].ref;
  await db.runTransaction(async (tx) => {
    const game = (await tx.get(ref)).data();
    if (addToLobby(game, user.uid, user.name)) tx.update(ref, { playerIds: game.playerIds, players: game.players });
  });
  return loadView(ref, user.uid);
}

/* Joueurs inscrits que l'hôte peut encore ajouter à la partie */
async function listCandidates(user, id) {
  const snap = await games().doc(id).get();
  if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
  const game = snap.data();
  if (game.hostId !== user.uid) throw new GameError(403, 'Seul l\'hôte peut ajouter un joueur.');
  if (game.status !== 'lobby') return [];
  const users = await db.collection('users').select('username').get();
  return users.docs
    .filter((d) => !game.playerIds.includes(d.id))
    .map((d) => d.data().username)
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

async function addPlayer(user, id, username) {
  const ref = games().doc(id);
  const key = String(username || '').trim().toLowerCase();
  if (!key) throw new GameError(400, 'Pseudo manquant.');
  const userSnap = await db.collection('users').doc(key).get();
  if (!userSnap.exists) throw new GameError(404, 'Aucun joueur avec ce pseudo.');
  const added = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
    const game = snap.data();
    if (game.hostId !== user.uid) throw new GameError(403, 'Seul l\'hôte peut ajouter un joueur.');
    if (game.playerIds.includes(userSnap.id)) throw new GameError(409, 'Ce joueur fait déjà partie de la partie.');
    addToLobby(game, userSnap.id, userSnap.data().username);
    tx.update(ref, { playerIds: game.playerIds, players: game.players });
    return game;
  });
  await push.sendMany([{
    uid: userSnap.id,
    payload: { title: `🏰 ${added.name}`, body: `${user.name} t'invite dans son château.`, url: `/game/${id}`, tag: `game-${id}` },
  }]);
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

/* L'hôte supprime définitivement la partie, quel que soit son état (tchat compris) */
async function deleteGame(user, id) {
  const ref = games().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
  const game = snap.data();
  if (game.hostId !== user.uid) throw new GameError(403, 'Seul l\'hôte peut supprimer la partie.');
  const subs = await Promise.all(['chat', 'orders'].map((c) => ref.collection(c).get()));
  const docs = subs.flatMap((s) => s.docs);
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db.batch();
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await ref.delete();
  if (game.status === 'running') {
    await push.sendMany(game.players.filter((p) => p.uid !== user.uid).map((p) => ({
      uid: p.uid,
      payload: { title: `🗑 ${game.name}`, body: 'L\'hôte a supprimé la partie.', url: '/', tag: `game-${id}` },
    })));
  }
}

// ── Partie ───────────────────────────────────────────────────────────────────

async function launchGame(user, id) {
  const ref = games().doc(id);
  const started = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
    const game = snap.data();
    if (isLegacy(game)) throw new GameError(409, 'Cette partie appartient à l\'ancien jeu.');
    if (game.hostId !== user.uid) throw new GameError(403, 'Seul l\'hôte peut lancer la partie.');
    if (game.status !== 'lobby') throw new GameError(409, 'La partie a déjà commencé.');
    if (game.players.length < MIN_PLAYERS) throw new GameError(409, `Il faut au moins ${MIN_PLAYERS} joueurs.`);
    engine.startGame(game);
    game.startedAt = Date.now();
    resetDeadline(game);
    tx.set(ref, game);
    return game;
  });
  await push.sendMany(started.players.map((p, i) => ({
    uid: p.uid,
    payload: {
      title: `🏰 ${started.name} a commencé`,
      body: i === started.killer ? 'Tu es le Tueur. Choisis ta position pour la première manche.' : 'Tu es un Survivant. Méfie-toi de tout le monde.',
      url: `/game/${id}`, tag: `game-${id}`,
    },
  })));
  return loadView(ref, user.uid);
}

async function getGame(user, id) {
  const ref = games().doc(id);
  await mutate(ref);
  return loadView(ref, user.uid);
}

/* Phase 1 : le Tueur choisit sa position et, éventuellement, le Blackout */
async function chooseOrder(user, id, { position, blackout } = {}) {
  const ref = games().doc(id);
  await mutate(ref, (game) => {
    const idx = playerIndex(game, user.uid);
    requireRunning(game);
    if (idx !== game.killer) throw new GameError(403, 'Seul le Tueur choisit sa position.');
    rule(() => engine.chooseOrder(game, position, !!blackout));
    resetDeadline(game);
  });
  return loadView(ref, user.uid);
}

/* Phase 2 : action du joueur dont c'est le tour */
async function act(user, id, body = {}) {
  const ref = games().doc(id);
  await mutate(ref, (game) => {
    const idx = playerIndex(game, user.uid);
    requireRunning(game);
    if (game.deadline <= Date.now()) throw new GameError(409, 'Trop tard : le délai est écoulé.');
    const { step, dest, target } = body;
    const roundOver = rule(() => engine.act(game, idx, { step, dest, target }));
    // nouveau tour (ou nouvelle manche) : nouveau délai ; tour entamé : le délai court toujours
    if (roundOver || !game.pending) resetDeadline(game);
  });
  return loadView(ref, user.uid);
}

/* Message anonyme sur le mur de sa salle, quand on est caché */
async function writeWall(user, id, text) {
  const ref = games().doc(id);
  await mutate(ref, (game) => {
    const idx = playerIndex(game, user.uid);
    requireRunning(game);
    rule(() => engine.writeWall(game, idx, text));
  });
  return loadView(ref, user.uid);
}

/* Le fantôme d'un mort passe dans une salle voisine, à tout moment */
async function ghostMove(user, id, dest) {
  const ref = games().doc(id);
  await mutate(ref, (game) => {
    const idx = playerIndex(game, user.uid);
    rule(() => engine.ghostMove(game, idx, dest));
  });
  return loadView(ref, user.uid);
}

/* Un mort demande à tout voir : le Tueur est prévenu */
async function requestSight(user, id) {
  const ref = games().doc(id);
  const game = await mutate(ref, (g) => {
    const idx = playerIndex(g, user.uid);
    rule(() => engine.requestSight(g, idx));
  });
  await push.sendMany([{
    uid: game.players[game.killer].uid,
    payload: { title: `👁 ${game.name}`, body: `${user.name}, mort, demande à tout voir. À toi de décider.`, url: `/game/${id}`, tag: `sight-${id}` },
  }]);
  return loadView(ref, user.uid);
}

/* Le Tueur accepte ou refuse la demande d'un mort */
async function answerSight(user, id, target, accept) {
  const ref = games().doc(id);
  const idx = Number(target);
  const game = await mutate(ref, (g) => {
    const by = playerIndex(g, user.uid);
    rule(() => engine.answerSight(g, by, idx, !!accept));
  });
  await push.sendMany([{
    uid: game.players[idx].uid,
    payload: {
      title: `👁 ${game.name}`,
      body: accept ? 'Ta demande est acceptée : tu vois tout le château.' : 'Ta demande est refusée : ton fantôme ne peut qu\'errer.',
      url: `/game/${id}`, tag: `sight-${id}`,
    },
  }]);
  return loadView(ref, user.uid);
}

/* Tchat : seulement dans le salon d'attente (le débat se tient hors du jeu) */
async function postMessage(user, id, text) {
  const ref = games().doc(id);
  const msg = String(text || '').trim().slice(0, CHAT_MAX_LEN);
  if (!msg) throw new GameError(400, 'Message vide.');
  const snap = await ref.get();
  if (!snap.exists) throw new GameError(404, 'Partie introuvable.');
  const game = snap.data();
  const idx = playerIndex(game, user.uid);
  if (game.status !== 'lobby') throw new GameError(409, 'Le tchat n\'est ouvert que dans le salon d\'attente.');
  await chatOf(ref).add({ idx, name: user.name, text: msg, round: game.round ?? 0, at: Date.now() });
  return loadView(ref, user.uid);
}

/* Appelé par Cloud Scheduler : fait avancer les parties arrivées à échéance */
async function tick() {
  const snap = await games().where('status', '==', 'running').get();
  const now = Date.now();
  let advanced = 0;
  for (const doc of snap.docs) {
    const game = doc.data();
    if (isLegacy(game) || !(game.deadline <= now)) continue;
    await mutate(doc.ref);
    advanced++;
  }
  return { checked: snap.size, advanced };
}

module.exports = {
  GameError, TURN_SECONDS, listMyGames, createGame, joinGame, listCandidates, addPlayer, leaveGame, deleteGame,
  launchGame, getGame, chooseOrder, act, writeWall, ghostMove, requestSight, answerSight, postMessage, tick,
};
