<template>
  <div class="page narrow rules">
    <div class="stack">
      <div class="panel">
        <h1 class="hero-title">RÈGLES DU JEU</h1>
        <p class="sub" style="margin-bottom:0">
          Troc, négociation et trahison pour <b>4 à 8 joueurs</b>, dans un dôme cyberpunk en pénurie.
          Chacun produit <b>une seule ressource</b>, et il en faut plusieurs pour marquer des points : il faut donc négocier.
          Pas de victoire coopérative, il n'y a qu'<b class="red">un seul vainqueur</b>.
        </p>
      </div>

      <div class="panel">
        <div class="ptitle">01 · But du jeu</div>
        <ul>
          <li>La partie dure <b>10 jours</b> (10 tours) par défaut ; le créateur peut choisir de 5 à 30 tours.</li>
          <li>À la fin, le joueur qui possède le plus de <b class="teal">Razoonium</b> gagne.</li>
          <li>Le Razoonium s'obtient en <b>raffinant la Recette du Tour</b>. Une fois acquis, il est définitif et ne peut pas être volé.</li>
          <li>Égalité : le plus gros stock de ressources passe devant.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="ptitle">02 · Rôles & ressources</div>
        <ul>
          <li>Il y a <b>autant de ressources que de joueurs</b>.</li>
          <li>Au lancement, chacun reçoit au hasard un <b>rôle unique</b> qui produit <b>sa ressource attitrée</b> :</li>
        </ul>
        <div class="roles">
          <div v-for="r in RESOURCES" :key="r.name" :style="{ '--c': r.color }">
            <v-icon :icon="r.icon" size="18" /> <b>{{ r.role }}</b> <span>{{ r.name }}</span>
          </div>
        </div>
        <ul style="margin-top:12px">
          <li><b>Production</b> : au début de chaque tour, chaque rôle produit <b class="lime">3 unités</b> de sa ressource.</li>
          <li><b>Stock initial</b> : 1 unité de chaque ressource des autres rôles.</li>
          <li><b>Limite d'inventaire : 12</b>. En fin de tour, le surplus part au Marché Noir (la ressource la plus abondante d'abord).</li>
          <li>Les stocks sont <b>publics</b> : chacun voit ce que les autres possèdent.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="ptitle">03 · La Recette du Tour</div>
        <ul>
          <li>Une nouvelle recette est révélée <b>au début de chaque tour</b>, jamais la même deux fois de suite.</li>
          <li>Elle demande <b>3 ressources différentes</b>, pour <b>4 à 5 ingrédients</b> au total (2 au plus de chaque).</li>
        </ul>
        <div class="ex">
          <b>Exemple</b> : 2 Plasma + 1 Spores + 1 Données = <b class="teal">1 Razoonium</b>.
          Comme la recette change à chaque tour, les alliances ne durent pas : il faut sans cesse changer de partenaires.
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">04 · Le Troc</div>
        <ul>
          <li>Pendant le tour, tu peux <b>donner</b> à tout moment n'importe quelle quantité de tes ressources à un autre joueur.</li>
          <li>Le don est <b>immédiat et irréversible</b>.</li>
          <li>Les dons ne sont visibles que du donneur et du receveur, mais les stocks restent publics.</li>
          <li>Les ressources engagées au Marché Noir (ordre validé) ne peuvent pas être données.</li>
        </ul>
        <div class="ex warn">
          <b>Rien ne garantit la contrepartie.</b> Promesses, échanges, chantage et trahisons se négocient sur le chat.
          Qui donne en premier ?
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">05 · Le Marché Noir</div>
        <p>Ordres <b>secrets</b>, exécutés en fin de tour. Tu choisis toi-même <b>quelles ressources payer</b>.</p>
        <div class="actions" style="margin-top:14px">
          <div class="acard on" style="--a:var(--red)">
            <div class="hd">
              <div class="ic"><v-icon :icon="ICONS.raid" /></div>
              <div><div class="nm">Pillage</div><div class="tg">3 → 1 volée</div></div>
            </div>
            <div class="ds">Paie 3 ressources pour voler 1 ressource au hasard dans le stock d'un rival. Tu peux piller plusieurs fois. La victime sait qui l'a pillée.</div>
          </div>
          <div class="acard on" style="--a:var(--magenta)">
            <div class="hd">
              <div class="ic"><v-icon :icon="ICONS.lotto" /></div>
              <div><div class="nm">Loterie</div><div class="tg">2 → 1 au hasard</div></div>
            </div>
            <div class="ds">Paie 2 ressources pour piocher 1 ressource au hasard dans la réserve. Ta mise y entre avant le tirage : tu peux retomber dessus.</div>
          </div>
          <div class="acard on" style="--a:#2bffc6">
            <div class="hd">
              <div class="ic"><v-icon :icon="ICONS.refine" /></div>
              <div><div class="nm">Raffiner</div><div class="tg">Score</div></div>
            </div>
            <div class="ds">Indique combien de fois tu veux réunir la recette. Elle est raffinée après le Marché Noir, dans la limite de ton stock.</div>
          </div>
        </div>
        <p style="margin-top:14px">
          La <b>réserve du Marché Noir</b> commence avec 2 unités de chaque ressource. Elle se remplit avec les paiements,
          les ingrédients raffinés et les surplus d'inventaire. Son contenu est public.
        </p>
      </div>

      <div class="panel">
        <div class="ptitle">06 · Déroulement d'un tour</div>
        <p style="margin-bottom:8px">Chaque tour dure un temps fixé à la création de la partie (<b>24h, 12h, 6h ou 1h</b>).</p>
        <ol>
          <li><b>Production & Recette</b> : la nouvelle recette est révélée, chaque rôle produit sa ressource.</li>
          <li><b>Négociation & Troc</b> : pendant tout le tour, on négocie et on se fait des dons.</li>
          <li><b>Ordres secrets</b> : Pillages, Loterie, leur paiement, et le nombre de raffinages voulus. Modifiables jusqu'à la résolution.</li>
          <li>
            <b>Résolution</b> à l'échéance (ou dès que tout le monde a validé, avec la résolution anticipée) :
            paiements du Marché Noir → <b class="red">pillages</b> dans un ordre aléatoire → <b>loterie</b> →
            <b class="teal">raffinage</b> → limite d'inventaire.
          </li>
          <li><b>Fin de tour</b> : les scores sont mis à jour, un nouveau tour commence.</li>
        </ol>
        <div class="ex">
          Les ressources volées ou piochées arrivent <b>avant</b> le raffinage : un pillage réussi peut compléter ta recette.
        </div>
        <div class="ex warn">
          Un paiement devenu impossible annule tes Pillages et ta Loterie (pas ton Raffinage).
        </div>
      </div>

      <router-link :to="auth.token ? '/' : '/login'" class="btn primary block">Entrer dans l'arène ▸</router-link>
    </div>
  </div>
