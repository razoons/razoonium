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
          <li>Les dômes encore allumés passent <b>toujours devant</b> les dômes éteints, quel que soit leur Razoonium.</li>
          <li>Si un seul dôme reste allumé avant la fin, la partie s'arrête et ce joueur gagne.</li>
        </ul>
        <h3>Classement</h3>
        <ol>
          <li>Dômes encore allumés d'abord.</li>
          <li>Puis le plus de <b class="teal">Razoonium</b>.</li>
          <li>Égalité : le plus de Batteries, puis le plus de Bouclier.</li>
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
          <li>Si tu finis un tour à <b class="red">0 Batterie ou moins</b>, ton dôme s'éteint : tu ne joues plus, mais ton Razoonium reste compté (derrière les dômes allumés).</li>
        </ul>
        <div class="ex warn">
          Si tu engages toutes tes Batteries, le coût de vie te fait passer à −1. Seuls tes gains du tour (Génération,
          attaque restituée, pillage) peuvent alors te sauver. Garde une marge, surtout en cas de Tempête (−1 de plus).
        </div>
        <h3><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> Razoonium</h3>
        <ul>
          <li>C'est <b>ton score</b>.</li>
          <li>On l'obtient en <b>raffinant</b> des Batteries (1 Batterie → 1 Razoonium) ou en <b>remportant un lot d'Enchère</b>.</li>
          <li>Il est <b>définitif</b> : il ne se dépense pas, ne se perd pas et <b>ne peut pas être volé</b>.</li>
          <li>Une Batterie raffinée ne sert plus à agir, survivre ou se défendre. Tout l'enjeu est de choisir <b>quand</b> transformer ta puissance en score.</li>
        </ul>
        <div class="ex warn">
          Le raffinage se fait <b>en fin de tour, après les attaques</b> : les Batteries misées en Raffinage
          <b class="red">peuvent être pillées</b> (en dernier, après ta réserve et ta Génération). Seul ce qui reste de la
          mise devient du Razoonium.
        </div>
        <h3>Réserve libre</h3>
        <ul>
          <li>Les Batteries que tu n'engages dans aucune action forment ta <b>réserve libre</b>.</li>
          <li>Elle paie le coût de vie et c'est <b class="red">la première cible du pillage</b>.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="ptitle">03 · Tour de jeu</div>
        <ul>
          <li>Chaque tour dure un temps fixé à la création de la partie (<b>24h, 12h, 6h ou 1h</b>).</li>
          <li>Avant l'échéance, répartis tes Batteries <b>en secret</b> entre les 7 actions. Tu peux en combiner plusieurs dans le même tour, sans dépasser ce que tu possèdes.</li>
          <li>Tes ordres restent modifiables jusqu'à la résolution.</li>
          <li>Avec la <b>résolution anticipée</b>, le tour est résolu dès que tous les dômes allumés ont validé.</li>
          <li>Sans ordre validé, ton dôme ne fait rien : tout reste en réserve.</li>
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
          <li>Multiplicateur : <b class="lime">×1,5</b>, <b class="lime">×2</b> avec un Pacte scellé.</li>
          <li>En <b>Abondance</b> : <b class="lime">×2</b>, et <b class="lime">×2,5</b> avec un Pacte scellé.</li>
          <li>La mise en Génération <b class="red">peut être pillée</b> : le rendement est calculé sur ce qu'il en reste après les attaques.</li>
        </ul>
        <div class="ex">
          <b>Exemple</b> : tu mets 6 en Génération. Sans attaque, tu récupères ⌊6 × 1,5⌋ = <b>9</b> (+3).
          Si on te pille 2 Batteries dans ta Génération, tu ne récupères que ⌊4 × 1,5⌋ = <b>6</b>.
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">05 · Défendre</div>
        <ul>
          <li>Chaque Batterie en Défense crée <b>1 point de Bouclier</b>.</li>
          <li>Un Bouclier posé le jour J est <b>actif dès ce tour</b> et protège pendant les tours J, J+1 et J+2, puis il expire.</li>
          <li>Chaque point de dégât détruit 1 point de Bouclier, <b>les plus anciens d'abord</b>.</li>
          <li>Les Boucliers ne sont pas pillables.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="ptitle">06 · Attaquer & piller</div>
        <p>Tu ne peux attaquer qu'<b>un seul joueur par tour</b>. Avec X Batteries d'attaque :</p>
        <ol style="margin-top:8px">
          <li>Celles qui servent à casser le Bouclier de la cible sont <b class="red">perdues</b>.</li>
          <li>Celles qui le dépassent (<b>dégâts nets</b>) te sont <b class="lime">restituées</b> en fin de tour.</li>
          <li>Chaque dégât net <b>vole 1 Batterie</b> à la cible : d'abord dans sa <b>réserve libre</b> (y compris mises d'enchère remboursées et transferts reçus ce tour), puis dans sa <b>Génération</b>, puis dans son <b>Raffinage</b>.</li>
          <li>On ne vole que ce qui existe : Boucliers, Razoonium déjà acquis, mises d'enchère gagnantes, attaques et transferts envoyés sont hors d'atteinte.</li>
        </ol>
        <p style="margin-top:10px">
          <b>Plusieurs attaquants</b> sur la même cible : leurs attaques s'additionnent pour casser le Bouclier, puis
          dégâts nets et butin sont répartis au prorata de la mise de chacun.
        </p>
        <div class="ex">
          <b>Exemple</b> : tu attaques Nat avec <b>7</b>. Nat a un Bouclier de 3, une réserve libre de 2 et 5 en Génération.
          <ul>
            <li>3 Batteries cassent son Bouclier et sont perdues.</li>
            <li>Les 4 restantes te reviennent et volent 4 Batteries : 2 dans sa réserve, puis 2 dans sa Génération.</li>
            <li>Tu finis le tour à <b class="lime">+8</b> (4 restituées + 4 volées) pour 7 engagées.</li>
            <li>Nat génère sur les 3 restantes : ⌊3 × 1,5⌋ = 4 au lieu de 7.</li>
          </ul>
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">07 · Pacte</div>
        <ul>
          <li>Proposer un Pacte <b>ne coûte aucune Batterie</b>. Un seul Pacte par tour.</li>
          <li><b>Engagement</b> : accepté ou non, tu ne peux <b class="red">ni attaquer ni défendre</b> ce tour.</li>
          <li><b>Exposition</b> : tes Boucliers sont <b class="red">inactifs</b> pendant ce tour. Toute attaque te pille directement, sans rien casser. Tes Boucliers ne sont pas abîmés et redeviennent actifs au tour suivant.</li>
          <li><b>Pacte scellé</b> : uniquement si les deux joueurs se proposent mutuellement le Pacte. Les deux alliés ont une Génération <b class="lime">×2</b> (×2,5 en Abondance).</li>
          <li>Pacte non réciproque : pas de bonus, mais l'engagement et l'exposition s'appliquent quand même.</li>
        </ul>
        <div class="ex warn">
          <b>Trahison</b> : proposer un Pacte, c'est se mettre à nu. Ton « allié » peut ne pas jouer le Pacte et
          t'attaquer, ou prévenir un autre joueur et partager le butin avec lui par Transfert.
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">08 · Transférer</div>
        <ul>
          <li>Tu envoies X Batteries à <b>un seul joueur</b> par tour.</li>
          <li>Il les reçoit <b>pendant le tour, avant les attaques</b>, dans sa réserve libre : elles <b class="red">peuvent être pillées</b> ce tour-ci.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="ptitle">09 · Enchère quotidienne</div>
        <ul>
          <li><b>⌊joueurs encore en jeu / 2⌋</b> lots de <b class="teal">Razoonium</b> (2 à 8 chacun), visibles par tous et triés du plus gros au plus petit.</li>
          <li>Les joueurs sont classés par <b>mise décroissante</b> : le 1ᵉʳ remporte le 1ᵉʳ lot, le 2ᵉ le 2ᵉ lot, etc.</li>
          <li>Les gagnants <b>paient leur mise</b> et le Razoonium s'ajoute <b>directement à leur score</b> (imprenable).</li>
          <li>Les perdants sont <b>remboursés</b> dans leur réserve libre, donc pillable ce tour-ci.</li>
          <li>Égalité de mise : le joueur qui avait le moins de Batteries en début de tour passe devant.</li>
        </ul>
        <div class="ex">
          <b>Exemple</b> : lots du jour 6 et 3. Tristan mise 4, Nat 2, Basto 2 (Nat a moins de Batteries que Basto).
          Tristan paie 4 et gagne <b class="teal">6 Razoonium</b>. Nat paie 2 et gagne <b class="teal">3 Razoonium</b>.
          Basto récupère ses 2 Batteries.
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">10 · Météo (D6)</div>
        <p style="margin-bottom:12px">Lancée à chaque résolution : personne ne la connaît au moment de donner ses ordres.</p>
        <div class="wtable">
          <div><span class="d">1-2</span><b style="color:var(--cyan)"><v-icon class="mi" size="1.1em" :icon="WEATHER.calm.icon" /> Calme</b><span>Aucun effet</span></div>
          <div><span class="d">3-4</span><b style="color:var(--amber)"><v-icon class="mi" size="1.1em" :icon="WEATHER.storm.icon" /> Tempête</b><span>−1 <v-icon class="mi" size="1.1em" :icon="ICONS.battery" /> supplémentaire pour tous</span></div>
          <div><span class="d">5-6</span><b style="color:var(--lime)"><v-icon class="mi" size="1.1em" :icon="WEATHER.abundance.icon" /> Abondance</b><span>Génération ×2 · Pacte ×2,5</span></div>
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">11 · Ordre de résolution</div>
        <ol>
          <li><b>Coût de vie</b> : −1 Batterie par dôme.</li>
          <li><b>Météo</b> : lancer du dé (−1 de plus en Tempête).</li>
          <li><b>Pactes</b> : vérification de la réciprocité ; Boucliers des proposants inactifs pour ce tour.</li>
          <li><b>Boucliers</b> : nouveaux Boucliers actifs immédiatement.</li>
          <li><b>Enchères</b> : lots de Razoonium attribués, mises perdantes remboursées dans la réserve.</li>
          <li><b>Transferts</b> : arrivée dans la réserve du destinataire.</li>
          <li><b>Attaques</b> : Boucliers cassés (les plus anciens d'abord), puis pillage de la réserve, puis de la Génération, puis du Raffinage.</li>
          <li><b>Expiration</b> des Boucliers posés il y a 3 tours.</li>
          <li><b>Raffinage & Génération</b> sur les mises restantes, plus les Batteries d'attaque restituées et le butin.</li>
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
