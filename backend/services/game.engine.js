/* Le Château des Ténèbres — règles du jeu (fonctions pures, l'état est muté en place)

   État d'une partie lancée (doc Firestore games/{id}) :
     players[i] = { uid, name, color, role, pv, room, hidden, alive, diedRound, ghostRoom, sight }
       (mort : ghostRoom = où erre son fantôme, sight = null | 'pending' | 'yes' | 'no' : demande de tout voir)
     round, phase ('order' | 'action'), order (indices des joueurs), turn (index dans order),
     pending (attaque en attente après un déplacement), blackout, blackoutUsed, killer (index),
     events (perceptions privées : { id, round, to: [indices], text, noise? } ;
             all: true = récit omniscient, réservé aux morts autorisés par le Tueur), history (bilans publics),
     winner ('killer' | 'survivors')
   Pas de débat dans le jeu (il se tient ailleurs) : une manche finie, la suivante commence.

   Dans les textes, {p:N} désigne le joueur N et {r:id} une salle (mis en forme par le client). */

const RULES_VERSION = 1;
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 10;
const START_PV = 3;

const COLORS = ['#e8c170', '#c0392b', '#5dade2', '#58d68d', '#af7ac5', '#f5b041', '#ec7063', '#48c9b0', '#d7dbdd', '#f1948a'];

/* Plan du château : x / y = position sur la carte (grille 3 × 4) */
const ROOMS = [
  { id: 'tour', name: 'Tour de guet', the: 'la Tour de guet', icon: 'mdi-chess-rook', x: 0, y: 0 },
  { id: 'remparts', name: 'Remparts', the: 'les Remparts', icon: 'mdi-wall', x: 1, y: 0 },
  { id: 'chambre', name: 'Chambre du seigneur', the: 'la Chambre du seigneur', icon: 'mdi-bed-king-outline', x: 2, y: 0 },
  { id: 'bibliotheque', name: 'Bibliothèque', the: 'la Bibliothèque', icon: 'mdi-bookshelf', x: 0, y: 1 },
  { id: 'grande_salle', name: 'Grande Salle', the: 'la Grande Salle', icon: 'mdi-castle', x: 1, y: 1 },
  { id: 'armurerie', name: 'Salle d\'armes', the: 'la Salle d\'armes', icon: 'mdi-sword-cross', x: 2, y: 1 },
  { id: 'chapelle', name: 'Chapelle', the: 'la Chapelle', icon: 'mdi-church-outline', x: 0, y: 2 },
  { id: 'cuisine', name: 'Cuisine', the: 'la Cuisine', icon: 'mdi-pot-steam-outline', x: 1, y: 2 },
  { id: 'ecuries', name: 'Écuries', the: 'les Écuries', icon: 'mdi-horse-variant', x: 2, y: 2 },
  { id: 'crypte', name: 'Crypte', the: 'la Crypte', icon: 'mdi-coffin', x: 0, y: 3 },
  { id: 'cachots', name: 'Cachots', the: 'les Cachots', icon: 'mdi-gate', x: 1, y: 3 },
];

const PASSAGES = [
  ['tour', 'remparts'], ['remparts', 'chambre'], ['tour', 'bibliotheque'], ['remparts', 'grande_salle'],
  ['chambre', 'armurerie'], ['bibliotheque', 'grande_salle'], ['grande_salle', 'armurerie'],
  ['bibliotheque', 'chapelle'], ['grande_salle', 'cuisine'], ['armurerie', 'ecuries'], ['cuisine', 'ecuries'],
  ['chapelle', 'crypte'], ['cuisine', 'cachots'], ['crypte', 'cachots'],
];

const ADJACENT = Object.fromEntries(ROOMS.map((r) => [r.id, PASSAGES
  .filter((p) => p.includes(r.id))
  .map(([a, b]) => (a === r.id ? b : a))]));

// Cibles spéciales d'une attaque
const SELF = 'self';
const BLIND = 'blind'; // dans le noir : un occupant au hasard
const HOLD = 'hold';   // retenir son coup