</template>

<script setup>
import { ICONS } from '../game';
import { auth } from '../stores/auth';

// Rôles affichés à titre indicatif (la liste fait foi côté serveur)
const RESOURCES = [
  { name: 'Ferraille',  role: 'Ferrailleur',      icon: 'mdi-cog',              color: '#c9a27a' },
  { name: 'Plasma',     role: 'Ingénieur plasma', icon: 'mdi-flash',            color: '#ffe53b' },
  { name: 'Spores',     role: 'Botaniste',        icon: 'mdi-sprout',           color: '#9dff4a' },
  { name: 'Données',    role: 'Netrunner',        icon: 'mdi-database',         color: '#00f0ff' },
  { name: 'Cristaux',   role: 'Mineur',           icon: 'mdi-hexagon-multiple', color: '#c45bff' },
  { name: 'Eau lourde', role: 'Hydrologue',       icon: 'mdi-water',            color: '#3d7bff' },
  { name: 'Biogel',     role: 'Médic',            icon: 'mdi-flask',            color: '#ff5470' },
  { name: 'Nanites',    role: 'Nanotechnicien',   icon: 'mdi-chip',             color: '#ff6a00' },
];
</script>

<style scoped>
.rules ul, .rules ol { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; color: var(--soft); font-size: 16px; }
.rules p { color: var(--soft); margin: 0; }
.rules b { color: var(--text); }
.rules .lime { color: var(--lime); }
.rules .red { color: var(--red); }
.rules .teal { color: #2bffc6; }
.rules .ex { margin-top: 14px; padding: 10px 14px; border-left: 3px solid var(--cyan); background: rgba(0,240,255,.06); color: var(--soft); font-size: 15px; line-height: 1.45; }
.rules .ex.warn { border-left-color: var(--amber); background: rgba(255,176,32,.07); }
.roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; margin-top: 10px; }
.roles div { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-left: 3px solid var(--c); color: var(--c); background: color-mix(in srgb, var(--c) 6%, transparent); }
.roles b { color: var(--c); }
.roles span { color: var(--soft); margin-left: auto; }
</style>
