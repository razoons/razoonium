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
  gloom:     { label: 'Grisaille', icon: 'mdi-weather-pouring',   color: 'var(--amber)', desc: 'Génération ×2' },
  calm:      { label: 'Calme',     icon: 'mdi-weather-night',     color: 'var(--cyan)',  desc: 'Génération ×3' },
  abundance: { label: 'Abondance', icon: 'mdi-weather-sunny',     color: 'var(--lime)',  desc: 'Génération ×4' },
  // Ancienne météo, conservée pour afficher le journal des parties déjà jouées
  storm:     { label: 'Tempête',   icon: 'mdi-weather-lightning', color: 'var(--amber)', desc: '−1 batterie pour tous' },
};

export const ACTIONS = [
  { key: 'gen',  name: 'Générer',    icon: 'mdi-atom',             tag: 'Soi-même',   color: '#9dff4a', desc: 'Dépense X → rapporte X × 3 en fin de tour (×2 ou ×4 selon la météo, pillable).' },
  { key: 'def',  name: 'Défendre',   icon: 'mdi-shield-outline',    tag: 'Soi-même',   color: '#00f0ff', desc: 'X batteries → X dés de défense ce tour. Celles non prises te reviennent.' },
  { key: 'ref',  name: 'Raffiner',   icon: 'mdi-flask-outline',     tag: 'Score',      color: '#2bffc6', desc: 'Convertit 3 batteries en 1 Razoonium en fin de tour. Mise pillable, Razoonium acquis imprenable.' },
  { key: 'atk',  name: 'Attaquer',   icon: 'mdi-sword',             tag: 'Un joueur',  color: '#ff4d6d', target: 'atkTarget', desc: 'X batteries → X dés contre les dés de défense. Les dés en trop reviennent et pillent.' },
  { key: 'prot', name: 'Protéger',   icon: 'mdi-shield-account-outline', tag: 'Un joueur', color: '#8a7dff', target: 'protTarget', desc: 'X batteries → X dés de défense pour un autre dôme ce tour, lancés après les siens. Celles non prises te reviennent.' },
  { key: 'xfer', name: 'Transférer', icon: 'mdi-swap-horizontal',   tag: 'Un joueur',  color: '#ffb020', target: 'xferTarget', desc: 'Envoie X batteries, reçues avant les attaques (pillables).' },
  { key: 'bid',  name: 'Enchère',    icon: 'mdi-gavel',             tag: 'La réserve', color: '#ff2bd6', desc: 'Mise secrète. Gagnant : paie. Perdant : remboursé.' },
];

export const emptyOrders = () => ({ gen: 0, def: 0, atk: 0, atkTarget: null, prot: 0, protTarget: null, xfer: 0, xferTarget: null, bid: 0, ref: 0 });
export const spent = (o) => o.gen + o.def + o.atk + o.prot + o.xfer + o.bid + o.ref;

export function timeLeft(deadline, now = Date.now()) {
  const ms = Math.max(0, deadline - now);
  const h = Math.floor(ms / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  const s = Math.floor((ms % 60e3) / 1e3);
  const pad = (n) => String(n).padStart(2, '0');
  if (h) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

/* Découpe une ligne de journal en segments : texte, joueur {p:N}, météo {w:key} ou icône {i:key} (clé de ICONS) */
export function parseLine(line) {
  return line.split(/(\{[pwi]:[a-zA-Z0-9]+\})/).filter(Boolean).map((part) => {
    const m = part.match(/^\{([pwi]):([a-zA-Z0-9]+)\}$/);
    if (!m) return { text: part };
    if (m[1] === 'p') return { player: Number(m[2]) };
    return m[1] === 'w' ? { weather: m[2] } : { icon: m[2] };
  });
}
