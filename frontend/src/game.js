// Constantes d'affichage du jeu (les règles elles-mêmes vivent côté serveur)

export const WEATHER = {
  calm:      { label: 'Calme',     icon: '☾', color: 'var(--cyan)',  desc: 'Aucun effet' },
  storm:     { label: 'Tempête',   icon: '⚡', color: 'var(--amber)', desc: '−1 batterie pour tous' },
  abundance: { label: 'Abondance', icon: '☀', color: 'var(--lime)',  desc: 'Génération ×2, Pacte ×2,5' },
};

export const ACTIONS = [
  { key: 'gen',  name: 'Générer',    icon: '⚛', tag: 'Soi-même',   color: '#9dff4a', desc: 'Dépense X → rapporte ⌊X × 1,5⌋ au tour suivant.' },
  { key: 'def',  name: 'Défendre',   icon: '⬡', tag: 'Soi-même',   color: '#00f0ff', desc: 'Dépense X → X points de Bouclier actifs 3 tours.' },
  { key: 'atk',  name: 'Attaquer',   icon: '✦', tag: 'Un joueur',  color: '#ff4d6d', target: 'atkTarget', desc: 'Perce le Bouclier. Le surplus revient et vole autant.' },
  { key: 'pact', name: 'Pacte',      icon: '∞', tag: 'Un joueur',  color: '#8a7dff', target: 'pact', noAmount: true, desc: 'Ni Attaque ni Défense ce tour. Si réciproque : Génération ×2.' },
  { key: 'xfer', name: 'Transférer', icon: '⇄', tag: 'Un joueur',  color: '#ffb020', target: 'xferTarget', desc: 'Envoie X batteries, reçues au tour suivant.' },
  { key: 'bid',  name: 'Enchère',    icon: '◈', tag: 'La réserve', color: '#ff2bd6', desc: 'Mise secrète. Gagnant : paie. Perdant : remboursé.' },
];

export const emptyOrders = () => ({ gen: 0, def: 0, atk: 0, atkTarget: null, pact: null, xfer: 0, xferTarget: null, bid: 0 });
export const spent = (o) => o.gen + o.def + o.atk + o.xfer + o.bid;
export const shieldTotal = (p) => (p.shields || []).reduce((s, l) => s + l.amount, 0);

export function timeLeft(deadline, now = Date.now()) {
  const ms = Math.max(0, deadline - now);
  const h = Math.floor(ms / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  const s = Math.floor((ms % 60e3) / 1e3);
  const pad = (n) => String(n).padStart(2, '0');
  if (h) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

/* Découpe une ligne de journal en segments : texte, joueur {p:N} ou météo {w:key} */
export function parseLine(line) {
  return line.split(/(\{[pw]:[a-z0-9]+\})/).filter(Boolean).map((part) => {
    const m = part.match(/^\{([pw]):([a-z0-9]+)\}$/);
    if (!m) return { text: part };
    return m[1] === 'p' ? { player: Number(m[2]) } : { weather: m[2] };
  });
}
