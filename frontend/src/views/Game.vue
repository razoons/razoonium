<template>
  <div class="page">
    <v-progress-linear v-if="!g" indeterminate color="primary" />

    <!-- ── Salle d'attente ─────────────────────────────────────────── -->
    <div v-else-if="g.status === 'lobby'" class="narrow" style="max-width:640px;margin:0 auto">
      <div class="panel" style="padding:24px">
        <h1 class="hero-title" style="font-size:24px">{{ g.name }}</h1>
        <p class="sub">
          {{ g.maxDays }} tours de {{ g.turnHours }}h · {{ g.minPlayers }} à {{ g.maxPlayers }} dômes
          <template v-if="g.earlyResolve"> · résolution anticipée</template>
        </p>
        <div class="ptitle">Code d'accès</div>
        <div class="codebox" title="Copier / partager" @click="share">{{ g.code }}</div>
        <div class="ptitle">Dômes connectés <span class="tag">{{ g.players.length }}/{{ g.maxPlayers }}</span></div>
        <div class="plist" style="flex-direction:column;margin-bottom:20px">
          <div
            v-for="(p, i) in g.players" :key="p.uid"
            :class="['pcard', { me: i === g.me }]" :style="{ '--c': p.color || g.palette?.[i] }"
          >
            <span class="bar" />
            <span class="nm"><v-icon v-if="p.icon" class="mi emb" size="1.1em" :icon="p.icon" /> {{ p.name }}</span>
            <span v-if="p.uid === g.hostId" class="status lobby">HÔTE</span>
          </div>
        </div>
        <form
          v-if="isHost && g.players.length < g.maxPlayers"
          style="display:flex;gap:10px;margin-bottom:20px" @submit.prevent="addPlayer"
        >
          <select v-model="newPlayer" required @focus="loadCandidates">
            <option value="" disabled>{{ candidates.length ? 'Choisir un joueur…' : 'Aucun joueur à ajouter' }}</option>
            <option v-for="c in candidates" :key="c" :value="c">{{ c }}</option>
          </select>
          <button class="btn primary" :disabled="!newPlayer || busy">Ajouter</button>
        </form>
        <template v-if="g.palette">
          <div class="ptitle">Ton dôme</div>
          <div class="look" :style="{ '--c': me.color }">
            <div class="swatches">
              <button
                v-for="c in freeColors" :key="c"
                :class="['swatch', { on: c === me.color }]" :style="{ '--s': c }" :title="c"
                :disabled="busy" @click="setLook({ color: c })"
              />
            </div>
            <div class="emblems">
              <button
                v-for="e in freeEmblems" :key="e"
                :class="['emblem', { on: e === me.icon }]"
                :disabled="busy" @click="setLook({ icon: e })"
              ><v-icon :icon="e" /></button>
            </div>
          </div>
        </template>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn danger" style="flex:1" @click="leave">{{ isHost ? 'Dissoudre' : 'Quitter' }}</button>
          <button
            v-if="isHost" class="btn primary" style="flex:2"
            :disabled="g.players.length < g.minPlayers || busy" @click="start"
          >
            Lancer la partie ▸
          </button>
          <span v-else class="muted" style="flex:2;align-self:center;text-align:center">En attente de l'hôte…</span>
        </div>
        <p v-if="isHost && g.players.length < g.minPlayers" class="muted" style="margin:12px 0 0;font-size:14px;text-align:center">
          Encore {{ g.minPlayers - g.players.length }} dôme(s) pour lancer.
        </p>
      </div>
    </div>

    <!-- ── Partie des anciennes règles ────────────────────────────── -->
    <div v-else-if="g.legacy" class="narrow" style="max-width:640px;margin:0 auto">
      <div class="panel" style="padding:24px">
        <h1 class="hero-title" style="font-size:24px">{{ g.name }}</h1>
        <p class="sub">
          Cette partie a été lancée avec les anciennes règles (Batteries) et ne peut plus être jouée.
          Crée une nouvelle partie pour découvrir le troc.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <router-link to="/" class="btn ghost" style="flex:1">Retour</router-link>
          <button v-if="isHost" class="btn danger" style="flex:1" :disabled="busy" @click="removeGame">
            <v-icon size="18">mdi-delete-outline</v-icon> Supprimer
          </button>
        </div>
      </div>
    </div>

    <!-- ── Partie ─────────────────────────────────────────────────── -->
    <template v-else>
      <div class="gamebar">
        <div class="daybox">
          <div class="num">JOUR <b>{{ String(dayShown).padStart(2, '0') }}</b> / {{ g.maxDays }}</div>
          <div class="progress">
            <i
              v-for="k in g.maxDays" :key="k"
              :class="{ done: k < g.day, now: k === g.day && g.status === 'running' }"
            />
          </div>
        </div>
        <div v-if="g.status === 'running'" class="infobox">
          <v-icon class="ico" color="var(--magenta)" :icon="ICONS.timer" />
          <div>
            <div class="lbl">RÉSOLUTION DANS</div>
            <div :class="['val', 'countdown', { urgent: g.deadline - now < 3600e3 }]">
              {{ g.deadline > now ? timeLeft(g.deadline, now) : 'Résolution…' }}
            </div>
          </div>
        </div>
      </div>

      <Teleport to="#subnav">
        <nav class="subnav">
          <button
            v-for="t in TABS" :key="t.key"
            :class="{ on: tab === t.key }" @click="setTab(t.key)"
          >
            <v-icon size="16">{{ t.icon }}</v-icon>{{ t.label }}
            <span v-if="t.key === 'journal' && g.log.length" class="count">{{ g.log.length }}</span>
          </button>
        </nav>
      </Teleport>

      <main v-if="tab === 'ordres'" class="board stack">
        <!-- Console -->
        <section class="panel">
          <div class="chead" :style="{ '--c': me.color }">
            <div class="avatar">
              <v-icon v-if="me.icon" :icon="me.icon" size="20" />
              <template v-else>{{ (me.name[0] || '?').toUpperCase() }}</template>
            </div>
            <div class="who">
              <div class="lbl">{{ myRes.role.toUpperCase() }} · PRODUIT {{ myRes.name.toUpperCase() }}</div>
              <h2>{{ me.name }}</h2>
            </div>
            <div class="score" title="Score">
              <div class="k"><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> Razoonium</div>
              <div class="v teal">{{ me.razoonium }}</div>
            </div>
          </div>

          <!-- Fin de partie -->
          <template v-if="g.status === 'over'">
            <h2 class="hero-title" style="font-size:22px;margin-top:24px">FIN DE PARTIE</h2>
            <p class="sub" style="margin-bottom:0">{{ endSummary }}</p>
            <div class="rank">
              <div v-for="(id, i) in g.ranking" :key="id">
                <span class="pos">#{{ i + 1 }}</span>
                <span :style="{ color: g.players[id].color, fontWeight: 700 }"><v-icon v-if="g.players[id].icon" class="mi" size="1em" :icon="g.players[id].icon" /> {{ g.players[id].name }}</span>
                <span class="num teal"><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> {{ g.players[id].razoonium }}</span>
                <span class="num"><v-icon class="mi" size="1.1em" :icon="ICONS.stock" /> {{ total(g.players[id].inv) }}</span>
              </div>
            </div>
          </template>

          <template v-else>
            <!-- Recette -->
            <div class="zone-title">Recette du jour</div>
            <div class="recipe">
              <template v-for="(q, k) in g.recipe" :key="k">
                <div v-if="q" :class="['ing', { ok: me.inv[k] >= q }]" :style="{ '--c': R[k].color }">
                  <v-icon :icon="R[k].icon" size="22" />
                  <span class="q">{{ q }}</span>
                  <span class="nm">{{ R[k].name }}</span>
                  <span class="have">{{ me.inv[k] }}/{{ q }}</span>
                </div>
              </template>
              <span class="eq">=</span>
              <div class="ing ok" style="--c:#2bffc6">
                <v-icon :icon="ICONS.razoonium" size="22" /><span class="q">1</span><span class="nm">Razoonium</span>
              </div>
            </div>
            <p class="muted hintline">
              <template v-if="canRefine">Ton stock actuel réunit la recette <b class="teal">{{ canRefine }} fois</b>.</template>
              <template v-else>Il te manque des ingrédients : troque-les, pille-les ou tente la loterie.</template>
            </p>

            <!-- Inventaire -->
            <div class="zone-title">
              Inventaire
              <span :class="['tag', { over: total(me.inv) > g.rules.invLimit }]">{{ total(me.inv) }} / {{ g.rules.invLimit }}</span>
            </div>
            <div class="inv">
              <div v-for="(r, k) in R" :key="k" :class="['rcell', { own: k === me.role, zero: !me.inv[k] }]" :style="{ '--c': r.color }">
                <v-icon :icon="r.icon" size="20" />
                <span class="nm">{{ r.name }}</span>
                <span class="v">{{ me.inv[k] }}</span>
                <span v-if="draft.pay[k]" class="s red">−{{ draft.pay[k] }} au Marché Noir</span>
                <span v-else-if="k === me.role" class="s">ta production · +{{ g.rules.production }}/tour</span>
              </div>
            </div>
            <p v-if="total(me.inv) > g.rules.invLimit" class="muted hintline">
              Au-delà de {{ g.rules.invLimit }}, le surplus (ressource la plus abondante d'abord) part au Marché Noir en fin de tour.
            </p>

            <!-- Ordres secrets -->
            <div class="zone-title orders">Ordres secrets · résolus à l'échéance</div>
            <div class="actions">
              <div class="acard" :class="{ on: draft.refine }" style="--a:#2bffc6">
                <div class="hd">
                  <div class="ic"><v-icon :icon="ICONS.refine" /></div>
                  <div><div class="nm">Raffiner</div><div class="tg">Score</div></div>
                </div>
                <div class="ds">Recette du jour → 1 Razoonium, autant de fois que demandé et possible, après le Marché Noir.</div>
                <div class="stepper">
                  <button :disabled="!editable || draft.refine <= 0" @click="setRefine(draft.refine - 1)">−</button>
                  <div class="val">{{ draft.refine }}</div>
                  <button :disabled="!editable" @click="setRefine(draft.refine + 1)">+</button>
                </div>
                <div class="pv">
                  <button v-if="editable && canRefine && draft.refine !== canRefine" class="btn ghost sm" @click="setRefine(canRefine)">Max ({{ canRefine }})</button>
                  <template v-if="draft.refine > canRefine"> {{ draft.refine - canRefine }} de plus que ton stock actuel : il faudra les obtenir d'ici là.</template>
                </div>
              </div>

              <div class="acard" :class="{ on: total(draft.raids) }" style="--a:var(--red)">
                <div class="hd">
                  <div class="ic"><v-icon :icon="ICONS.raid" /></div>
                  <div><div class="nm">Pillage</div><div class="tg">Marché Noir · {{ g.rules.raidCost }} → 1 volée</div></div>
                </div>
                <div class="ds">Paie {{ g.rules.raidCost }} ressources de ton choix pour voler 1 ressource au hasard dans le stock de la cible.</div>
                <div class="raids">
                  <div v-for="o in others" :key="o.id" class="raidrow" :style="{ '--c': o.p.color }">
                    <span class="tn"><v-icon v-if="o.p.icon" class="mi" size="1em" :icon="o.p.icon" /> {{ o.p.name }}</span>
                    <div class="stepper mini">
                      <button :disabled="!editable || !draft.raids[o.id]" @click="setRaid(o.id, -1)">−</button>
                      <div class="val">{{ draft.raids[o.id] }}</div>
                      <button :disabled="!editable" @click="setRaid(o.id, 1)">+</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="acard" :class="{ on: draft.lotto }" style="--a:var(--magenta)">
                <div class="hd">
                  <div class="ic"><v-icon :icon="ICONS.lotto" /></div>
                  <div><div class="nm">Loterie</div><div class="tg">Marché Noir · {{ g.rules.lottoCost }} → 1 au hasard</div></div>
                </div>
                <div class="ds">Paie {{ g.rules.lottoCost }} ressources pour piocher 1 ressource au hasard dans la réserve du Marché Noir. Ta mise y entre avant le tirage.</div>
                <div class="stepper">
                  <button :disabled="!editable || draft.lotto <= 0" @click="setLotto(-1)">−</button>
                  <div class="val">{{ draft.lotto }}</div>
                  <button :disabled="!editable" @click="setLotto(1)">+</button>
                </div>
                <div class="pv">
                  Réserve :
                  <template v-for="(q, k) in g.market" :key="k">
                    <span v-if="q" class="mchip"><v-icon :icon="R[k].icon" size="14" :style="{ color: R[k].color }" />{{ q }}</span>
                  </template>
                </div>
              </div>
            </div>

            <div v-if="cost" class="paybox">
              <div class="phead">
                <span>Paiement du Marché Noir :
                  <b :class="total(draft.pay) === cost ? 'lime' : 'red'">{{ total(draft.pay) }} / {{ cost }}</b>
                </span>
                <button v-if="editable" class="btn ghost sm" @click="autoPay(); dirty = true">Auto</button>
              </div>
              <div class="inv">
                <div v-for="(r, k) in R" :key="k" class="rcell pay" :style="{ '--c': r.color }">
                  <v-icon :icon="r.icon" size="18" />
                  <span class="nm">{{ r.name }} <small class="muted">({{ me.inv[k] }})</small></span>
                  <div class="stepper mini" style="--a:var(--c)">
                    <button :disabled="!editable || !draft.pay[k]" @click="setPay(k, -1)">−</button>
                    <div class="val">{{ draft.pay[k] }}</div>
                    <button :disabled="!editable || draft.pay[k] >= me.inv[k]" @click="setPay(k, 1)">+</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="cfoot sticky">
              <span class="hint">Ordres modifiables jusqu'à la résolution</span>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <template v-if="g.myReady && !dirty">
                  <button class="btn ghost" :disabled="busy" @click="unready">Modifier les ordres</button>
                </template>
                <template v-else>
                  <button class="btn ghost" :disabled="busy" @click="reset">Réinitialiser</button>
                  <button class="btn primary" :disabled="busy" @click="submit">Valider ▸</button>
                </template>
              </div>
            </div>
          </template>
        </section>

        <!-- Troc -->
        <section v-if="g.status === 'running'" class="panel">
          <div class="ptitle"><v-icon class="mi" size="1.1em" :icon="ICONS.gift" /> Troc · dons immédiats</div>
          <p class="muted hintline" style="margin-top:0">
            Négocie sur le chat, puis envoie. Le don arrive tout de suite et <b>rien ne garantit la contrepartie</b>.
            Ce que tu as engagé au Marché Noir ne peut pas être donné.
          </p>
          <div class="targets">
            <button
              v-for="o in others" :key="o.id"
              :class="['target', { on: giftTo === o.id }]" :style="{ '--c': o.p.color, '--a': o.p.color }"
              @click="giftTo = o.id"
            >
              <span class="tn"><v-icon v-if="o.p.icon" class="mi" size="1em" :icon="o.p.icon" /> {{ o.p.name }}</span>
              <span class="ts"><v-icon class="mi" size="1em" :icon="R[o.p.role].icon" :style="{ color: R[o.p.role].color }" /> {{ R[o.p.role].role }}</span>
            </button>
          </div>
          <div class="inv" style="margin-top:12px">
            <div v-for="(r, k) in R" :key="k" class="rcell pay" :style="{ '--c': r.color }">
              <v-icon :icon="r.icon" size="18" />
              <span class="nm">{{ r.name }} <small class="muted">({{ giftable[k] }})</small></span>
              <div class="stepper mini" style="--a:var(--c)">
                <button :disabled="!giftVec[k]" @click="giftVec[k]--">−</button>
                <div class="val">{{ giftVec[k] }}</div>
                <button :disabled="giftVec[k] >= giftable[k]" @click="giftVec[k]++">+</button>
              </div>
            </div>
          </div>
          <div class="cfoot">
            <span class="hint">{{ giftTo == null ? 'Choisis un destinataire' : `Pour ${g.players[giftTo].name}` }}</span>
            <button class="btn primary" :disabled="busy || giftTo == null || !total(giftVec)" @click="sendGift">
              <v-icon size="16" :icon="ICONS.gift" /> Envoyer
            </button>
          </div>
          <ul v-if="g.feed.length" class="feed">
            <li v-for="(f, i) in g.feed" :key="i">
              <LogLine :line="feedLine(f)" :players="g.players" :resources="R" />
            </li>
          </ul>
        </section>

        <!-- Dômes -->
        <section class="panel">
          <div class="ptitle">Dômes <span class="tag">stocks publics</span></div>
          <div class="domes">
            <div v-for="o in allPlayers" :key="o.id" class="dome" :style="{ '--c': o.p.color }">
              <span class="tn">
                <v-icon v-if="o.p.icon" class="mi" size="1em" :icon="o.p.icon" /> {{ o.p.name }}<span v-if="o.id === g.me" class="muted"> (toi)</span>
                <small><v-icon class="mi" size="1em" :icon="R[o.p.role].icon" :style="{ color: R[o.p.role].color }" /> {{ R[o.p.role].role }}</small>
              </span>
              <span class="stock">
                <template v-for="(q, k) in o.p.inv" :key="k">
                  <span v-if="q" class="mchip"><v-icon :icon="R[k].icon" size="14" :style="{ color: R[k].color }" />{{ q }}</span>
                </template>
              </span>
              <span class="num teal"><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> {{ o.p.razoonium }}</span>
            </div>
            <div class="dome" style="--c:var(--magenta)">
              <span class="tn"><v-icon class="mi" size="1em" :icon="ICONS.market" /> Marché Noir <small>réserve</small></span>
              <span class="stock">
                <template v-for="(q, k) in g.market" :key="k">
                  <span v-if="q" class="mchip"><v-icon :icon="R[k].icon" size="14" :style="{ color: R[k].color }" />{{ q }}</span>
                </template>
              </span>
              <span />
            </div>
          </div>
        </section>
      </main>

      <!-- Score -->
      <main v-else-if="tab === 'score'" class="board stack">
        <section class="panel">
          <div class="ptitle">
            Classement {{ g.status === 'over' ? 'final' : 'provisoire' }}
            <span v-if="g.status === 'running'" class="tag">Ordres validés {{ readyCount }}/{{ g.players.length }}</span>
          </div>
          <div class="rank" style="margin:0">
            <div v-for="(id, i) in standings" :key="id">
              <span class="pos">#{{ i + 1 }}</span>
              <span class="who-cell">
                <span :style="{ color: g.players[id].color, fontWeight: 700 }">
                  <v-icon v-if="g.players[id].icon" class="mi" size="1em" :icon="g.players[id].icon" /> {{ g.players[id].name }}<span v-if="id === g.me" class="muted"> (toi)</span>
                </span>
                <span
                  v-if="g.status === 'running'"
                  :class="['status', g.ready[id] ? 'ready' : 'wait']"
                  :title="g.ready[id] ? 'Ordres validés pour ce tour' : 'Ordres pas encore validés'"
                >{{ g.ready[id] ? '✔ PRÊT' : '… EN ATTENTE' }}</span>
              </span>
              <span class="num teal"><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> {{ g.players[id].razoonium }}</span>
              <span class="num"><v-icon class="mi" size="1.1em" :icon="ICONS.stock" /> {{ total(g.players[id].inv) }}</span>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="ptitle">Évolution</div>
          <div class="tabs">
            <button :class="{ on: chartTab === 'r' }" style="--a:#2bffc6" @click="chartTab = 'r'"><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> Razoonium</button>
            <button :class="{ on: chartTab === 't' }" style="--a:var(--lime)" @click="chartTab = 't'"><v-icon class="mi" size="1.1em" :icon="ICONS.stock" /> Stock</button>
          </div>
          <EvolutionChart
            :key="chartTab" :players="g.players" :history="g.history"
            :max-days="g.maxDays" :metric="chartTab"
          />
          <p v-if="g.history.length < 2" class="empty" style="margin:12px 0 0">
            Les courbes se dessinent à partir de la première résolution.
          </p>
        </section>
        <section v-if="isHost" class="panel">
          <div class="ptitle">Zone hôte</div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <span class="muted" style="flex:1;min-width:200px">
              Supprime définitivement la partie pour tous les joueurs, même en cours. Action irréversible.
            </span>
            <button class="btn danger" :disabled="busy" @click="removeGame">
              <v-icon size="18">mdi-delete-outline</v-icon> Supprimer la partie
            </button>
          </div>
        </section>
      </main>

      <!-- Journal de bord -->
      <main v-else class="board">
        <section class="panel">
          <div class="ptitle">Journal de bord <span class="tag">{{ g.log.length }} tour(s)</span></div>
          <div class="log">
            <div v-for="e in g.log" :key="e.day" class="entry">
              <h4>
                JOUR {{ String(e.day).padStart(2, '0') }}
                <span><LogLine :line="vecLine(e.recipe)" :players="g.players" :resources="R" /></span>
              </h4>
              <ul>
                <li v-for="(l, i) in e.lines" :key="i">
                  <LogLine :line="l" :players="g.players" :resources="R" />
                </li>
              </ul>
              <div class="bilan">
                <template v-for="b in e.bilan" :key="b.id">
                  <span :style="{ color: g.players[b.id].color }">{{ g.players[b.id].name }}</span>
                  <span>
                    <b v-if="b.r" class="up">+{{ b.r }} <v-icon class="mi" size="1em" :icon="ICONS.razoonium" /></b>
                    <span class="muted"> stock {{ b.before }} → {{ b.after }}</span>
                  </span>
                </template>
              </div>
            </div>
            <div v-if="!g.log.length" class="empty">Aucun tour résolu pour l'instant.</div>
          </div>
        </section>
      </main>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { auth } from '../stores/auth';
import { toast } from '../stores/toast';
import { ICONS, emptyOrders, total, refinable, timeLeft } from '../game';
import EvolutionChart from '../components/EvolutionChart.vue';
import LogLine from '../components/LogLine.vue';

const POLL_MS = 15000;
const TABS = [
  { key: 'ordres', label: 'Console', icon: 'mdi-console-line' },
  { key: 'score', label: 'Score', icon: 'mdi-chart-line' },
  { key: 'journal', label: 'Journal de bord', icon: 'mdi-script-text-outline' },
];

const props = defineProps({ id: { type: String, required: true } });
const route = useRoute();
const router = useRouter();
const tab = computed(() => (TABS.some((t) => t.key === route.query.tab) ? route.query.tab : 'ordres'));
const setTab = (key) => router.replace({ query: key === 'ordres' ? {} : { tab: key } });

const g = ref(null);
const draft = ref(emptyOrders(0));
const dirty = ref(false);
const busy = ref(false);
const chartTab = ref('r');
const now = ref(Date.now());

const isHost = computed(() => g.value?.hostId === auth.user?.id);
const me = computed(() => g.value.players[g.value.me]);
const R = computed(() => g.value.resources);
const myRes = computed(() => R.value[me.value.role]);
// Couleurs et emblèmes encore libres (les miens inclus)
const takenBy = (key) => g.value.players.filter((_, i) => i !== g.value.me).map((p) => p[key]);
const freeColors = computed(() => (g.value.palette || []).filter((c) => !takenBy('color').includes(c)));
const freeEmblems = computed(() => (g.value.emblems || []).filter((e) => !takenBy('icon').includes(e)));
const allPlayers = computed(() => g.value.players.map((p, id) => ({ p, id })));
const others = computed(() => allPlayers.value.filter((o) => o.id !== g.value.me));
const readyCount = computed(() => g.value.ready.filter(Boolean).length);
const editable = computed(() => g.value.status === 'running' && (!g.value.myReady || dirty.value));
const dayShown = computed(() => Math.min(g.value.day, g.value.maxDays));
const canRefine = computed(() => refinable(me.value.inv, g.value.recipe));
const cost = computed(() => g.value.rules.raidCost * total(draft.value.raids) + g.value.rules.lottoCost * draft.value.lotto);
const endSummary = computed(() => {
  const win = g.value.players[g.value.ranking[0]];
  return `${g.value.maxDays} jours écoulés. ${win.name} l'emporte avec ${win.razoonium} Razoonium.`;
});

// Classement : Razoonium d'abord, puis stock
const standings = computed(() => g.value.ranking ?? allPlayers.value
  .slice()
  .sort((a, b) => b.p.razoonium - a.p.razoonium || total(b.p.inv) - total(a.p.inv))
  .map((x) => x.id));

/* « 2 {r:0} + 1 {r:3} » pour LogLine */
const vecLine = (v) => (v || []).map((q, k) => (q ? `${q} {r:${k}}` : null)).filter(Boolean).join(' + ') || 'rien';
const feedLine = (f) => (f.from === g.value.me
  ? `Tu donnes ${vecLine(f.vec)} à {p:${f.to}}.`
  : `{p:${f.from}} te donne ${vecLine(f.vec)}.`);

function fromServer(o, n) {
  const e = emptyOrders(n);
  return { pay: e.pay.map((_, k) => o?.pay?.[k] ?? 0), raids: e.raids.map((_, k) => o?.raids?.[k] ?? 0), lotto: o?.lotto ?? 0, refine: o?.refine ?? 0 };
}

function apply(data) {
  const prev = g.value;
  g.value = data;
  if (prev && prev.day !== data.day && data.status !== 'lobby') {
    toast(data.status === 'over' ? 'Partie terminée' : `Jour ${prev.day} résolu — nouvelle recette`);
    dirty.value = false;
    giftVec.value = Array(data.players.length).fill(0);
  }
  if (!dirty.value) draft.value = fromServer(data.myOrders, data.players.length);
  if (giftVec.value.length !== data.players.length) giftVec.value = Array(data.players.length).fill(0);
}

async function load() {
  try {
    apply((await api.get(`/games/${props.id}`)).data);
  } catch (e) {
    // partie supprimée par l'hôte pendant qu'on la consultait
    if (e.status === 404 && g.value) {
      toast('Cette partie a été supprimée par l\'hôte.');
      return router.replace('/');
    }
    toast(e.message);
    if (!g.value) router.replace('/');
  }
}

const setLook = (look) => call(() => api.put(`/games/${props.id}/look`, look));

const newPlayer = ref('');
const candidates = ref([]);
async function loadCandidates() {
  try {
    candidates.value = (await api.get(`/games/${props.id}/candidates`)).data;
  } catch { /* liste indisponible : on garde la précédente */ }
}
async function addPlayer() {
  const name = newPlayer.value;
  const before = g.value.players.length;
  await call(() => api.post(`/games/${props.id}/players`, { username: name }));
  if (g.value.players.length > before) {
    toast(`${name} a été ajouté`);
    newPlayer.value = '';
    candidates.value = candidates.value.filter((c) => c !== name);
  }
}

async function call(request, success) {
  busy.value = true;
  try {
    const { data } = await request();
    if (data) apply(data);
    if (success) toast(success);
    return true;
  } catch (e) {
    toast(e.message);
    return false;
  } finally {
    busy.value = false;
  }
}

// ── Ordres secrets ──

function setRefine(v) {
  draft.value.refine = Math.max(0, v);
  dirty.value = true;
}

function setRaid(id, d) {
  draft.value.raids[id] = Math.max(0, draft.value.raids[id] + d);
  autoPay();
  dirty.value = true;
}

function setLotto(d) {
  draft.value.lotto = Math.max(0, draft.value.lotto + d);
  autoPay();
  dirty.value = true;
}

function setPay(k, d) {
  draft.value.pay[k] = Math.max(0, Math.min(me.value.inv[k], draft.value.pay[k] + d));
  dirty.value = true;
}

/* Paiement proposé : d'abord ce qui ne sert pas aux raffinages demandés, le plus abondant en premier */
function autoPay() {
  const inv = me.value.inv;
  const keep = g.value.recipe.map((q) => q * draft.value.refine);
  const pay = inv.map(() => 0);
  for (let i = 0; i < cost.value; i++) {
    let best = -1;
    let score = -Infinity;
    inv.forEach((q, k) => {
      const s = q - keep[k] - pay[k];
      if (pay[k] < q && s > score) { score = s; best = k; }
    });
    if (best < 0) break;
    pay[best]++;
  }
  draft.value.pay = pay;
}

function reset() {
  draft.value = emptyOrders(g.value.players.length);
  dirty.value = true;
}

async function submit() {
  if (total(draft.value.pay) !== cost.value) return toast(`⚠ Paiement : ${total(draft.value.pay)} / ${cost.value}`);
  dirty.value = false;
  if (!await call(() => api.put(`/games/${props.id}/orders`, { orders: draft.value, ready: true }), 'Ordres verrouillés')) dirty.value = true;
}

function unready() {
  call(() => api.put(`/games/${props.id}/orders`, { orders: draft.value, ready: false }));
}

// ── Troc ──

const giftTo = ref(null);
const giftVec = ref([]);
// Ce qui peut être donné : stock moins le paiement déjà validé au Marché Noir
const giftable = computed(() => me.value.inv.map((q, k) => Math.max(0, q - (g.value.myOrders.pay?.[k] ?? 0))));

async function sendGift() {
  const to = g.value.players[giftTo.value];
  const what = giftVec.value.map((q, k) => (q ? `${q} ${R.value[k].name}` : null)).filter(Boolean).join(' + ');
  if (!confirm(`Donner ${what} à ${to.name} ? C'est immédiat et irréversible.`)) return;
  if (await call(() => api.post(`/games/${props.id}/gift`, { to: giftTo.value, vec: giftVec.value }), `Envoyé à ${to.name}`)) {
    giftVec.value = giftVec.value.map(() => 0);
  }
}

// ── Partie ──

function start() {
  call(() => api.post(`/games/${props.id}/start`), 'La partie commence !');
}

async function leave() {
  if (!confirm(isHost.value ? 'Dissoudre cette partie ?' : 'Quitter cette partie ?')) return;
  await call(() => api.delete(`/games/${props.id}/membership`));
  router.replace('/');
}

async function removeGame() {
  const warn = g.value.status === 'running' ? ' La partie est en cours : tous les joueurs la perdront.' : '';
  if (!confirm(`Supprimer définitivement « ${g.value.name} » ?${warn}`)) return;
  busy.value = true;
  try {
    await api.delete(`/games/${props.id}`);
    toast('Partie supprimée');
    router.replace('/');
  } catch (e) {
    toast(e.message);
  } finally {
    busy.value = false;
  }
}

async function share() {
  const text = `Rejoins ma partie de Razoonium « ${g.value.name} » avec le code ${g.value.code}`;
  try {
    if (navigator.share) await navigator.share({ title: 'Razoonium', text, url: location.origin });
    else {
      await navigator.clipboard.writeText(g.value.code);
      toast('Code copié');
    }
  } catch { /* partage annulé */ }
}

let poll;
let clock;
let lastDeadlineReload = 0;
function onVisible() {
  if (document.visibilityState === 'visible') load();
}

onMounted(() => {
  load().then(() => { if (isHost.value && g.value?.status === 'lobby') loadCandidates(); });
  poll = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
  clock = setInterval(() => {
    now.value = Date.now();
    // échéance atteinte : on recharge pour déclencher la résolution côté serveur
    const d = g.value?.deadline;
    if (d && now.value >= d && now.value - lastDeadlineReload > 5000) {
      lastDeadlineReload = now.value;
      load();
    }
  }, 1000);
  document.addEventListener('visibilitychange', onVisible);
});

onBeforeUnmount(() => {
  clearInterval(poll);
  clearInterval(clock);
  document.removeEventListener('visibilitychange', onVisible);
});
</script>

<style scoped>
.hintline { margin: 10px 0 0; font-size: 14px; }
.hintline b, .lime { color: var(--lime); }
.teal { color: #2bffc6; }
.red { color: var(--red); }
.tag.over { color: var(--red); border-color: var(--red); }
.btn.sm { padding: 4px 10px; font-size: 12px; }

/* Recette */
.recipe { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 18px; }
.ing { display: grid; grid-template-columns: auto auto auto; grid-template-rows: auto auto; column-gap: 8px; align-items: center;
  padding: 8px 12px; border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 12%, transparent), transparent); color: var(--c); }