const isAdjacent = (a, b) => ADJACENT[a]?.includes(b);
const randInt = (n) => Math.floor(Math.random() * n);

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const alive = (game) => game.players.map((p, i) => i).filter((i) => game.players[i].alive);
const occupants = (game, room) => alive(game).filter((i) => game.players[i].room === room);

/* Salle d'où perçoit un joueur : la sienne, ou celle où erre son fantôme */
const roomOfViewer = (game, viewer) => {
  const p = game.players[viewer];
  return p.alive ? p.room : p.ghostRoom ?? p.room;
};

/* Joueurs qu'un observateur voit dans sa salle (ni cachés, ni dans le noir) */
function visibleTo(game, viewer) {
  if (game.blackout) return [];
  const room = roomOfViewer(game, viewer);
  return occupants(game, room).filter((i) => i !== viewer && !game.players[i].hidden);
}

/* Nombre de joueurs visibles dans chaque salle adjacente (sans les noms ; les cachés n'y figurent pas) */
function nearbyFor(game, viewer) {
  if (game.blackout) return {};
  return Object.fromEntries(ADJACENT[roomOfViewer(game, viewer)]
    .map((r) => [r, occupants(game, r).filter((i) => !game.players[i].hidden).length])
    .filter(([, n]) => n > 0));
}

/* Cadavres visibles dans la salle de l'observateur */
function corpsesFor(game, viewer) {
  if (game.blackout) return [];
  const room = roomOfViewer(game, viewer);
  return game.players.map((p, i) => i).filter((i) => !game.players[i].alive && game.players[i].room === room);
}

const currentActor = (game) => (game.phase === 'action' ? game.order[game.turn] : null);

// ── Journal privé ────────────────────────────────────────────────────────────

function note(game, to, text, extra = {}) {
  const list = [...new Set(to)].filter((i) => i !== undefined && i !== null);
  if (!list.length) return;
  game.eventSeq = (game.eventSeq ?? 0) + 1;
  game.events.push({ id: game.eventSeq, round: game.round, to: list, text, ...extra });
}

/* Récit omniscient : lu seulement par les morts que le Tueur autorise à tout voir */
function tell(game, text) {
  game.eventSeq = (game.eventSeq ?? 0) + 1;
  game.events.push({ id: game.eventSeq, round: game.round, to: [], all: true, text });
}

/* Bruit entendu par les occupants des salles voisines (hors salles concernées) */
function noise(game, rooms, text, exclude = []) {
  const listeners = alive(game).filter((i) => {
    const r = game.players[i].room;
    return !rooms.includes(r) && !exclude.includes(i) && rooms.some((x) => isAdjacent(r, x));
  });
  // regroupé par salle d'écoute : chacun n'entend que les salles qui touchent la sienne
  const byRoom = new Map();
  listeners.forEach((i) => {
    const r = game.players[i].room;
    if (!byRoom.has(r)) byRoom.set(r, []);
    byRoom.get(r).push(i);
  });
  byRoom.forEach((who, r) => {
    const heard = rooms.filter((x) => isAdjacent(r, x));
    const where = heard.length > 1 ? `entre {r:${heard[0]}} et {r:${heard[1]}}` : `vers {r:${heard[0]}}`;
    note(game, who, text.replace('%', where), { noise: heard });
  });
}

// ── Mise en place ────────────────────────────────────────────────────────────

