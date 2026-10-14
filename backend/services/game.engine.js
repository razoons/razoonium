// engine.js — Règles de Razoonium (fonctions pures, sans accès base de données)
// Les lignes de journal utilisent des jetons {p:N} (joueur d'index N) rendus côté client.

const MAX_DAYS = 15; // durée par défaut ; chaque partie peut fixer la sienne (game.maxDays)
const MIN_DAYS = 5;
const MAX_DAYS_LIMIT = 30;
const START_BATTERIES = 10;
const REFINE_COST = 3; // batteries par Razoonium
const LOOT_PER_DIE = 2; // batteries pillées par dé d'attaque en trop
const MAX_DICE_SHOWN = 20; // au-delà de 2× ce nombre de dés dans un combat, le journal ne donne que le décompte des duels
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
  gloom:     { label: 'Grisaille', desc: 'Génération ×1,5' },
  calm:      { label: 'Calme',     desc: 'Génération ×2' },
  abundance: { label: 'Abondance', desc: 'Génération ×3' },
};

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const emptyOrders = () => ({ gen: 0, def: 0, atk: 0, atkTarget: null, xfer: 0, xferTarget: null, bid: 0, ref: 0 });
const spent = (o) => o.gen + o.def + o.atk + o.xfer + o.bid + o.ref;

/* Lots du jour : quantités de Razoonium (cachées aux joueurs jusqu'à la résolution), triées par ordre décroissant */
function rollLots(aliveCount) {
  const n = Math.floor(aliveCount / 2);
  return Array.from({ length: n }, () => rand(0, 4)).sort((a, b) => b - a);
}

