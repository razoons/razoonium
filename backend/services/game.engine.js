// engine.js — Règles de Razoonium (fonctions pures, sans accès base de données)
// Les lignes de journal utilisent des jetons rendus côté client :
// {p:N} joueur d'index N, {r:K} ressource d'index K, {i:clé} icône.
// Les quantités de ressources sont des vecteurs : vec[K] = quantité de la ressource K.

const RULES_VERSION = 2; // parties lancées avant le troc : version absente
const MAX_DAYS = 10; // durée par défaut ; chaque partie peut fixer la sienne (game.maxDays)
const MIN_DAYS = 5;
const MAX_DAYS_LIMIT = 30;
const MAX_PLAYERS = 8;

const PRODUCTION = 3; // ressources attitrées produites par chaque rôle en début de tour
const START_EACH = 1; // stock initial : 1 de chaque ressource des autres rôles
const INV_LIMIT = 12; // au-delà, le surplus est défaussé au Marché Noir en fin de tour
const MARKET_START = 2; // réserve initiale du Marché Noir, par ressource
const RAID_COST = 3; // Pillage : 3 ressources payées → 1 ressource volée au hasard chez la cible
const LOTTO_COST = 2; // Loterie : 2 ressources payées → 1 ressource piochée au hasard dans la réserve
const RECIPE_TYPES = 3; // la Recette du Tour demande 3 ressources différentes…
const RECIPE_MIN = 4; // … pour 4 à 5 ingrédients au total…
const RECIPE_MAX = 5;
const RECIPE_MAX_EACH = 2; // … dont 2 au plus de chaque

// Une ressource par rôle ; une partie à N joueurs utilise les N premières
const RESOURCES = [
  { key: 'scrap',   name: 'Ferraille',  role: 'Ferrailleur',    icon: 'mdi-cog',              color: '#c9a27a' },
  { key: 'plasma',  name: 'Plasma',     role: 'Ingénieur plasma', icon: 'mdi-flash',          color: '#ffe53b' },
  { key: 'spores',  name: 'Spores',     role: 'Botaniste',      icon: 'mdi-sprout',           color: '#9dff4a' },
  { key: 'data',    name: 'Données',    role: 'Netrunner',      icon: 'mdi-database',         color: '#00f0ff' },
  { key: 'crystal', name: 'Cristaux',   role: 'Mineur',         icon: 'mdi-hexagon-multiple', color: '#c45bff' },
  { key: 'water',   name: 'Eau lourde', role: 'Hydrologue',     icon: 'mdi-water',            color: '#3d7bff' },
  { key: 'serum',   name: 'Biogel',     role: 'Médic',          icon: 'mdi-flask',            color: '#ff5470' },
  { key: 'nanites', name: 'Nanites',    role: 'Nanotechnicien', icon: 'mdi-chip',             color: '#ff6a00' },
];

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

// ── Vecteurs de ressources ──────────────────────────────────────────────────

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const zeros = (n) => Array(n).fill(0);
const total = (v) => v.reduce((a, b) => a + b, 0);
const covers = (inv, need) => need.every((q, k) => (inv[k] ?? 0) >= q);
const add = (a, b, sign = 1) => a.map((x, k) => x + sign * (b[k] ?? 0));
const raidCost = (o) => RAID_COST * total(o.raids) + LOTTO_COST * o.lotto;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* Index tiré au hasard, pondéré par les quantités (une unité = une chance) ; -1 si vide */
function drawRandom(vec) {
  let x = Math.floor(Math.random() * total(vec));
  for (let k = 0; k < vec.length; k++) {
    if (x < vec[k]) return k;
    x -= vec[k];
  }
  return -1;
}

/* Nombre de fois qu'un stock permet de réunir la recette */
const refinable = (inv, recipe) => Math.min(...recipe.map((q, k) => (q ? Math.floor(inv[k] / q) : Infinity)));

/* « 2 {r:0} + 1 {r:3} » ; « rien » pour un vecteur vide */
const vecText = (v) => v.map((q, k) => (q ? `${q} {r:${k}}` : null)).filter(Boolean).join(' + ') || 'rien';

/* Recette du tour : RECIPE_TYPES ressources différentes, RECIPE_MIN à RECIPE_MAX ingrédients,
   jamais deux fois de suite la même */
function rollRecipe(n, previous) {
  for (;;) {
    const types = shuffle([...Array(n).keys()]).slice(0, RECIPE_TYPES);
    const r = zeros(n);
    types.forEach((t) => { r[t] = 1; });
    for (let left = rand(RECIPE_MIN, RECIPE_MAX) - RECIPE_TYPES; left > 0;) {
      const t = types[rand(0, types.length - 1)];
      if (r[t] < RECIPE_MAX_EACH) { r[t]++; left--; }
    }
    if (!previous || r.some((q, k) => q !== previous[k])) return r;
  }
}

// ── Ordres ──────────────────────────────────────────────────────────────────

/* Ordres secrets du tour : paiement du Marché Noir, pillages par cible, tirages de loterie, raffinages */
const emptyOrders = (n) => ({ pay: zeros(n), raids: zeros(n), lotto: 0, refine: 0 });

