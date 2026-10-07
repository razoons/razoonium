// engine.js — Règles de Razoonium (fonctions pures, sans accès base de données)
// Les lignes de journal utilisent des jetons {p:N} (joueur d'index N) rendus côté client.

const MAX_DAYS = 15;
const START_BATTERIES = 10;
const SHIELD_DURATION = 3;
const MAX_PLAYERS = 8;

const COLORS = ['#00f0ff', '#ff2bd6', '#9dff4a', '#ffb020', '#8a7dff', '#ff5470', '#2bffc6', '#f2f6ff'];

const WEATHER = {
  calm:      { label: 'Calme',     desc: 'Aucun effet' },
  storm:     { label: 'Tempête',   desc: '−1 batterie pour tous' },
  abundance: { label: 'Abondance', desc: 'Génération ×2, Pacte ×2,5' },
};

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const emptyOrders = () => ({ gen: 0, def: 0, atk: 0, atkTarget: null, pact: null, xfer: 0, xferTarget: null, bid: 0 });
const spent = (o) => o.gen + o.def + o.atk + o.xfer + o.bid;
const shieldTotal = (p) => p.shields.reduce((s, l) => s + l.amount, 0);

function rollLots(aliveCount) {
  const n = Math.floor(aliveCount / 2);
  return Array.from({ length: n }, () => rand(2, 8)).sort((a, b) => b - a);
}

/* Répartition au prorata (plus forts restes) */
function prorata(total, weights) {
  const W = weights.reduce((a, b) => a + b, 0);
  if (!W || !total) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / W);
  const out = raw.map(Math.floor);
  const rest = total - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - out[i], i]).sort((a, b) => b[0] - a[0]).slice(0, rest).forEach(([, i]) => out[i]++);
  return out;
}

/* Détruit les boucliers les plus anciens en priorité */
function destroyShields(p, dmg) {
  for (const l of p.shields) {
    if (dmg <= 0) break;
    const d = Math.min(l.amount, dmg);
    l.amount -= d;
    dmg -= d;
  }
  p.shields = p.shields.filter((l) => l.amount > 0);
}

/* Valide et normalise des ordres reçus d'un client. Lève une Error si invalides. */
function sanitizeOrders(raw, game, idx) {
  const me = game.players[idx];
  const o = emptyOrders();
  for (const k of ['gen', 'def', 'atk', 'xfer', 'bid']) {
    const v = Number(raw?.[k] ?? 0);
    if (!Number.isInteger(v) || v < 0) throw new Error(`Valeur invalide pour "${k}".`);
    o[k] = v;
  }
  const target = (key) => {
    const v = raw?.[key];
    if (v === null || v === undefined || v === '') return null;
    const t = Number(v);
    if (!Number.isInteger(t) || t === idx || !game.players[t]?.alive) throw new Error('Cible invalide.');
    return t;
  };
  o.atkTarget = target('atkTarget');
  o.xferTarget = target('xferTarget');
  o.pact = target('pact');
  if (o.atk > 0 && o.atkTarget === null) throw new Error('Attaque sans cible.');
  if (o.xfer > 0 && o.xferTarget === null) throw new Error('Transfert sans cible.');
  if (o.pact !== null && (o.atk > 0 || o.def > 0)) throw new Error('Pacte : attaque et défense interdites ce tour.');
  if (spent(o) > me.batteries) throw new Error('Pas assez de batteries.');
  return o;
}

function snapshot(game) {
  game.history.push({
    day: game.day,
    players: game.players.map((p) => ({ b: p.batteries, alive: p.alive, s: shieldTotal(p) })),
  });
}

/* Initialise l'état de jeu à partir des membres du lobby */
function startGame(game) {
  game.players = game.players.map((p, i) => ({
    ...p,
    color: COLORS[i],
    batteries: START_BATTERIES,
    shields: [],
    alive: true,
    elimDay: null,
  }));
  game.day = 1;
  game.lots = rollLots(game.players.length);
  game.lastWeather = null;
  game.log = [];
  game.history = [];
  game.status = 'running';
  snapshot(game);
  return game;
}

/*
 * Résout un tour. `ordersByIdx` : Map index joueur → ordres (déjà validés).
 * Modifie `game` en place et le renvoie.
 */
