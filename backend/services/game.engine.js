// engine.js — Règles de Razoonium (fonctions pures, sans accès base de données)
// Les lignes de journal utilisent des jetons {p:N} (joueur d'index N) rendus côté client.

const MAX_DAYS = 15; // durée par défaut ; chaque partie peut fixer la sienne (game.maxDays)
const MIN_DAYS = 5;
const MAX_DAYS_LIMIT = 30;
const START_BATTERIES = 10;
const REFINE_COST = 3; // batteries par Razoonium
const MAX_PLAYERS = 8;

const COLORS = [
  '#00f0ff', '#80d8ff', '#3d7bff', '#8a7dff', '#c45bff', '#ff2bd6', '#ff8fc8', '#ff5470', '#ff2a2a',
  '#ff6a00', '#ffb020', '#ffe53b', '#9dff4a', '#2bd96b', '#2bffc6', '#c9a27a', '#8f9bb3', '#f2f6ff',
];

// Emblèmes : noms d'icônes Material Design Icons (@mdi/font)
const EMBLEMS = [
  'mdi-rocket-launch', 'mdi-alien', 'mdi-robot', 'mdi-ufo', 'mdi-satellite-variant', 'mdi-meteor',
  'mdi-atom-variant', 'mdi-radioactive', 'mdi-biohazard', 'mdi-skull', 'mdi-ghost',
  'mdi-spider', 'mdi-snake', 'mdi-bat', 'mdi-jellyfish', 'mdi-crown',
  'mdi-lightning-bolt', 'mdi-fire', 'mdi-crystal-ball',
  'mdi-shark', 'mdi-unicorn', 'mdi-bee', 'mdi-turtle', 'mdi-mushroom', 'mdi-cactus',
  'mdi-space-station', 'mdi-death-star-variant', 'mdi-star-shooting',
  'mdi-moon-waning-crescent', 'mdi-robot-angry', 'mdi-ninja', 'mdi-pirate',
  'mdi-virus', 'mdi-drama-masks', 'mdi-triforce', 'mdi-compass-rose', 'mdi-deathly-hallows',
  'mdi-rocket', 'mdi-turbine', 'mdi-anchor', 'mdi-ship-wheel', 'mdi-axe-battle',
  'mdi-cards-spade', 'mdi-cards-heart', 'mdi-cards-diamond', 'mdi-cards-club', 'mdi-shield-crown', 'mdi-poker-chip',
];

/* Première couleur et premier emblème non pris par les joueurs donnés */
function freeLook(players) {
  return {
    color: COLORS.find((c) => !players.some((p) => p.color === c)),
    icon: EMBLEMS.find((e) => !players.some((p) => p.icon === e)),
  };
}

const WEATHER = {
  gloom:     { label: 'Grisaille', desc: 'Génération ×2' },
  calm:      { label: 'Calme',     desc: 'Génération ×3' },
  abundance: { label: 'Abondance', desc: 'Génération ×4' },
};

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const emptyOrders = () => ({ gen: 0, def: 0, atk: 0, atkTarget: null, prot: 0, protTarget: null, xfer: 0, xferTarget: null, bid: 0, ref: 0 });
const spent = (o) => o.gen + o.def + o.atk + o.prot + o.xfer + o.bid + o.ref;

/* Lots du jour : quantités de Razoonium, triées par ordre décroissant */
function rollLots(aliveCount) {
  const n = Math.floor(aliveCount / 2);
  return Array.from({ length: n }, () => rand(2, 8)).sort((a, b) => b - a);
}

