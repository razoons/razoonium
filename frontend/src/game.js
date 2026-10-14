// Constantes d'affichage du jeu (les règles elles-mêmes vivent côté serveur)

// Icônes Material Design (https://pictogrammers.com/library/mdi/)
export const ICONS = {
  battery:   'mdi-battery-high',
  shield:    'mdi-shield-half-full',
  razoonium: 'mdi-diamond-stone',
  dead:      'mdi-skull-outline',
  timer:     'mdi-timer-outline',
  trophy:    'mdi-trophy',
};

export const WEATHER = {
  gloom:     { label: 'Grisaille', icon: 'mdi-weather-pouring',   color: 'var(--amber)', desc: 'Génération ×1,5' },
  calm:      { label: 'Calme',     icon: 'mdi-weather-night',     color: 'var(--cyan)',  desc: 'Génération ×2' },
  abundance: { label: 'Abondance', icon: 'mdi-weather-sunny',     color: 'var(--lime)',  desc: 'Génération ×3' },
  // Ancienne météo, conservée pour afficher le journal des parties déjà jouées
  storm:     { label: 'Tempête',   icon: 'mdi-weather-lightning', color: 'var(--amber)', desc: '−1 batterie pour tous' },
};

export const ACTIONS = [
  { key: 'gen',  name: 'Générer',    icon: 'mdi-atom',             tag: 'Soi-même',   color: '#9dff4a', desc: 'Dépense X → rapporte X × 2 en fin de tour (×1,5 ou ×3 selon la météo). Pillée en premier.' },
  { key: 'def',  name: 'Défendre',   icon: 'mdi-shield-outline',    tag: 'Soi-même',   color: '#00f0ff', desc: 'X batteries → X dés de défense ce tour. Consommées même si elles ne servent pas.' },
  { key: 'ref',  name: 'Raffiner',   icon: 'mdi-flask-outline',     tag: 'Score',      color: '#2bffc6', desc: 'Convertit 3 batteries en 1 Razoonium en fin de tour. Mise pillable, Razoonium acquis imprenable.' },
  { key: 'atk',  name: 'Attaquer',   icon: 'mdi-sword',             tag: 'Un joueur',  color: '#ff4d6d', target: 'atkTarget', desc: 'X batteries → X dés contre les dés de défense. Chaque dé en trop revient et pille 2 batteries.' },
  { key: 'xfer', name: 'Transférer', icon: 'mdi-swap-horizontal',   tag: 'Un joueur',  color: '#ffb020', target: 'xferTarget', desc: 'Envoie X batteries, reçues avant les attaques (pillables).' },
  { key: 'bid',  name: 'Enchère',    icon: 'mdi-gavel',             tag: 'La réserve', color: '#ff2bd6', desc: 'Mise secrète, payée par tous. Les plus grosses mises remportent les lots, dont le contenu (0 à 4) reste caché.' },
];

export const emptyOrders = () => ({ gen: 0, def: 0, atk: 0, atkTarget: null, xfer: 0, xferTarget: null, bid: 0, ref: 0 });
export const spent = (o) => o.gen + o.def + o.atk + o.xfer + o.bid + o.ref;