/* Valide et normalise des ordres reçus d'un client. Lève une Error si invalides. */
function sanitizeOrders(raw, game, idx) {
  const n = game.players.length;
  const int = (v) => {
    const x = Number(v ?? 0);
    if (!Number.isInteger(x) || x < 0 || x > 999) throw new Error('Quantité invalide.');
    return x;
  };
  const vec = (v) => Array.from({ length: n }, (_, k) => int(v?.[k]));
  const o = { pay: vec(raw?.pay), raids: vec(raw?.raids), lotto: int(raw?.lotto), refine: int(raw?.refine) };
  if (o.raids[idx]) throw new Error('Tu ne peux pas te piller toi-même.');
  const cost = raidCost(o);
  if (total(o.pay) !== cost) throw new Error(`Le Marché Noir coûte ${cost} ressource(s) : choisis exactement lesquelles payer.`);
  if (!covers(game.players[idx].inv, o.pay)) throw new Error('Pas assez de ressources pour ce paiement.');
  return o;
}

/* Don immédiat de `from` à `to` (sans contrepartie garantie). `reserved` : paiement du Marché Noir
   déjà engagé par le donneur, qui ne peut pas être donné. Modifie `game` en place. */
function give(game, from, to, raw, reserved) {
  const n = game.players.length;
  if (!Number.isInteger(to) || to === from || !game.players[to]) throw new Error('Destinataire invalide.');
  const vec = Array.from({ length: n }, (_, k) => {
    const x = Number(raw?.[k] ?? 0);
    if (!Number.isInteger(x) || x < 0) throw new Error('Quantité invalide.');
    return x;
  });
  if (!total(vec)) throw new Error('Rien à donner.');
  const giver = game.players[from];
  if (!covers(add(giver.inv, reserved || zeros(n), -1), vec)) {
    throw new Error('Pas assez de ressources (celles engagées au Marché Noir ne peuvent pas être données).');
  }
  giver.inv = add(giver.inv, vec, -1);
  game.players[to].inv = add(game.players[to].inv, vec);
  game.feed = [...(game.feed || []), { from, to, vec, at: Date.now() }];
  return vec;
}

// ── Déroulement ─────────────────────────────────────────────────────────────

/* Phase 1 : chaque rôle produit sa ressource attitrée */
function produce(game) {
  game.players.forEach((p) => { p.inv[p.role] += PRODUCTION; });
}

function snapshot(game) {
  game.history.push({
    day: game.day,
    players: game.players.map((p) => ({ r: p.razoonium, t: total(p.inv) })),
  });
}

/* Initialise l'état de jeu à partir des membres du lobby */
function startGame(game) {
  // Les joueurs arrivés avant le choix de couleur/emblème reçoivent les premiers libres
  for (const p of game.players) {
    if (!p.color) p.color = freeLook(game.players).color;
    if (!p.icon) p.icon = freeLook(game.players).icon;
  }
  const n = game.players.length;
  const roles = shuffle([...Array(n).keys()]);
  game.players = game.players.map((p, i) => ({
    ...p,
    role: roles[i],
    inv: zeros(n).map((_, k) => (k === roles[i] ? 0 : START_EACH)),
    razoonium: 0,
  }));
  game.version = RULES_VERSION;
  game.day = 1;
  game.market = zeros(n).fill(MARKET_START);
  game.recipe = rollRecipe(n);
  game.feed = [];
  game.log = [];
  game.history = [];
  game.status = 'running';
  produce(game);
  snapshot(game);
  return game;
}

/*
 * Résout un tour (phases 3 à 5). `ordersByIdx` : Map index joueur → ordres.
 * Les dons (phase 2) ont déjà été appliqués au fil du tour. Modifie `game` en place et le renvoie.
 */