/* Valide et normalise des ordres reçus d'un client. Lève une Error si invalides. */
function sanitizeOrders(raw, game, idx) {
  const me = game.players[idx];
  const o = emptyOrders();
  for (const k of ['gen', 'def', 'atk', 'prot', 'xfer', 'bid', 'ref']) {
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
  o.protTarget = target('protTarget');
  if (o.atk > 0 && o.atkTarget === null) throw new Error('Attaque sans cible.');
  if (o.xfer > 0 && o.xferTarget === null) throw new Error('Transfert sans cible.');
  if (o.prot > 0 && o.protTarget === null) throw new Error('Protection sans cible.');
  if (o.prot > 0 && o.atk > 0 && o.protTarget === o.atkTarget) throw new Error('Tu ne peux pas protéger le dôme que tu attaques.');
  if (spent(o) > me.batteries) throw new Error('Pas assez de batteries.');
  return o;
}

function snapshot(game) {
  game.history.push({
    day: game.day,
    players: game.players.map((p) => ({ b: p.batteries, alive: p.alive, r: p.razoonium || 0 })),
  });
}

/* Initialise l'état de jeu à partir des membres du lobby */
function startGame(game) {
  // Les joueurs arrivés avant le choix de couleur/emblème reçoivent les premiers libres
  for (const p of game.players) {
    if (!p.color) p.color = freeLook(game.players).color;
    if (!p.icon) p.icon = freeLook(game.players).icon;
  }
  game.players = game.players.map((p) => ({
    ...p,
    batteries: START_BATTERIES,
    razoonium: 0,
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
    if (o.prot > 0 && (o.protTarget == null || !game.players[o.protTarget]?.alive)) o.prot = 0;
    if (o.xfer > 0 && (o.xferTarget == null || !game.players[o.xferTarget]?.alive)) o.xfer = 0;
    if (spent(o) > p.batteries) Object.assign(o, emptyOrders());
    C.set(id, { id, p, o, before: p.batteries, reserve: p.batteries - spent(o), genStake: o.gen, refStake: o.ref, gains: 0, shieldLost: 0 });
  });

  // 1. Coût de vie
  C.forEach((c) => (c.reserve -= 1));
  lines.push('Coût de vie : −1 {i:battery} par dôme.');

  // 2. Météo
  const die = rand(1, 6);
  // 1 : Grisaille (×2) · 2 à 5 : Calme (×3) · 6 : Abondance (×4)
  const weather = die === 1 ? 'gloom' : die === 6 ? 'abundance' : 'calm';
  const genMult = { gloom: 2, calm: 3, abundance: 4 }[weather];
  lines.push(`Météo (dé ${die}) : {w:${weather}} — ${WEATHER[weather].desc}.`);

  // 3. Enchères : lots de Razoonium crédités directement (imprenables),
  //    mises perdantes remboursées dans la réserve (pillable)
  const bidders = [...C.values()].filter((c) => c.o.bid > 0)
    .sort((a, b) => b.o.bid - a.o.bid || a.p.batteries - b.p.batteries);
  if (!bidders.length && game.lots.length) lines.push('Enchères : aucune mise, les lots restent en réserve.');
  bidders.forEach((c, i) => {
    if (i < game.lots.length) {
      c.p.razoonium = (c.p.razoonium || 0) + game.lots[i];
      lines.push(`Enchère : {p:${c.id}} remporte le lot n°${i + 1} (+${game.lots[i]} {i:razoonium}) pour une mise de ${c.o.bid}.`);
    } else {
      c.reserve += c.o.bid;
      lines.push(`Enchère : {p:${c.id}} perd (mise de ${c.o.bid} remboursée).`);
    }
  });

  // 4. Transferts : reçus dans la réserve du destinataire (pillable)
  C.forEach((c) => {
    if (c.o.xfer > 0) {
      C.get(c.o.xferTarget).reserve += c.o.xfer;
      lines.push(`{p:${c.id}} transfère ${c.o.xfer} {i:battery} à {p:${c.o.xferTarget}}.`);
    }
  });

  // 5. Protections : des batteries envoyées en bouclier sur un autre dôme pour ce tour
  C.forEach((c) => {
    if (c.o.prot > 0) lines.push(`{p:${c.id}} protège {p:${c.o.protTarget}} avec ${c.o.prot} {i:battery}.`);
  });

  // 6. Attaques aux dés : 1 batterie d'attaque = 1 dé, 1 batterie de bouclier = 1 dé.
  //    Les dés d'attaque de tous les assaillants d'une cible sont triés ensemble. Côté défense,
  //    les dés du dôme attaqué passent d'abord, puis ceux de ses protecteurs ; chaque joueur trie
  //    ses propres dés du plus fort au plus faible. On compare ensuite un à un, dans l'ordre.
  //    Attaque strictement plus forte : elle prend la batterie de bouclier ; sinon (égalité comprise)
  //    le lanceur du dé de défense prend la batterie d'attaque.
  //    Chaque dé d'attaque en trop rend sa batterie à son lanceur et pille 1 batterie à la cible.
  const byTarget = new Map();
  C.forEach((c) => {
    if (c.o.atk > 0) {
      if (!byTarget.has(c.o.atkTarget)) byTarget.set(c.o.atkTarget, []);
      byTarget.get(c.o.atkTarget).push(c);
    }
  });
  // Entre plusieurs joueurs d'un même camp : le plus de dés lancés, puis le moins de batteries, puis le hasard
  const tie = new Map([...C.keys()].map((id) => [id, Math.random()]));
  const priority = (dice) => (x, y) => dice(y) - dice(x) || x.before - y.before || tie.get(x.id) - tie.get(y.id);
  const roll = (c, k) => Array.from({ length: k }, () => ({ c, v: rand(1, 6) })).sort((x, y) => y.v - x.v);
  const dieList = (dice) => dice.map((d) => d.v).join(' · ');

  byTarget.forEach((atks, tid) => {
    const tc = C.get(tid);
    const T = `{p:${tid}}`;
    const aPrio = priority((c) => c.o.atk);
    const aDice = atks.flatMap((a) => roll(a, a.o.atk)).sort((x, y) => y.v - x.v || aPrio(x.c, y.c));
    const helpers = [...C.values()].filter((c) => c.o.prot > 0 && c.o.protTarget === tid).sort(priority((c) => c.o.prot));
    const defenders = [tc, ...helpers].filter((c) => (c === tc ? c.o.def : c.o.prot) > 0);
    const dDice = defenders.flatMap((c) => roll(c, c === tc ? c.o.def : c.o.prot));
    const n = Math.min(aDice.length, dDice.length);

    const res = new Map([...atks, ...defenders].map((c) => [c.id, { won: 0, lost: 0, extra: 0, loot: 0 }]));
    const duels = [];
    for (let i = 0; i < n; i++) {
      const a = aDice[i];
      const d = dDice[i];
      if (a.v > d.v) {
        res.get(a.c.id).won++;
        res.get(d.c.id).lost++;
        d.c.shieldLost++;
        a.c.gains += 2; // sa batterie d'attaque lui revient + la batterie de bouclier prise
      } else {
        res.get(d.c.id).won++;
        res.get(a.c.id).lost++;
        d.c.gains += 1; // le lanceur du dé de défense empoche la batterie d'attaque
      }
      duels.push(`${a.v} contre ${d.v} → {p:${(a.v > d.v ? a : d).c.id}}`);
    }
    // Pillage par les dés en trop, dans l'ordre du tri : réserve libre, puis génération, puis raffinage
    const taken = { reserve: 0, gen: 0, ref: 0 };
    for (const d of aDice.slice(n)) {
      const r = res.get(d.c.id);
      r.extra++;
      d.c.gains += 1;
      const from = tc.reserve > 0 ? 'reserve' : tc.genStake > 0 ? 'gen' : tc.refStake > 0 ? 'ref' : null;
      if (!from) continue;
      if (from === 'reserve') tc.reserve--;
      else if (from === 'gen') tc.genStake--;
      else tc.refStake--;
      taken[from]++;
      r.loot++;
      d.c.gains += 1;
    }

    // Journal : qui attaque, les dés, les duels, le pillage, puis le bilan de chacun
    const A = aDice.length;
    lines.push(atks.length === 1
      ? `{p:${atks[0].id}} attaque ${T} avec ${A} {i:battery}.`
      : `${atks.map((a) => `{p:${a.id}} (${a.o.atk} {i:battery})`).join(', ').replace(/, ([^,]*)$/, ' et $1')} attaquent ensemble ${T}.`);
    lines.push(`↳ Dés d'attaque : ${aDice.map((d) => (atks.length === 1 ? d.v : `${d.v} {p:${d.c.id}}`)).join(' · ')}.`);
    if (!dDice.length) lines.push(`↳ ${T} n'a pas de bouclier.`);
    else if (defenders.length === 1 && defenders[0] === tc) lines.push(`↳ Dés de défense de ${T} : ${dieList(dDice)}.`);
    else {
      const groups = defenders.map((c) => `{p:${c.id}} ${dieList(dDice.filter((d) => d.c === c))}`);
      lines.push(`↳ Dés de défense, dans l'ordre : ${groups.join(', puis ')}.`);
    }
    if (duels.length) lines.push(`↳ Duels : ${duels.join(' ; ')}.`);
    const stolen = taken.reserve + taken.gen + taken.ref;
    if (stolen) {
      const parts = [
        taken.reserve && `${taken.reserve} dans sa réserve`,
        taken.gen && `${taken.gen} dans sa mise en génération`,
        taken.ref && `${taken.ref} dans sa mise en raffinage`,
      ].filter(Boolean);
      const empty = stolen < A - n ? ' Il n\'y avait rien de plus à prendre.' : '';
      lines.push(`↳ ${T} se fait piller ${stolen} {i:battery} : ${parts.join(', ')}.${empty}`);
    } else if (A > n) {
      lines.push(`↳ ${T} n'avait plus aucune batterie à piller.`);
    }
    atks.forEach((a) => {
      const r = res.get(a.id);
      const parts = [
        r.won && `gagne ${r.won} duel(s) et prend ${r.won} {i:battery} de bouclier`,
        r.lost && `perd ${r.lost} duel(s) et ${r.lost} {i:battery}`,
        r.extra && `récupère ${r.extra} {i:battery} en trop${r.loot ? ` et en pille ${r.loot}` : ''}`,
      ].filter(Boolean);
      lines.push(`↳ {p:${a.id}} ${parts.join(', ')}.`);
    });
    defenders.forEach((c) => {
      const r = res.get(c.id);
      const unused = (c === tc ? c.o.def : c.o.prot) - r.won - r.lost;
      const parts = [
        r.lost && `perd ${r.lost} {i:battery} de bouclier`,
        r.won && `empoche ${r.won} {i:battery} d'attaque`,
        unused && `récupère ${unused} {i:battery} de bouclier non utilisée(s)`,
      ].filter(Boolean);
      lines.push(`↳ {p:${c.id}} ${parts.join(', ')}.`);
    });
  });

  // 7. Boucliers : ils ne durent que le tour ; toute batterie de bouclier non prise revient à son propriétaire
  C.forEach((c) => { c.gains += c.o.def + c.o.prot - c.shieldLost; });

  // 8. Génération & raffinage, calculés sur les mises restantes après pillage
  //    (une fois raffiné, le Razoonium est définitif et imprenable)
  C.forEach((c) => {
    if (c.o.ref > 0) {
      // REFINE_COST batteries → 1 Razoonium ; le reliquat non raffinable est rendu
      const r = Math.floor(c.refStake / REFINE_COST);
      const rest = c.refStake - r * REFINE_COST;
      c.p.razoonium = (c.p.razoonium || 0) + r;
      c.gains += rest;
      const lost = c.o.ref - c.refStake;
      const lostNote = lost ? ` (mise de ${c.o.ref}, dont ${lost} volée(s))` : '';
      const restNote = rest ? `, ${rest} {i:battery} non raffinée(s) rendue(s)` : '';
      lines.push(r
        ? `{p:${c.id}} raffine ${r * REFINE_COST} {i:battery} en ${r} {i:razoonium} Razoonium${lostNote}${restNote}.`
        : c.refStake
          ? `{p:${c.id}} ne raffine rien : il faut ${REFINE_COST} {i:battery} par Razoonium${lostNote}${restNote}.`
          : `{p:${c.id}} ne raffine rien : ses ${c.o.ref} {i:battery} misées ont toutes été volées.`);
    }
    if (c.o.gen > 0) {
      const y = Math.floor(c.genStake * genMult);
      c.gains += y;
      const lost = c.o.gen - c.genStake;
      const m = String(genMult).replace('.', ',');
      const calc = lost ? `mise de ${c.o.gen}, dont ${lost} volée(s) : ${c.genStake} × ${m}` : `${c.genStake} × ${m}`;
      lines.push(c.genStake
        ? `{p:${c.id}} génère ${y} {i:battery} (${calc}).`
        : `{p:${c.id}} ne génère rien : ses ${c.o.gen} {i:battery} misées ont toutes été volées.`);
    }
  });

  const bilan = [];
  C.forEach((c) => {
    c.p.batteries = c.reserve + c.gains;
    if (c.p.batteries <= 0) {
      c.p.batteries = 0;
      c.p.alive = false;
      c.p.elimDay = day;
      lines.push(`{i:dead} Le dôme de {p:${c.id}} s'éteint.`);
    }
    bilan.push({ id: c.id, before: c.before, after: c.p.batteries });
  });

  game.log.unshift({ day, weather, die, lines, bilan });
  game.lastWeather = { weather, die };

  // Fin de tour
  game.day++;
  snapshot(game);
  const alive = game.players.filter((p) => p.alive);
  if (alive.length <= 1 || game.day > (game.maxDays ?? MAX_DAYS)) {
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
    .sort((a, b) => (b.p.alive - a.p.alive) || (b.p.razoonium || 0) - (a.p.razoonium || 0)
      || b.p.batteries - a.p.batteries || (b.p.elimDay || 0) - (a.p.elimDay || 0))
    .map((x) => x.id);
}

module.exports = {
  MAX_DAYS, MIN_DAYS, MAX_DAYS_LIMIT, START_BATTERIES, MAX_PLAYERS, COLORS, EMBLEMS, freeLook,
  emptyOrders, sanitizeOrders, startGame, resolveTurn,
};
