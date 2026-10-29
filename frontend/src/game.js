// Constantes d'affichage du jeu (les règles elles-mêmes vivent côté serveur)

export const TURN_CHOICES = [60, 180, 900, 7200, 43200];

export function duration(sec) {
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  return `${Math.round(sec / 3600)} h`;
}

export const PHASES = {
  order: 'Le Tueur choisit son moment…',
  action: 'Les ombres bougent',
};

export function timeLeft(deadline, now = Date.now()) {
  const ms = Math.max(0, deadline - now);
  const h = Math.floor(ms / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  const s = Math.floor((ms % 60e3) / 1e3);
  const pad = (n) => String(n).padStart(2, '0');
  if (h) return `${h}h ${pad(m)}m`;
  return `${m}m ${pad(s)}s`;
}

const TOKENS = /(\{[pr]:[a-z0-9_]+\})/;

/* Découpe une ligne de journal en segments : texte, joueur {p:N} ou salle {r:id} */
export function parseLine(line) {
  return line.split(TOKENS).filter(Boolean).map((part) => {
    const m = part.match(/^\{([pr]):([a-z0-9_]+)\}$/);
    if (!m) return { text: part };
    return m[1] === 'p' ? { player: Number(m[2]) } : { room: m[2] };
  });
}

/* Icône d'une ligne de journal selon son contenu */
export function lineIcon(e) {
  if (e.all) return 'mdi-eye-outline'; // récit omniscient (mort autorisé à tout voir)
  if (e.noise) return 'mdi-ear-hearing';
  if (e.blackout || /noir/.test(e.text)) return 'mdi-weather-night';
  if (/frappe|blesse|coup|mort|effondre|cri/.test(e.text)) return 'mdi-water';
  if (/cache/.test(e.text)) return 'mdi-eye-off-outline';
  if (/position/.test(e.text)) return 'mdi-sort-numeric-ascending';
  if (/entre|quitte|rends|pas /.test(e.text)) return 'mdi-shoe-print';
  return 'mdi-candle';
}