/* Valide et normalise des ordres reçus d'un client. Lève une Error si invalides. */
function sanitizeOrders(raw, game, idx) {
  const me = game.players[idx];
  const o = emptyOrders();
  for (const k of ['gen', 'def', 'atk', 'xfer', 'bid', 'ref']) {
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
  if (o.atk > 0 && o.atkTarget === null) throw new Error('Attaque sans cible.');
  if (o.xfer > 0 && o.xferTarget === null) throw new Error('Transfert sans cible.');
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
  // Journal : les lignes publiques sont des chaînes ; les autres { t, to } ne sont vues que des joueurs listés
  const lines = [];
  const say = (text, ...to) => lines.push(to.length ? { t: text, to } : text);
  const C = new Map();

  game.players.forEach((p, id) => {
    if (!p.alive) return;
    const o = { ...emptyOrders(), ...(ordersByIdx.get(id) || {}) };
    if (o.atk > 0 && (o.atkTarget == null || !game.players[o.atkTarget]?.alive)) o.atk = 0;
    if (o.xfer > 0 && (o.xferTarget == null || !game.players[o.xferTarget]?.alive)) o.xfer = 0;
    if (spent(o) > p.batteries) Object.assign(o, emptyOrders());
    C.set(id, { id, p, o, before: p.batteries, reserve: p.batteries - spent(o), genStake: o.gen, refStake: o.ref, gains: 0, shieldLost: 0 });
  });

  // 1. Coût de vie
  C.forEach((c) => (c.reserve -= 1));
  lines.push('Coût de vie : −1 {i:battery} par dôme.');

  // 2. Météo
  const die = rand(1, 6);
  // 1 : Grisaille (×1,5) · 2 à 5 : Calme (×2) · 6 : Abondance (×3)
  const weather = die === 1 ? 'gloom' : die === 6 ? 'abundance' : 'calm';
  const genMult = { gloom: 1.5, calm: 2, abundance: 3 }[weather];
  lines.push(`Météo (dé ${die}) : {w:${weather}} — ${WEATHER[weather].desc}.`);

  // 3. Enchères : tout le monde paie sa mise ; les lots, cachés jusqu'ici, sont révélés
  //    et crédités directement en Razoonium (imprenable)
  const bidders = [...C.values()].filter((c) => c.o.bid > 0)
    .sort((a, b) => b.o.bid - a.o.bid || a.p.batteries - b.p.batteries);
  if (game.lots.length) {
    lines.push(`Enchères : lots révélés → ${game.lots.map((v) => `${v} {i:razoonium}`).join(' · ')}.`);
    if (!bidders.length) lines.push('Enchères : aucune mise, les lots sont perdus.');
  }
  bidders.forEach((c, i) => {
    if (i < game.lots.length) {
      c.p.razoonium = (c.p.razoonium || 0) + game.lots[i];
      say(`Enchère : {p:${c.id}} remporte le lot n°${i + 1} (+${game.lots[i]} {i:razoonium}) pour une mise de ${c.o.bid}.`, c.id);
    } else {
      say(`Enchère : {p:${c.id}} perd sa mise de ${c.o.bid} {i:battery}.`, c.id);
    }
  });

  // 4. Transferts : reçus dans la réserve du destinataire (pillable)
  C.forEach((c) => {
    if (c.o.xfer > 0) {
      C.get(c.o.xferTarget).reserve += c.o.xfer;
      say(`{p:${c.id}} transfère ${c.o.xfer} {i:battery} à {p:${c.o.xferTarget}}.`, c.id, c.o.xferTarget);
    }
  });

  // 5. Attaques aux dés : 1 batterie d'attaque = 1 dé, 1 batterie de bouclier = 1 dé (consommée).
  //    Les dés d'attaque de tous les assaillants d'une cible sont triés ensemble, ceux de la défense
  //    aussi, du plus fort au plus faible. On compare ensuite un à un, dans l'ordre.
  //    Attaque strictement plus forte : elle prend la batterie de bouclier ; sinon (égalité comprise)
  //    la défense prend la batterie d'attaque.
  //    Chaque dé d'attaque en trop rend sa batterie à son lanceur et pille LOOT_PER_DIE batteries à la cible.
  const byTarget = new Map();
  C.forEach((c) => {
    if (c.o.atk > 0) {
      if (!byTarget.has(c.o.atkTarget)) byTarget.set(c.o.atkTarget, []);
      byTarget.get(c.o.atkTarget).push(c);
    }
  });
  // Entre plusieurs attaquants : le plus de dés lancés, puis le moins de batteries, puis le hasard
  const tie = new Map([...C.keys()].map((id) => [id, Math.random()]));
  const priority = (dice) => (x, y) => dice(y) - dice(x) || x.before - y.before || tie.get(x.id) - tie.get(y.id);
  const roll = (c, k) => Array.from({ length: k }, () => ({ c, v: rand(1, 6) })).sort((x, y) => y.v - x.v);
  // Dés rendus en face-à-face par le client : {d:VpN} = dé de valeur V lancé par le joueur N ;
  // {a:VpN} = dé d'attaque sans opposition, {b:VpN} = dé de défense resté sans adversaire
  const dieTok = (d, k = 'd') => `{${k}:${d.v}p${d.c.id}}`;
  const signed = (x) => (x > 0 ? `+${x}` : x < 0 ? `−${-x}` : '±0');

  byTarget.forEach((atks, tid) => {
    const tc = C.get(tid);
    const T = `{p:${tid}}`;
    const aPrio = priority((c) => c.o.atk);
    const aDice = atks.flatMap((a) => roll(a, a.o.atk)).sort((x, y) => y.v - x.v || aPrio(x.c, y.c));
    const defenders = tc.o.def > 0 ? [tc] : [];
    const dDice = roll(tc, tc.o.def);
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
      duels.push({ atkWon: a.v > d.v, text: `${dieTok(a)} contre ${dieTok(d)} → {p:${(a.v > d.v ? a : d).c.id}}` });
    }
    // Pillage par les dés en trop, dans l'ordre du tri : génération, puis réserve libre, puis raffinage
    const taken = { gen: 0, reserve: 0, ref: 0 };
    for (const d of aDice.slice(n)) {
      const r = res.get(d.c.id);
      r.extra++;
      d.c.gains += 1;
      for (let k = 0; k < LOOT_PER_DIE; k++) {
        const from = tc.genStake > 0 ? 'gen' : tc.reserve > 0 ? 'reserve' : tc.refStake > 0 ? 'ref' : null;
        if (!from) break;
        if (from === 'reserve') tc.reserve--;
        else if (from === 'gen') tc.genStake--;
        else tc.refStake--;
        taken[from]++;
        r.loot++;
        d.c.gains += 1;
      }
    }

    // Journal, visible des seuls participants : la cible ne montre ses dés qu'à elle-même
    const A = aDice.length;
    const all = [tid, ...atks.map((a) => a.id)];
    say(atks.length === 1
      ? `{p:${atks[0].id}} attaque ${T} avec ${A} {i:battery}.`
      : `${atks.map((a) => `{p:${a.id}} (${a.o.atk} {i:battery})`).join(', ').replace(/, ([^,]*)$/, ' et $1')} attaquent ensemble ${T}.`, ...all);
    // Face-à-face : duels, puis dés d'attaque sans opposition, et la somme en fin de ligne
    // (duels gagnés par chaque camp, batteries pillées). Les dés de défense restés sans adversaire
    // ne sont montrés qu'à la cible : ils révéleraient son bouclier.
    const aw = duels.filter((x) => x.atkWon).length;
    const stolen = taken.reserve + taken.gen + taken.ref;
    const where = [
      taken.gen && `${taken.gen} en Génération`,
      taken.reserve && `${taken.reserve} en réserve`,
      taken.ref && `${taken.ref} en Raffinage`,
    ].filter(Boolean);
    const lootSum = stolen
      ? `${stolen} {i:battery} pillée(s) (${where.join(', ')})`
      : A > n ? 'rien à piller (tout était engagé hors d\'atteinte)' : '0 {i:battery} pillée';
    const sum = `= ${atks.length === 1 ? `{p:${atks[0].id}}` : 'attaque'} ${aw} · ${T} ${n - aw} · ${lootSum}`;
    if (A + dDice.length > MAX_DICE_SHOWN * 2) {
      say(`↳ Duels ${sum}`, ...all);
    } else {
      const shown = [...duels.map((x) => x.text), ...aDice.slice(n).map((d) => dieTok(d, 'a'))];
      const spare = dDice.slice(n).map((d) => dieTok(d, 'b'));
      const others = all.filter((id) => id !== tid);
      if (spare.length) {
        say(`↳ Duels : ${shown.join(' ')} ${sum}`, ...others);
        say(`↳ Duels : ${[...shown, ...spare].join(' ')} ${sum}`, tid);
      } else {
        say(`↳ Duels : ${shown.join(' ')} ${sum}`, ...all);
      }
    }
    // Bilan net du combat : duels gagnés/perdus et butin, hors batteries d'attaque qui reviennent
    atks.forEach((a) => {
      const r = res.get(a.id);
      const net = r.won - r.lost + r.loot;
      say(`↳ {p:${a.id}} : ${signed(net)} {i:battery} (${r.won} duel(s) gagné(s), ${r.lost} perdu(s), ${r.loot} pillée(s))`, a.id, tid);
    });
    const tr = res.get(tid) || { won: 0, lost: 0 };
    const tnet = tr.won - tr.lost - stolen;
    say(`↳ ${T} : ${signed(tnet)} {i:battery} (${tr.won} {i:battery} d'attaque prise(s), ${tr.lost} {i:battery} de bouclier perdue(s), ${stolen} pillée(s))`, tid);
  });

  // 6. Boucliers : ils ne durent que le tour et sont consommés, qu'ils aient servi ou non
  C.forEach((c) => {
    const shield = c.o.def - c.shieldLost;
    if (shield) say(`{p:${c.id}} consomme ses ${shield} {i:battery} de bouclier restante(s).`, c.id);
  });

  // 7. Génération & raffinage, calculés sur les mises restantes après pillage
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
      say(r
        ? `{p:${c.id}} raffine ${r * REFINE_COST} {i:battery} en ${r} {i:razoonium} Razoonium${lostNote}${restNote}.`
        : c.refStake
          ? `{p:${c.id}} ne raffine rien : il faut ${REFINE_COST} {i:battery} par Razoonium${lostNote}${restNote}.`
          : `{p:${c.id}} ne raffine rien : ses ${c.o.ref} {i:battery} misées ont toutes été volées.`, c.id);
    }
    if (c.o.gen > 0) {
      const y = Math.floor(c.genStake * genMult);
      c.gains += y;
      const lost = c.o.gen - c.genStake;
      const m = String(genMult).replace('.', ',');
      const calc = lost ? `mise de ${c.o.gen}, dont ${lost} volée(s) : ${c.genStake} × ${m}` : `${c.genStake} × ${m}`;
      say(c.genStake
        ? `{p:${c.id}} génère ${y} {i:battery} (${calc}).`
        : `{p:${c.id}} ne génère rien : ses ${c.o.gen} {i:battery} misées ont toutes été volées.`, c.id);
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

/* Classement : le Razoonium d'abord, dômes éteints compris ; à égalité, un dôme allumé passe devant,
   puis le plus de batteries, puis celui qui a tenu le plus longtemps */
function ranking(game) {
  return game.players
    .map((p, id) => ({ id, p }))
    .sort((a, b) => (b.p.razoonium || 0) - (a.p.razoonium || 0) || (b.p.alive - a.p.alive)
      || b.p.batteries - a.p.batteries || (b.p.elimDay || 0) - (a.p.elimDay || 0))
    .map((x) => x.id);
}

/* Journal vu par le joueur d'index `me` : lignes publiques + celles qui le concernent
   (le bilan reste complet : batteries et Razoonium sont publics) */
function logFor(log, me) {
  return log.map((e) => ({
    ...e,
    lines: e.lines.filter((l) => typeof l === 'string' || l.to.includes(me)).map((l) => (typeof l === 'string' ? l : l.t)),
  }));
}

module.exports = {
  MAX_DAYS, MIN_DAYS, MAX_DAYS_LIMIT, START_BATTERIES, MAX_PLAYERS, COLORS, EMBLEMS, freeLook,
  emptyOrders, sanitizeOrders, startGame, resolveTurn, ranking, logFor,
};