function startGame(game) {
  const n = game.players.length;
  const killer = randInt(n);
  game.players.forEach((p, i) => {
    Object.assign(p, {
      color: COLORS[i % COLORS.length],
      role: i === killer ? 'TUEUR' : 'SURVIVANT',
      pv: START_PV,
      room: ROOMS[randInt(ROOMS.length)].id,
      hidden: false,
      alive: true,
      diedRound: null,
    });
  });
  Object.assign(game, {
    version: RULES_VERSION,
    status: 'running',
    killer,
    round: 1,
    phase: 'order',
    order: [],
    turn: 0,
    pending: null,
    blackout: false,
    blackoutUsed: false,
    events: [],
    eventSeq: 0,
    history: [],
    walls: {},
    wallRounds: {},
    winner: null,
  });
  game.players.forEach((p, i) => {
    note(game, [i], i === killer
      ? 'Tu es le Tueur. Élimine tous les survivants sans te faire démasquer.'
      : 'Tu es un Survivant. Démasque le Tueur et abats-le avant qu\'il ne vous élimine.');
    note(game, [i], `Tu te réveilles dans {r:${p.room}}.`);
    tell(game, `{p:${i}} se réveille dans {r:${p.room}}${i === killer ? ' : c\'est le Tueur.' : '.'}`);
  });
}

// ── Phase 1 : ordre de passage ───────────────────────────────────────────────

/* Le Tueur choisit sa position (1 = premier) et, une fois par partie, le Blackout */
function chooseOrder(game, position, blackout) {
  if (game.phase !== 'order') throw new Error('Ce n\'est pas le moment de choisir l\'ordre.');
  const living = alive(game);
  const pos = Number(position);
  if (!Number.isInteger(pos) || pos < 1 || pos > living.length) throw new Error('Position invalide.');
  if (blackout && game.blackoutUsed) throw new Error('Le Blackout a déjà été utilisé.');

  const others = shuffle(living.filter((i) => i !== game.killer));
  others.splice(pos - 1, 0, game.killer);
  Object.assign(game, { order: others, turn: 0, pending: null, phase: 'action', blackout: !!blackout });
  if (blackout) game.blackoutUsed = true;

  others.forEach((i, k) => note(game, [i], `Manche ${game.round} : tu joues en position ${k + 1} sur ${others.length}.`));
  tell(game, `Le Tueur se place en position ${pos}. Ordre de passage : ${others.map((i) => `{p:${i}}`).join(', ')}.`);
  if (blackout) tell(game, 'Le Tueur déclenche le Blackout.');
  if (blackout) {
    note(game, living, 'Le courant est coupé ! Le château est plongé dans le noir pour toute la manche.', { blackout: true });
  }
}

/* Délai écoulé : position tirée au hasard, pas de Blackout */
function timeoutOrder(game) {
  note(game, [game.killer], 'Tu as tardé : ta position a été tirée au hasard.');
  chooseOrder(game, randInt(alive(game).length) + 1, false);
}

// ── Phase 2 : actions ────────────────────────────────────────────────────────

/* Passe dans une salle voisine : se déplacer rend visible */
function move(game, actor, dest) {
  const p = game.players[actor];
  if (!isAdjacent(p.room, dest)) throw new Error('Cette salle n\'est pas adjacente.');
  const from = p.room;
  const wasSeen = !p.hidden && !game.blackout;

  // départ : les occupants le voient partir s'il était visible
  const stay = occupants(game, from).filter((i) => i !== actor);
  if (wasSeen) note(game, stay, `{p:${actor}} quitte la salle vers {r:${dest}}.`);
  else if (game.blackout) note(game, stay, 'Des pas s\'éloignent tout près de toi, dans le noir.');

  const there = occupants(game, dest);
  p.room = dest;
  p.hidden = false;
  if (game.blackout) note(game, there, 'Quelqu\'un entre dans la salle, dans le noir.');
  else note(game, there, `{p:${actor}} entre dans la salle, depuis {r:${from}}.`);

  noise(game, [from, dest], 'Des bruits de pas %.', [actor]);
  note(game, [actor], `Tu te rends dans {r:${dest}}.`);
  tell(game, `{p:${actor}} passe de {r:${from}} à {r:${dest}}.`);
}

/* Cibles possibles d'une attaque pour le joueur dans sa salle actuelle */
function targetsFor(game, actor) {
  if (game.blackout) return [BLIND, SELF, HOLD];
  return [...visibleTo(game, actor), SELF, HOLD];
}

