// Constantes d'affichage du jeu (les règles elles-mêmes vivent côté serveur)

// Icônes Material Design (https://pictogrammers.com/library/mdi/)
export const ICONS = {
  razoonium: 'mdi-diamond-stone',
  stock:     'mdi-package-variant-closed',
  recipe:    'mdi-flask-outline',
  refine:    'mdi-flask-outline',
  raid:      'mdi-sword',
  lotto:     'mdi-dice-multiple',
  market:    'mdi-store-alert-outline',
  gift:      'mdi-gift-outline',
  timer:     'mdi-timer-outline',
  trophy:    'mdi-trophy',
};

const zeros = (n) => Array(n).fill(0);
export const total = (v) => (v || []).reduce((a, b) => a + b, 0);

/* Ordres secrets : paiement du Marché Noir, pillages par cible, tirages de loterie, raffinages */
export const emptyOrders = (n) => ({ pay: zeros(n), raids: zeros(n), lotto: 0, refine: 0 });

/* Nombre de fois qu'un stock permet de réunir la recette */
export const refinable = (inv, recipe) => Math.min(...recipe.map((q, k) => (q ? Math.floor(inv[k] / q) : Infinity)));

export function timeLeft(deadline, now = Date.now()) {
  const ms = Math.max(0, deadline - now);
  const h = Math.floor(ms / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  const s = Math.floor((ms % 60e3) / 1e3);
  const pad = (n) => String(n).padStart(2, '0');
  if (h) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

const TOKENS = /(\{[pri]:[a-zA-Z0-9]+\})/;

/* Découpe une ligne de journal en segments : texte, joueur {p:N}, ressource {r:K} ou icône {i:clé} (clé de ICONS) */
export function parseLine(line) {
  return line.split(TOKENS).filter(Boolean).map((part) => {
    const m = part.match(/^\{([pri]):([a-zA-Z0-9]+)\}$/);
    if (!m) return { text: part };
    if (m[1] === 'p') return { player: Number(m[2]) };
    if (m[1] === 'r') return { resource: Number(m[2]) };
    return { icon: m[2] };
  });
}