function resolveTurn(game, ordersByIdx) {
  const day = game.day;
  const lines = [];
  const C = new Map();

  game.players.forEach((p, id) => {
    if (!p.alive) return;
    const o = { ...emptyOrders(), ...(ordersByIdx.get(id) || {}) };
    if (o.atk > 0 && (o.atkTarget == null || !game.players[o.atkTarget]?.alive)) o.atk = 0;
    if (o.xfer > 0 && (o.xferTarget == null || !game.players[o.xferTarget]?.alive)) o.xfer = 0;
    if (spent(o) > p.batteries) Object.assign(o, emptyOrders());
    C.set(id, { id, p, o, before: p.batteries, reserve: p.batteries - spent(o), gains: 0, pact: false });
  });

  // 1. Coût de vie
  C.forEach((c) => (c.reserve -= 1));
  lines.push('Coût de vie : −1 🔋 par dôme.');

  // 2. Météo
  const die = rand(1, 6);
  const weather = die <= 2 ? 'calm' : die <= 4 ? 'storm' : 'abundance';
  if (weather === 'storm') C.forEach((c) => (c.reserve -= 1));
  const genMult = weather === 'abundance' ? 2 : 1.5;
  const pactMult = weather === 'abundance' ? 2.5 : 2;
  lines.push(`Météo (dé ${die}) : {w:${weather}} — ${WEATHER[weather].desc}.`);

  // 3. Enchères
  const bidders = [...C.values()].filter((c) => c.o.bid > 0)
    .sort((a, b) => b.o.bid - a.o.bid || a.p.batteries - b.p.batteries);
  if (!bidders.length && game.lots.length) lines.push('Enchères : aucune mise, les lots restent en réserve.');
  bidders.forEach((c, i) => {
    if (i < game.lots.length) {
      c.reserve += game.lots[i];
      lines.push(`Enchère : {p:${c.id}} remporte le lot n°${i + 1} (+${game.lots[i]}) pour une mise de ${c.o.bid}.`);
    } else {
      c.reserve += c.o.bid;
      lines.push(`Enchère : {p:${c.id}} perd (mise de ${c.o.bid} remboursée).`);
    }
  });

  // 4. Pactes : proposer un pacte interdit l'attaque et la défense ce tour (réciproque ou non) ;
  //    seul un pacte réciproque booste la génération. Les boucliers existants restent actifs.
  C.forEach((c) => {
    const t = c.o.pact;
    if (t != null && C.has(t) && C.get(t).o.pact === c.id) c.pact = true;
  });
  C.forEach((c) => {
    if (c.o.pact == null) return;
    const refund = c.o.atk + c.o.def; // normalement 0 : déjà refusé à la saisie
    c.reserve += refund;
    c.o.atk = 0;
    c.o.def = 0;
    if (c.pact && c.id < c.o.pact) lines.push(`Pacte scellé entre {p:${c.id}} et {p:${c.o.pact}} — génération boostée.`);
    if (!c.pact) lines.push(`{p:${c.id}} a tendu la main à {p:${c.o.pact}}… sans retour.`);
    if (refund) lines.push(`{p:${c.id}} : ${refund} batterie(s) d'attaque/défense annulée(s) par le pacte.`);
  });

  // Nouveaux boucliers (actifs dès ce tour)
  C.forEach((c) => { if (c.o.def > 0) c.p.shields.push({ amount: c.o.def, day }); });

  // 5. Attaques
  const byTarget = new Map();
  C.forEach((c) => {
    if (c.o.atk > 0) {
      if (!byTarget.has(c.o.atkTarget)) byTarget.set(c.o.atkTarget, []);
      byTarget.get(c.o.atkTarget).push(c);
    }
  });
  byTarget.forEach((atks, tid) => {
    const tc = C.get(tid);
    const A = atks.reduce((s, a) => s + a.o.atk, 0);
    const absorbed = Math.min(A, shieldTotal(tc.p));
    destroyShields(tc.p, absorbed);
    const net = A - absorbed;
    const netShares = prorata(net, atks.map((a) => a.o.atk));
    const steal = Math.min(net, Math.max(0, tc.reserve));
    tc.reserve -= steal;
    const stealShares = prorata(steal, netShares);
    atks.forEach((a, i) => { a.gains += netShares[i] + stealShares[i]; });
    const who = atks.map((a) => `{p:${a.id}} (${a.o.atk})`).join(' + ');
    lines.push(`Attaque sur {p:${tid}} par ${who} : ${absorbed} absorbé(s) par le bouclier, ${net} net, ${steal} volée(s).`);
  });

  // 6. Expiration des boucliers (actifs 3 tours : jour J, J+1, J+2)
  C.forEach((c) => {
    c.p.shields = c.p.shields.filter((l) => l.amount > 0 && day - l.day < SHIELD_DURATION - 1);
  });

  // 7. Récoltes & réceptions
  C.forEach((c) => {
    if (c.o.gen > 0) {
      const mult = c.pact ? pactMult : genMult;
      const y = Math.floor(c.o.gen * mult);
      c.gains += y;
      lines.push(`{p:${c.id}} génère ${y} 🔋 (${c.o.gen} × ${String(mult).replace('.', ',')}).`);
    }
    if (c.o.xfer > 0) {
      C.get(c.o.xferTarget).gains += c.o.xfer;
      lines.push(`{p:${c.id}} transfère ${c.o.xfer} 🔋 à {p:${c.o.xferTarget}}.`);
    }
  });

  const bilan = [];
  C.forEach((c) => {
    c.p.batteries = c.reserve + c.gains;
    if (c.p.batteries <= 0) {
      c.p.batteries = 0;
      c.p.alive = false;
      c.p.shields = [];
      c.p.elimDay = day;
      lines.push(`☠ Le dôme de {p:${c.id}} s'éteint.`);
    }
    bilan.push({ id: c.id, before: c.before, after: c.p.batteries });
  });

  game.log.unshift({ day, weather, die, lines, bilan });
  game.lastWeather = { weather, die };

  // Fin de tour
  game.day++;
  snapshot(game);
  const alive = game.players.filter((p) => p.alive);
  if (alive.length <= 1 || game.day > MAX_DAYS) {
    game.status = 'over';
    game.lots = [];
    game.ranking = ranking(game);
  } else {
    game.lots = rollLots(alive.length);
  }
  return game;
}

function ranking(game) {
  return game.players
    .map((p, id) => ({ id, p }))
    .sort((a, b) => (b.p.alive - a.p.alive) || b.p.batteries - a.p.batteries
      || shieldTotal(b.p) - shieldTotal(a.p) || (b.p.elimDay || 0) - (a.p.elimDay || 0))
    .map((x) => x.id);
}

module.exports = {
  MAX_DAYS, START_BATTERIES, SHIELD_DURATION, MAX_PLAYERS, COLORS,
  emptyOrders, sanitizeOrders, startGame, resolveTurn, shieldTotal, prorata,
};