function parseTarget(game, actor, target) {
  const t = typeof target === 'number' || /^\d+$/.test(String(target)) ? Number(target) : target;
  if (!targetsFor(game, actor).includes(t)) throw new Error('Cible invalide (elle doit être visible dans ta salle).');
  return t;
}

/* t : cible déjà validée par parseTarget */
function attack(game, actor, t) {
  const p = game.players[actor];
  p.hidden = false; // frapper révèle
  const room = p.room;
  if (t === HOLD) {
    note(game, [actor], 'Tu retiens ton coup.');
    tell(game, `{p:${actor}} lève son arme dans {r:${room}}… et retient son coup.`);
    return;
  }

  let victim = t === SELF ? actor : t;
  if (t === BLIND) {
    const pool = occupants(game, room).filter((i) => i !== actor);
    victim = pool.length ? pool[randInt(pool.length)] : null;
  }

  const witnesses = occupants(game, room).filter((i) => i !== actor && i !== victim);
  noise(game, [room], 'Un cri retentit %.');

  if (victim === null) {
    note(game, [actor], 'Tu frappes dans le noir… ton coup ne rencontre que le vide.');
    tell(game, `{p:${actor}} frappe dans le noir de {r:${room}}, dans le vide.`);
    return;
  }

  const v = game.players[victim];
  v.pv -= 1;
  const dies = v.pv <= 0;

  // la victime sait seulement qu'elle a été touchée et les présents entendent un cri…
  // …sauf ceux qui étaient cachés : à l'abri des regards, eux voient la scène (pas dans le noir)
  const hiddenWitnesses = game.blackout ? [] : witnesses.filter((i) => game.players[i].hidden);
  const plainWitnesses = witnesses.filter((i) => !hiddenWitnesses.includes(i));
  tell(game, victim === actor
    ? `{p:${actor}} se blesse volontairement dans {r:${room}} (${Math.max(0, v.pv)} PV).`
    : `{p:${actor}} frappe {p:${victim}} dans {r:${room}}${game.blackout ? ', dans le noir' : ''} (${Math.max(0, v.pv)} PV).`);
  if (victim === actor) note(game, [actor], `Tu t'infliges une blessure (${Math.max(0, v.pv)} PV).`);
  else {
    note(game, [actor], game.blackout
      ? 'Tu frappes dans le noir… ton coup porte : quelqu\'un gémit.'
      : `Tu frappes {p:${victim}}.`);
    note(game, [victim], `Tu as été attaqué ! (${Math.max(0, v.pv)} PV)`);
  }
  note(game, plainWitnesses, 'Un cri retentit dans ta salle.');
  note(game, hiddenWitnesses, victim === actor
    ? `Caché, tu vois {p:${actor}} se blesser lui-même !`
    : `Caché, tu vois {p:${actor}} frapper {p:${victim}} !`);

  if (dies) {
    v.pv = 0;
    v.alive = false;
    v.diedRound = game.round;
    v.ghostRoom = v.room;
    v.sight = null;
    tell(game, `{p:${victim}} meurt dans {r:${room}}.`);
    note(game, [victim], 'Tu t\'effondres. Tu es mort.');
    if (game.blackout) note(game, witnesses.concat(victim === actor ? [] : [actor]), 'Un corps s\'effondre dans le noir.');
    else note(game, witnesses.concat(victim === actor ? [] : [actor]), `{p:${victim}} s'effondre, mort.`);
  }
  checkWinner(game);
}

function checkWinner(game) {
  if (game.winner) return;
  const killer = game.players[game.killer];
  if (!killer.alive) game.winner = 'survivors';
  else if (alive(game).length === 1) game.winner = 'killer';
  if (game.winner) endGame(game);
}

function endGame(game) {
  game.status = 'over';
  game.phase = null;
  game.pending = null;
  game.history.push(bilan(game, true));
}

/* Un tour = une suite d'actions simples :
   se cacher (seul) · se déplacer → frapper ou rester · frapper → se déplacer ou rester.
   game.pending = { moved, attacked } entre deux actions du même joueur. */