export function timeLeft(deadline, now = Date.now()) {
  const ms = Math.max(0, deadline - now);
  const h = Math.floor(ms / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  const s = Math.floor((ms % 60e3) / 1e3);
  const pad = (n) => String(n).padStart(2, '0');
  if (h) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

/* Anciens journaux (avant les jetons {d:N}) : convertit les dés écrits en chiffres pour les afficher en icônes */
function legacyDice(line) {
  if (/^(↳ )?Duels :/.test(line)) return line.replace(/\b([1-6]) contre ([1-6])\b/g, '{d:$1} contre {d:$2}');
  const m = line.match(/^((?:↳ )?Dés (?:d'attaque|de défense).*? : )(.*)$/);
  if (!m) return line;
  // un chiffre isolé (début, espace ou « · » avant) ; les comptes « ×4 » et les jetons {p:N} sont épargnés
  return m[1] + m[2].replace(/(^|[\s·])([1-6])(?=[\s.,]|$)/g, '$1{d:$2}');
}

// Dé {d:V} ou {d:VpN} (lancé par le joueur N) ; duel « dé contre dé → {p:gagnant} » ;
// {a:VpN} dé d'attaque sans opposition, {b:VpN} dé de défense resté sans adversaire
const DUEL = /^\{d:(\d)(?:p(\d+))?\} contre \{d:(\d)(?:p(\d+))?\} → \{p:(\d+)\}$/;
const TOKENS = /(\{d:\d(?:p\d+)?\} contre \{d:\d(?:p\d+)?\} → \{p:\d+\}|\{[pwidab]:[a-zA-Z0-9]+\})/;
const owner = (p) => (p === undefined ? undefined : Number(p));
const dieOf = (s) => { const [, v, p] = s.match(/^(\d)(?:p(\d+))?$/) || []; return { v: Number(v), p: owner(p) }; };

/* Découpe une ligne de journal en segments : texte, joueur {p:N}, météo {w:key}, dé {d:V[pN]},
   duel { a, d } (deux dés face à face), dé seul { free: 'a' | 'b' } ou icône {i:key} (clé de ICONS) */
export function parseLine(line) {
  return legacyDice(line).split(TOKENS).filter(Boolean)
    .filter((part) => !/^\s*;\s*$/.test(part)) // séparateurs entre duels des anciens journaux
    .map((part) => {
      const duel = part.match(DUEL);
      if (duel) {
        const [, av, ap, dv, dp, win] = duel;
        return { duel: { a: { v: Number(av), p: owner(ap) }, d: { v: Number(dv), p: owner(dp) }, win: Number(win), atkWon: Number(av) > Number(dv) } };
      }
      const m = part.match(/^\{([pwidab]):([a-zA-Z0-9]+)\}$/);
      if (!m) return { text: part };
      if (m[1] === 'p') return { player: Number(m[2]) };
      if (m[1] === 'd') { const d = dieOf(m[2]); return { die: d.v, owner: d.p }; }
      if (m[1] === 'a' || m[1] === 'b') return { free: m[1], ...dieOf(m[2]) };
      return m[1] === 'w' ? { weather: m[2] } : { icon: m[2] };
    });
}

/* Dés d'une ancienne ligne « Dés d'attaque / de défense » : « 6 · 4 », « 6 {p:2} · 4 {p:1} » ou jetons {d:VpN}.
   null si la liste est résumée (« 6 ×4 ») et ne peut pas être reconstruite. */
function legacyList(text, who) {
  if (text.includes('×')) return null;
  if (text.includes('{d:')) return [...text.matchAll(/\{d:(\d)(?:p(\d+))?\}/g)].map(([, v, p]) => ({ v: Number(v), p: p === undefined ? who : Number(p) }));
  return [...text.matchAll(/(?:^|[\s·])([1-6])(?: \{p:(\d+)\})?(?=[\s.·]|$)/g)].map(([, v, p]) => ({ v: Number(v), p: p === undefined ? who : Number(p) }));
}

/* Lignes d'une entrée de journal prêtes à afficher : les combats des anciens tours (listes de dés
   d'attaque et de défense, puis duels) sont reconstruits en une seule ligne de face-à-face */
export function displayLines(lines) {
  const out = [];
  let fight = null;
  const flush = () => {
    if (!fight?.a || fight.done) return;
    fight.done = true;
    const { a, d } = fight;
    const n = Math.min(a.length, d.length);
    const tok = (x, k = 'd') => `{${k}:${x.v}${x.p === undefined ? '' : `p${x.p}`}}`;
    const duels = a.slice(0, n).map((x, i) => `${tok(x)} contre ${tok(d[i])} → {p:${x.v > d[i].v ? x.p : d[i].p}}`);
    const aw = a.slice(0, n).filter((x, i) => x.v > d[i].v).length;
    const loot = fight.loot ? `${fight.loot} {i:battery} pillée(s)` : a.length > n ? 'rien à piller' : '0 {i:battery} pillée';
    const sum = `= ${fight.atk === undefined ? 'attaque' : `{p:${fight.atk}}`} ${aw} · {p:${fight.tgt}} ${n - aw} · ${loot}`;
    out.push(`↳ Duels : ${[...duels, ...a.slice(n).map((x) => tok(x, 'a')), ...d.slice(n).map((x) => tok(x, 'b'))].join(' ')} ${sum}`);
  };
  for (const l of lines) {
    let m;
    if (fight && !fight.done) {
      if ((m = l.match(/^↳ Dés d'attaque : (.*?)\.?$/))) {
        const a = legacyList(m[1], fight.atk);
        if (a) { fight.a = a; continue; }
      } else if ((m = l.match(/^↳ (?:Dés de défense de|Défense de) \{p:\d+\} : (?:\d+ dé\(s\) — )?(.*?)\.?$/))) {
        const d = legacyList(m[1], fight.tgt);
        if (d) { fight.d = d; continue; }
      } else if (/^↳ \{p:\d+\} n'a pas de bouclier\./.test(l)) {
        fight.d = [];
        continue;
      } else if (fight.a && /^↳ Duels :/.test(l)) {
        continue; // refait à partir des listes de dés
      } else if (fight.a && (m = l.match(/^↳ \{p:\d+\} se fait piller (\d+)/))) {
        fight.loot = Number(m[1]); // repris dans la somme du face-à-face
        continue;
      } else if (fight.a && /^↳ \{p:\d+\} n'avait plus aucune batterie à piller/.test(l)) {
        continue;
      }
    }
    flush();
    if ((m = l.match(/^\{p:(\d+)\} attaque \{p:(\d+)\} avec/))) fight = { atk: Number(m[1]), tgt: Number(m[2]), a: null, d: [] };
    else if ((m = l.match(/attaquent ensemble \{p:(\d+)\}/))) fight = { tgt: Number(m[1]), a: null, d: [] };
    else if (!l.startsWith('↳ ')) fight = null;
    out.push(l);
  }
  flush();
  return out;
}