function resolveTurn(game, ordersByIdx) {
  const day = game.day;
  const n = game.players.length;
  const P = game.players;
  // Journal : les lignes publiques sont des chaînes ; les autres { t, to } ne sont vues que des joueurs listés
  const lines = [];
  const say = (text, ...to) => lines.push(to.length ? { t: text, to } : text);
  const before = P.map((p) => ({ r: p.razoonium, t: total(p.inv) }));

  lines.push(`Recette du jour : ${vecText(game.recipe)} = 1 {i:razoonium}.`);

  // Phase 2 (rappel) : les dons du tour, vus des seuls donneur et receveur
  (game.feed || []).forEach((g) => say(`{p:${g.from}} donne ${vecText(g.vec)} à {p:${g.to}}.`, g.from, g.to));

  // Ordres revérifiés : un paiement devenu impossible annule les actions du Marché Noir (pas le raffinage)
  const O = P.map((p, id) => {
    const raw = ordersByIdx.get(id) || {};
    const o = { ...emptyOrders(n), ...raw };
    o.raids = o.raids.map((c, t) => (t === id ? 0 : c));
    if (total(o.pay) !== raidCost(o) || !covers(p.inv, o.pay)) {
      if (raidCost(o)) say(`{p:${id}} : paiement du Marché Noir invalide, pillages et loterie annulés.`, id);
      Object.assign(o, { pay: zeros(n), raids: zeros(n), lotto: 0 });
    }
    return o;
  });

  // Phase 3 : Marché Noir. Les paiements rejoignent d'abord la réserve…
  O.forEach((o, id) => {
    if (!total(o.pay)) return;
    say(`{p:${id}} paie ${vecText(o.pay)} au Marché Noir.`, id);
    P[id].inv = add(P[id].inv, o.pay, -1);
    game.market = add(game.market, o.pay);
  });

  // … puis les pillages, dans un ordre aléatoire : 1 ressource au hasard dans le stock de la cible
  const raids = shuffle(O.flatMap((o, from) => o.raids.flatMap((c, to) => Array(c).fill({ from, to }))));
  const loot = new Map(); // "from-to" → { from, to, tries, got }
  raids.forEach(({ from, to }) => {
    const key = `${from}-${to}`;
    if (!loot.has(key)) loot.set(key, { from, to, tries: 0, got: zeros(n) });
    const l = loot.get(key);
    l.tries++;
    const k = drawRandom(P[to].inv);
    if (k < 0) return;
    P[to].inv[k]--;
    P[from].inv[k]++;
    l.got[k]++;
  });
  loot.forEach(({ from, to, tries, got }) => {
    say(total(got)
      ? `{i:raid} {p:${from}} pille {p:${to}} (${tries} fois) et lui vole ${vecText(got)}.`
      : `{i:raid} {p:${from}} pille {p:${to}} (${tries} fois), mais son stock est vide.`, from, to);
  });

  // … puis la loterie, piochée dans la réserve (paiements du tour compris : on peut retomber sur sa mise)
  O.forEach((o, id) => {
    if (!o.lotto) return;
    const got = zeros(n);
    for (let i = 0; i < o.lotto; i++) {
      const k = drawRandom(game.market);
      if (k < 0) break;
      game.market[k]--;
      P[id].inv[k]++;
      got[k]++;
    }
    say(`{i:lotto} Loterie : {p:${id}} pioche ${vecText(got)} (${o.lotto} tirage(s)).`, id);
  });

  // Phase 4 : Raffinage, sur le stock après le Marché Noir. Les ingrédients rejoignent la réserve.
  O.forEach((o, id) => {
    if (!o.refine) return;
    const k = Math.min(o.refine, refinable(P[id].inv, game.recipe));
    if (k) {
      const used = game.recipe.map((q) => q * k);
      P[id].inv = add(P[id].inv, used, -1);
      game.market = add(game.market, used);
      P[id].razoonium += k;
      say(`{i:refine} {p:${id}} raffine ${k} {i:razoonium}.`);
    }
    if (k < o.refine) say(`{p:${id}} ne réunit la recette que ${k} fois sur ${o.refine} demandée(s).`, id);
  });

  // Phase 5 : limite d'inventaire, le surplus (ressource la plus abondante d'abord) part au Marché Noir
  P.forEach((p, id) => {
    const over = total(p.inv) - INV_LIMIT;
    if (over <= 0) return;
    const lost = zeros(n);
    for (let i = 0; i < over; i++) {
      const k = p.inv.indexOf(Math.max(...p.inv));
      p.inv[k]--;
      lost[k]++;
      game.market[k]++;
    }
    say(`{p:${id}} dépasse la limite de ${INV_LIMIT} : ${vecText(lost)} défaussé(s) au Marché Noir.`, id);
  });

  const bilan = P.map((p, id) => ({ id, r: p.razoonium - before[id].r, before: before[id].t, after: total(p.inv) }));
  game.log.unshift({ day, recipe: game.recipe, lines, bilan });
  game.feed = [];

  // Tour suivant : nouvelle recette, puis production
  game.day++;
  if (game.day > (game.maxDays ?? MAX_DAYS)) {
    game.status = 'over';
    game.ranking = ranking(game);
  } else {
    game.recipe = rollRecipe(n, game.recipe);
    produce(game);
  }
  snapshot(game);
  return game;
}

/* Classement : le plus de Razoonium, puis le plus gros stock */
function ranking(game) {
  return game.players
    .map((p, id) => ({ id, p }))
    .sort((a, b) => b.p.razoonium - a.p.razoonium || total(b.p.inv) - total(a.p.inv))
    .map((x) => x.id);
}

/* Journal vu par le joueur d'index `me` : lignes publiques + celles qui le concernent */
function logFor(log, me) {
  return log.map((e) => ({
    ...e,
    lines: e.lines.filter((l) => typeof l === 'string' || l.to.includes(me)).map((l) => (typeof l === 'string' ? l : l.t)),
  }));
}

module.exports = {
  RULES_VERSION, MAX_DAYS, MIN_DAYS, MAX_DAYS_LIMIT, MAX_PLAYERS, RESOURCES, COLORS, EMBLEMS,
  PRODUCTION, INV_LIMIT, RAID_COST, LOTTO_COST,
  freeLook, total, vecText, emptyOrders, sanitizeOrders, give, startGame, resolveTurn, ranking, logFor,
};
