<template>
  <div class="page narrow rules">
    <div class="stack">
      <div class="panel">
        <h1 class="hero-title">RÈGLES DU JEU</h1>
        <p class="sub" style="margin-bottom:0">
          Stratégie au tour par tour pour <b>4 à 8 joueurs</b>. Chaque joueur dirige un <b>dôme</b> alimenté par des
          <b class="lime">Batteries</b>. Chaque jour, tout le monde donne ses ordres en secret, puis le tour est résolu
          pour tous en même temps.
        </p>
      </div>

      <div class="panel">
        <div class="ptitle">01 · But du jeu</div>
        <ul>
          <li>La partie dure <b>15 jours</b> (15 tours) par défaut ; le créateur peut choisir de 5 à 30 tours.</li>
          <li>À la fin, le joueur qui possède le plus de <b class="teal">Razoonium</b> gagne.</li>
          <li>Un dôme éteint reste classé <b>selon son Razoonium</b>, comme les autres : s'éteindre arrête ta progression, pas ton score.</li>
          <li>Si un seul dôme reste allumé avant la fin, la partie s'arrête ; le classement se fait alors au Razoonium.</li>
        </ul>
        <h3>Classement</h3>
        <ol>
          <li>Le plus de <b class="teal">Razoonium</b>, dômes éteints compris.</li>
          <li>Égalité : un dôme encore allumé passe devant un dôme éteint, puis le plus de Batteries.</li>
          <li>Entre dômes éteints : celui qui a tenu le plus longtemps passe devant.</li>
        </ol>
      </div>

      <div class="panel">
        <div class="ptitle">02 · Ressources</div>
        <h3><v-icon class="mi" size="1.1em" :icon="ICONS.battery" /> Batteries</h3>
        <ul>
          <li>Stock initial : <b class="lime">10 Batteries</b>.</li>
          <li>C'est la ressource que tu dépenses pour agir. Elle peut être <b class="red">volée</b>.</li>
          <li>Coût de vie : ton dôme consomme <b>1 Batterie</b> à chaque tour.</li>
          <li>Si tu finis un tour à <b class="red">0 Batterie ou moins</b>, ton dôme s'éteint : tu ne joues plus, mais ton Razoonium reste compté au classement.</li>
        </ul>
        <div class="ex warn">
          Si tu engages toutes tes Batteries, le coût de vie te fait passer à −1. Seuls tes gains du tour (Génération,
          attaque restituée, pillage) peuvent alors te sauver. Garde une marge.
        </div>
        <h3><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> Razoonium</h3>
        <ul>
          <li>C'est <b>ton score</b>.</li>
          <li>On l'obtient en <b>raffinant</b> des Batteries (<b>3 Batteries → 1 Razoonium</b> ; le reliquat non raffinable t'est rendu) ou en <b>remportant un lot d'Enchère</b>.</li>
          <li>Il est <b>définitif</b> : il ne se dépense pas, ne se perd pas et <b>ne peut pas être volé</b>.</li>
          <li>Une Batterie raffinée ne sert plus à agir, survivre ou se défendre. Tout l'enjeu est de choisir <b>quand</b> transformer ta puissance en score.</li>
        </ul>
        <div class="ex warn">
          Le raffinage se fait <b>en fin de tour, après les attaques</b> : les Batteries misées en Raffinage
          <b class="red">peuvent être pillées</b> (en dernier, après ta Génération et ta réserve). Seul ce qui reste de la
          mise est raffiné (3 Batteries → 1 Razoonium).
        </div>
        <h3>Réserve libre</h3>
        <ul>
          <li>Les Batteries que tu n'engages dans aucune action forment ta <b>réserve libre</b>.</li>
          <li>Elle paie le coût de vie et elle est <b class="red">pillée juste après ta Génération</b>.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="ptitle">03 · Tour de jeu</div>
        <ul>
          <li>Chaque tour dure un temps fixé à la création de la partie (<b>24h, 12h, 6h ou 1h</b>).</li>
          <li>Avant l'échéance, répartis tes Batteries <b>en secret</b> entre les 6 actions. Tu peux en combiner plusieurs dans le même tour, sans dépasser ce que tu possèdes.</li>
          <li>Tes ordres restent modifiables jusqu'à la résolution.</li>
          <li>Avec la <b>résolution anticipée</b>, le tour est résolu dès que tous les dômes allumés ont validé.</li>
          <li>Sans ordre validé, ton dôme ne fait rien : tout reste en réserve.</li>
          <li>Le <b>journal de bord</b> ne te montre que ce qui te concerne, plus les événements publics (météo, lots révélés, dômes éteints, bilan des Batteries). Batteries et Razoonium de chacun sont publics ; boucliers et ordres des autres restent secrets.</li>
        </ul>
        <div class="actions" style="margin-top:16px">
          <div v-for="a in ACTIONS" :key="a.key" class="acard on" :style="{ '--a': a.color }">
            <div class="hd">
              <div class="ic"><v-icon :icon="a.icon" /></div>
              <div><div class="nm">{{ a.name }}</div><div class="tg">{{ a.tag }}</div></div>
            </div>
            <div class="ds">{{ a.desc }}</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">04 · Générer</div>
        <ul>
          <li>La mise est consommée et remplacée en fin de tour par <b>⌊mise × multiplicateur⌋</b> (arrondi à l'inférieur).</li>
          <li>Multiplicateur : <b class="lime">×2</b> par temps Calme, <b class="red">×1,5</b> en <b>Grisaille</b>, <b class="lime">×3</b> en <b>Abondance</b>.</li>
          <li>Pas de plafond : tu mets ce que tu veux en Génération.</li>
          <li>Mais la mise en Génération est <b class="red">la première pillée</b> : le rendement est calculé sur ce qu'il en reste après les attaques. Plus tu génères, plus tu es une cible.</li>
        </ul>
        <div class="ex">
          <b>Exemple</b> : tu mets 10 en Génération. Sans attaque, tu récupères 10 × 2 = <b>20</b> (+10).
          Si on te pille 4 Batteries dans ta Génération, tu ne récupères que 6 × 2 = <b>12</b>.
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">05 · Défendre</div>
        <ul>
          <li>Chaque Batterie en Défense te donne <b>1 dé de défense</b> pour ce tour.</li>
          <li>Le Bouclier ne dure que <b>le tour où il est posé</b>.</li>
          <li>Chaque dé de défense perdant donne sa Batterie à l'attaquant ; chaque dé gagnant te rapporte la Batterie de l'attaquant.</li>
          <li>Les Batteries de Bouclier sont <b class="red">consommées</b> en fin de tour, qu'elles aient servi ou non.</li>
          <li>Les Boucliers ne sont pas pillables.</li>
        </ul>
        <div class="ex warn">
          <b>Le dilemme</b> : une Batterie en Défense ne génère rien et disparaît. Tu génères à fond en restant exposé,
          ou tu génères moins pour te protéger ?
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">06 · Attaquer & piller</div>
        <p>Tu ne peux attaquer qu'<b>un seul joueur par tour</b>. Chaque Batterie d'attaque te donne <b>1 dé</b> (dés à 6 faces).</p>
        <ol style="margin-top:8px">
          <li>Attaquant et défenseur lancent leurs dés et les <b>trient du plus fort au plus faible</b>.</li>
          <li>On compare les dés <b>un à un, dans l'ordre</b> (le meilleur contre le meilleur…), autant de fois que le camp qui a le moins de dés.</li>
          <li>Dé d'attaque <b>strictement plus fort</b> : l'attaquant garde sa Batterie et <b class="lime">prend la Batterie de Bouclier</b>.</li>
          <li>Sinon (<b>égalité comprise</b>) : le défenseur <b class="red">prend la Batterie d'attaque</b>.</li>
          <li>Chaque dé d'attaque <b>en trop</b> te rend sa Batterie et <b>pille 2 Batteries</b> à la cible : d'abord dans sa <b>Génération</b>, puis dans sa <b>réserve libre</b> (y compris transferts reçus ce tour), puis dans son <b>Raffinage</b>.</li>
          <li>On ne pille que ce qui existe : Boucliers, Razoonium déjà acquis, mises d'enchère, attaques et transferts envoyés sont hors d'atteinte.</li>
        </ol>
        <p style="margin-top:10px">
          <b>Plusieurs attaquants</b> sur la même cible : tous leurs dés d'attaque sont triés ensemble face aux dés de défense.
          À dé égal, passe d'abord celui qui a lancé le plus de dés, puis celui qui a le moins de Batteries.
          Les dés en trop sont les plus faibles du lot.
        </p>
        <div class="ex">
          <b>Exemple</b> : tu attaques Nat avec <b>4</b>, Nat défend avec <b>2</b>, a 3 en Génération et une réserve libre de 3.
          <ul>
            <li>Tes dés : 6 · 4 · 3 · 1. Ceux de Nat : 5 · 4.</li>
            <li>6 contre 5 : tu gagnes et prends 1 Batterie de Bouclier.</li>
            <li>4 contre 4 : égalité, Nat prend 1 de tes Batteries.</li>
            <li>Tes 2 dés en trop (3 et 1) te reviennent et pillent 4 Batteries : les 3 de la Génération de Nat, puis 1 dans sa réserve.</li>
            <li>Tu finis à <b class="lime">+8</b> pour 4 engagées (3 récupérées + 1 Bouclier + 4 pillées). Nat gagne 1 Batterie, perd ses 2 Batteries de Bouclier et ne génère rien.</li>
          </ul>
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">07 · Transférer</div>
        <ul>
          <li>Tu envoies X Batteries à <b>un seul joueur</b> par tour.</li>
          <li>Il les reçoit <b>pendant le tour, avant les attaques</b>, dans sa réserve libre : elles <b class="red">peuvent être pillées</b> ce tour-ci.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="ptitle">08 · Enchère quotidienne</div>
        <ul>
          <li><b>⌊joueurs encore en jeu / 2⌋</b> lots de <b class="teal">Razoonium</b> (0 à 4 chacun). Leur contenu reste <b>caché jusqu'à la résolution</b> ; ils sont triés du plus gros au plus petit.</li>
          <li><b class="red">Tout le monde paie sa mise</b>, gagnant ou perdant.</li>
          <li>Les joueurs sont classés par <b>mise décroissante</b> : le 1ᵉʳ remporte le 1ᵉʳ lot, le 2ᵉ le 2ᵉ lot, etc. Le Razoonium s'ajoute <b>directement au score</b> (imprenable).</li>
          <li>Égalité de mise : le joueur qui avait le moins de Batteries en début de tour passe devant.</li>
        </ul>
        <div class="ex warn">
          <b>Quitte ou double</b> : 1 Razoonium vaut 3 Batteries au raffinage. Miser 4 pour un lot de 4, c'est l'équivalent
          de 12 Batteries ; pour un lot de 0, ou si on te passe devant, tu perds tout.
        </div>
        <div class="ex">
          <b>Exemple</b> : 2 lots, révélés à la résolution : 3 et 0. Tristan mise 4, Nat 2, Basto 2 (Nat a moins de Batteries que Basto).
          Tristan paie 4 et gagne <b class="teal">3 Razoonium</b>. Nat paie 2 et ne gagne rien (lot vide).
          Basto paie 2 et ne gagne rien.
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">09 · Météo (D6)</div>
        <p style="margin-bottom:12px">Lancée à chaque résolution : personne ne la connaît au moment de donner ses ordres.</p>
        <div class="wtable">
          <div><span class="d">1</span><b style="color:var(--amber)"><v-icon class="mi" size="1.1em" :icon="WEATHER.gloom.icon" /> Grisaille</b><span>Génération ×1,5</span></div>
          <div><span class="d">2-5</span><b style="color:var(--cyan)"><v-icon class="mi" size="1.1em" :icon="WEATHER.calm.icon" /> Calme</b><span>Génération ×2</span></div>
          <div><span class="d">6</span><b style="color:var(--lime)"><v-icon class="mi" size="1.1em" :icon="WEATHER.abundance.icon" /> Abondance</b><span>Génération ×3</span></div>
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">10 · Ordre de résolution</div>
        <ol>
          <li><b>Coût de vie</b> : −1 Batterie par dôme.</li>
          <li><b>Météo</b> : lancer du dé, qui fixe le multiplicateur de Génération.</li>
          <li><b>Enchères</b> : toutes les mises sont payées, les lots sont révélés et attribués.</li>
          <li><b>Transferts</b> : arrivée dans la réserve du destinataire.</li>
          <li><b>Attaques</b> : lancers de dés et duels, puis pillage par les dés en trop, 2 Batteries chacun (Génération, puis réserve, puis Raffinage).</li>
          <li><b>Boucliers</b> : les Batteries de Bouclier restantes sont consommées.</li>
          <li><b>Raffinage & Génération</b> sur les mises restantes, plus les Batteries gagnées et le butin.</li>
          <li><b>Bilan</b> : tout dôme à 0 Batterie ou moins s'éteint.</li>
        </ol>
      </div>

      <router-link :to="auth.token ? '/' : '/login'" class="btn primary block">Entrer dans l'arène ▸</router-link>
    </div>
  </div>
</template>

<script setup>
import { ACTIONS, WEATHER, ICONS } from '../game';
import { auth } from '../stores/auth';
</script>

<style scoped>
.rules ul, .rules ol { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; color: var(--soft); font-size: 16px; }
.rules p { color: var(--soft); margin: 0; }
.rules h3 { font-size: 13px; color: var(--cyan); margin: 16px 0 8px; text-transform: uppercase; }
.rules .ptitle + h3 { margin-top: 0; }
.rules b { color: var(--text); }
.rules .lime { color: var(--lime); }
.rules .red { color: var(--red); }
.rules .teal { color: #2bffc6; }
.rules .ex { margin-top: 14px; padding: 10px 14px; border-left: 3px solid var(--cyan); background: rgba(0,240,255,.06); color: var(--soft); font-size: 15px; line-height: 1.45; }
.rules .ex ul { margin-top: 6px; font-size: 15px; gap: 4px; }
.rules .ex.warn { border-left-color: var(--amber); background: rgba(255,176,32,.07); }
</style>
