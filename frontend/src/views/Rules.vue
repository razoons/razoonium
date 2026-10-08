<template>
  <div class="page narrow rules">
    <div class="stack">
      <div class="panel">
        <h1 class="hero-title">RÈGLES DU JEU</h1>
        <p class="sub" style="margin-bottom:0">
          Stratégie tour par tour quotidien (24h) pour <b>4 à 8 joueurs</b>. Survivre <b>15 jours</b> ou être le dernier
          dôme debout. Le plus de <b class="lime">Batteries</b> à la fin du 15ᵉ jour l'emporte.
        </p>
      </div>

      <div class="panel">
        <div class="ptitle">01 · Ressource & survie</div>
        <ul>
          <li>Stock initial : <b class="lime">10 Batteries</b>.</li>
          <li>Coût de vie : <b>−1 Batterie</b> consommée automatiquement à chaque tour.</li>
          <li>À <b class="red">0 Batterie</b>, ton dôme s'éteint : tu es éliminé.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="ptitle">02 · Ordres secrets</div>
        <p>Chaque jour, avant l'échéance, répartis tes Batteries en secret entre 6 actions :</p>
        <div class="actions" style="margin-top:12px">
          <div v-for="a in ACTIONS" :key="a.key" class="acard on" :style="{ '--a': a.color }">
            <div class="hd">
              <div class="ic"><span>{{ a.icon }}</span></div>
              <div><div class="nm">{{ a.name }}</div><div class="tg">{{ a.tag }}</div></div>
            </div>
            <div class="ds">{{ a.desc }}</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">03 · Combats & alliances</div>
        <h3>Défense persistante</h3>
        <ul>
          <li>Chaque Batterie en Défense crée 1 point de Bouclier actif pendant <b>3 tours</b>.</li>
          <li>Chaque point de dégât détruit 1 point de Bouclier, <b>les plus anciens d'abord</b>.</li>
        </ul>
        <h3>Attaque & pillage</h3>
        <ul>
          <li>Les Batteries qui cassent le Bouclier adverse sont <b class="red">perdues</b>.</li>
          <li>Celles qui le dépassent te sont <b class="lime">restituées</b> et volent chacune 1 Batterie à la cible : dans sa réserve libre, puis dans sa mise en <b>Génération</b>.</li>
          <li>La Génération est calculée <b>après</b> les attaques, sur la mise restante.</li>
          <li>Plusieurs attaquants sur une même cible : Boucliers entamés en commun, pillage au prorata.</li>
        </ul>
        <h3>Pacte</h3>
        <ul>
          <li>Proposer un pacte interdit d'<b class="red">attaquer et de défendre</b> ce tour, réciproque ou non. Tes Boucliers existants restent actifs.</li>
          <li>Si les deux joueurs se ciblent mutuellement : Génération <b class="lime">×2</b>. Sinon, rendement normal.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="ptitle">04 · Enchère quotidienne</div>
        <ul>
          <li>⌊joueurs / 2⌋ lots de Batteries, visibles par tous, triés par valeur décroissante.</li>
          <li>Le plus gros miseur prend le 1ᵉʳ lot, le 2ᵉ le 2ᵉ lot, etc.</li>
          <li>Les gagnants <b>paient leur mise</b>, les perdants sont <b>remboursés</b>.</li>
          <li>Égalité : le joueur le plus pauvre passe devant.</li>
        </ul>
      </div>

      <div class="panel">
        <div class="ptitle">05 · Météo (D6)</div>
        <div class="wtable">
          <div><span class="d">1-2</span><b style="color:var(--cyan)">☾ Calme</b><span>Aucun effet</span></div>
          <div><span class="d">3-4</span><b style="color:var(--amber)">⚡ Tempête</b><span>−1 🔋 supplémentaire pour tous</span></div>
          <div><span class="d">5-6</span><b style="color:var(--lime)">☀ Abondance</b><span>Génération ×2 · Pacte ×2,5</span></div>
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">06 · Ordre de résolution</div>
        <ol>
          <li>Paiement du coût de vie</li>
          <li>Tirage de la météo</li>
          <li>Résolution des enchères</li>
          <li>Vérification des pactes</li>
          <li>Résolution des attaques</li>
          <li>Expiration des boucliers</li>
          <li>Récoltes & réceptions (génération, pillage, transferts)</li>
        </ol>
      </div>

      <router-link :to="auth.token ? '/' : '/login'" class="btn primary block">Entrer dans l'arène ▸</router-link>
    </div>
  </div>
</template>

<script setup>
import { ACTIONS } from '../game';
import { auth } from '../stores/auth';
</script>

<style scoped>
.rules ul, .rules ol { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; color: var(--soft); font-size: 16px; }
.rules p { color: var(--soft); margin: 0; }
.rules h3 { font-size: 13px; color: var(--cyan); margin: 16px 0 8px; text-transform: uppercase; }
.rules h3:first-of-type { margin-top: 0; }
.rules b { color: var(--text); }
.rules .lime { color: var(--lime); }
.rules .red { color: var(--red); }
</style>