const STEPS = ['hide', 'move', 'attack', 'end'];

function stepsFor(game) {
  const pd = game.pending;
  if (!pd) return ['hide', 'move', 'attack'];
  if (pd.attacked) return ['move', 'end'];
  return ['attack', 'end'];
}

function finishTurn(game) {
  game.pending = null;
  return nextTurn(game);
}

/* Valide et applique une action du joueur dont c'est le tour : { step, dest?, target? }.
   Renvoie true si la manche est terminée. */
function act(game, actor, { step, dest, target } = {}) {
  if (game.status !== 'running' || game.phase !== 'action') throw new Error('Ce n\'est pas la phase d\'actions.');
  if (currentActor(game) !== actor) throw new Error('Ce n\'est pas ton tour.');
  if (!STEPS.includes(step)) throw new Error('Action inconnue.');
  if (!stepsFor(game).includes(step)) {
    if (step === 'hide') throw new Error('On ne peut se cacher qu\'en début de tour, sans rien faire d\'autre.');
    if (step === 'move') throw new Error('Tu t\'es déjà déplacé ce tour-ci.');
    if (step === 'attack') throw new Error('Tu as déjà frappé ce tour-ci.');
    throw new Error('Tu n\'as encore rien fait ce tour-ci.');
  }
  const p = game.players[actor];
  const pd = game.pending ?? {};

  if (step === 'hide') {
    p.hidden = true;
    note(game, [actor], `Tu te caches dans {r:${p.room}}.`);
    tell(game, `{p:${actor}} se cache dans {r:${p.room}}.`);
    return finishTurn(game);
  }

  if (step === 'end') {
    note(game, [actor], `Tu restes dans {r:${p.room}}.`);
    tell(game, `{p:${actor}} reste dans {r:${p.room}}.`);
    return finishTurn(game);
  }

  if (step === 'move') {
    move(game, actor, dest);
    if (pd.attacked) return finishTurn(game);
    game.pending = { moved: true, attacked: false };
    return false;
  }

  attack(game, actor, parseTarget(game, actor, target));
  if (pd.moved || game.status !== 'running' || !p.alive) return finishTurn(game);
  game.pending = { moved: false, attacked: true };
  return false;
}

/* Délai écoulé pendant un tour : on reste caché, ou là où l'on en est */
function timeoutTurn(game) {
  const actor = currentActor(game);
  if (game.pending) note(game, [actor], 'Tu as hésité trop longtemps : tu en restes là.');
  else {
    game.players[actor].hidden = true;
    note(game, [actor], 'Tu as hésité trop longtemps : tu restes caché sur place.');
    tell(game, `{p:${actor}} tarde et reste caché dans {r:${game.players[actor].room}}.`);
  }
  return finishTurn(game);
}

/* Passe au prochain joueur vivant ; termine la manche quand tous ont joué. Renvoie true si la manche est finie. */
function nextTurn(game) {
  if (game.status !== 'running') return true;
  game.turn++;
  while (game.turn < game.order.length && !game.players[game.order[game.turn]].alive) game.turn++;
  if (game.turn < game.order.length) return false;
  endRound(game);
  return true;
}

// ── Fin de manche : bilan public, puis manche suivante ───────────────────────

function bilan(game, final = false) {
  return {
    round: game.round,
    blackout: !!game.blackout,
    players: game.players.map((p) => ({ pv: p.pv, alive: p.alive })),
    deaths: game.players
      .map((p, i) => ({ id: i, room: p.room, round: p.diedRound }))
      .filter((d) => d.round === game.round)
      .map(({ id, room }) => ({ id, room })),
    final,
  };
}

function endRound(game) {
  game.history.push(bilan(game));
  nextRound(game);
}

// ── Messages sur les murs ────────────────────────────────────────────────────

const WALL_MAX_LEN = 120;