.ing .v-icon { grid-row: span 2; }
.ing .q { font-family: 'Orbitron'; font-weight: 700; font-size: 18px; }
.ing .nm { grid-column: 2; font-size: 12px; color: var(--soft); }
.ing .have { grid-column: 3; grid-row: 1 / 3; margin-left: 6px; font-family: 'Orbitron'; font-size: 12px; color: var(--red); }
.ing.ok .have { color: var(--lime); }
.eq { font-family: 'Orbitron'; font-size: 22px; color: var(--muted); }

/* Inventaire */
.inv { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 18px; }
.rcell { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 2px 8px; padding: 8px 10px; min-width: 0;
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); background: color-mix(in srgb, var(--c) 6%, transparent); color: var(--c); }
.rcell.own { border-color: var(--c); box-shadow: 0 0 12px color-mix(in srgb, var(--c) 30%, transparent); }
.rcell.zero { opacity: .45; }
.rcell .nm { font-size: 14px; color: var(--soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rcell .v { font-family: 'Orbitron'; font-weight: 700; font-size: 20px; }
.rcell .s { grid-column: 1 / -1; font-size: 11px; color: var(--muted); }
.rcell .s.red { color: var(--red); }
.rcell.pay { grid-template-columns: auto 1fr; }
.rcell.pay .stepper { grid-column: 1 / -1; margin-top: 4px; }
.stepper.mini { grid-template-columns: 32px 1fr 32px; }
.stepper.mini .val { font-size: 16px; padding: 3px 0; }

/* Ordres */
.raids { display: flex; flex-direction: column; gap: 6px; }
.raidrow { display: grid; grid-template-columns: 1fr 120px; align-items: center; gap: 8px; border-left: 3px solid var(--c); padding-left: 8px; }
.raidrow .tn { color: var(--c); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.paybox { margin-top: 16px; padding: 12px 14px; border: 1px dashed var(--line-strong); }
.paybox .phead { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.paybox .inv { margin-top: 10px; }
.mchip { display: inline-flex; align-items: center; gap: 2px; margin-right: 8px; font-family: 'Orbitron'; font-size: 12px; color: var(--text); }

/* Troc */
.feed { margin: 14px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; font-size: 15px; color: var(--soft); }
.feed li::before { content: "▸ "; color: var(--cyan); }

/* Dômes */
.domes { display: flex; flex-direction: column; gap: 8px; }
.dome { display: grid; grid-template-columns: minmax(120px, 1fr) 2fr 64px; gap: 10px; align-items: center; padding: 8px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--c); }
.dome .tn { color: var(--c); font-weight: 700; display: flex; flex-direction: column; min-width: 0; }
.dome .tn small { color: var(--muted); font-weight: 500; }
.dome .num { text-align: right; font-family: 'Orbitron'; font-weight: 700; }
@media (max-width: 860px) {
  .dome { grid-template-columns: 1fr auto; }
  .dome .stock { grid-column: 1 / -1; grid-row: 2; }
}
</style>