/* Un joueur caché peut écrire, anonymement, un message par manche sur le mur de sa salle */
function canWrite(game, idx) {
  const p = game.players[idx];
  return game.status === 'running' && p.alive && p.hidden && game.wallRounds?.[idx] !== game.round;
}

function writeWall(game, idx, text) {
  const msg = String(text || '').trim().slice(0, WALL_MAX_LEN);
  if (!msg) throw new Error('Message vide.');
  if (!game.players[idx].hidden) throw new Error('Il faut être caché pour écrire sur le mur sans être vu.');
  if (!canWrite(game, idx)) throw new Error('Tu as déjà écrit sur un mur cette manche.');
  const room = game.players[idx].room;
  game.walls = game.walls ?? {};
  game.wallRounds = game.wallRounds ?? {};
  game.walls[room] = [...(game.walls[room] ?? []), { round: game.round, text: msg, author: idx }];
  game.wallRounds[idx] = game.round;
  note(game, [idx], `Tu écris sur le mur de {r:${room}} : « ${msg} »`);
  tell(game, `{p:${idx}} écrit sur le mur de {r:${room}} : « ${msg} »`);
}

/* Messages lisibles par l'observateur sur le mur de sa salle (anonymes ; illisibles dans le noir) */
function wallFor(game, viewer) {
  if (game.blackout) return [];
  return (game.walls?.[roomOfViewer(game, viewer)] ?? []).map(({ round, text }) => ({ round, text }));
}

// ── Les morts ────────────────────────────────────────────────────────────────

/* Le fantôme d'un mort erre librement de salle en salle, sans être perçu */
function ghostMove(game, idx, dest) {
  const p = game.players[idx];
  if (game.status !== 'running') throw new Error('La partie n\'est pas en cours.');
  if (p.alive) throw new Error('Seuls les morts errent en fantôme.');
  if (!isAdjacent(roomOfViewer(game, idx), dest)) throw new Error('Cette salle n\'est pas adjacente.');
  p.ghostRoom = dest;
}

/* Un mort demande à tout voir (une seule fois) ; le Tueur accepte ou refuse */
function requestSight(game, idx) {
  const p = game.players[idx];
  if (game.status !== 'running') throw new Error('La partie n\'est pas en cours.');
  if (p.alive) throw new Error('Seuls les morts peuvent demander à tout voir.');
  if (p.sight) throw new Error(p.sight === 'pending' ? 'Ta demande attend déjà la réponse du Tueur.' : 'Tu as déjà fait ta demande.');
  p.sight = 'pending';
}

const sightRequests = (game) => game.players.map((p, i) => i).filter((i) => game.players[i].sight === 'pending');

function answerSight(game, by, idx, accept) {
  if (game.status !== 'running') throw new Error('La partie n\'est pas en cours.');
  if (by !== game.killer) throw new Error('Seul le Tueur répond à cette demande.');
  if (game.players[idx]?.sight !== 'pending') throw new Error('Aucune demande en attente pour ce joueur.');
  game.players[idx].sight = accept ? 'yes' : 'no';
  note(game, [idx], accept
    ? 'Le Tueur a accepté : tu vois désormais tout ce qui se passe au château.'
    : 'Le Tueur a refusé : ton fantôme ne pourra qu\'errer dans le château.');
  note(game, [by], `Tu ${accept ? 'acceptes' : 'refuses'} que {p:${idx}} voie tout.`);
}

function nextRound(game) {
  game.round++;
  Object.assign(game, { phase: 'order', order: [], turn: 0, pending: null, blackout: false });
}

module.exports = {
  RULES_VERSION, MIN_PLAYERS, MAX_PLAYERS, START_PV, COLORS, ROOMS, PASSAGES, ADJACENT, SELF, BLIND, HOLD,
  alive, occupants, roomOfViewer, visibleTo, nearbyFor, corpsesFor, targetsFor, currentActor,
  startGame, chooseOrder, timeoutOrder, stepsFor, act, timeoutTurn, canWrite, writeWall, wallFor, ghostMove, requestSight, sightRequests, answerSight,
};
