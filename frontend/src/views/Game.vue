<template>
  <div class="page">
    <v-progress-linear v-if="!g" indeterminate color="primary" />

    <!-- ── Salle d'attente ─────────────────────────────────────────── -->
    <div v-else-if="g.status === 'lobby'" class="narrow" style="max-width:640px;margin:0 auto">
      <div class="panel" style="padding:24px">
        <h1 class="hero-title" style="font-size:24px">{{ g.name }}</h1>
        <p class="sub">
          Tours de {{ g.turnHours }}h · {{ g.minPlayers }} à {{ g.maxPlayers }} dômes
          <template v-if="g.earlyResolve"> · résolution anticipée</template>
        </p>
        <div class="ptitle">Code d'accès</div>
        <div class="codebox" title="Copier / partager" @click="share">{{ g.code }}</div>
        <div class="ptitle">Dômes connectés <span class="tag">{{ g.players.length }}/{{ g.maxPlayers }}</span></div>
        <div class="plist" style="flex-direction:column;margin-bottom:20px">
          <div
            v-for="(p, i) in g.players" :key="p.uid"
            :class="['pcard', { me: i === g.me }]" :style="{ '--c': p.color || g.palette[i] }"
          >
            <span class="bar" />
            <span class="nm"><v-icon v-if="p.icon" class="mi emb" size="1.1em" :icon="p.icon" /> {{ p.name }}</span>
            <span v-if="p.uid === g.hostId" class="status lobby">HÔTE</span>
          </div>
        </div>
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

      <main v-if="tab === 'ordres'" class="board">
        <!-- Console -->
        <section class="panel">
          <div class="chead" :style="{ '--c': me.color }">
            <div class="avatar">
              <v-icon v-if="me.icon" :icon="me.icon" size="20" />
              <template v-else>{{ (me.name[0] || '?').toUpperCase() }}</template>
            </div>
            <div class="who">
              <div class="lbl">COMMANDANT</div>
              <h2>{{ me.name }}</h2>
            </div>
            <div class="score" title="Score · imprenable">
              <div class="k"><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> Razoonium</div>
              <div class="v teal">{{ me.razoonium || 0 }}</div>
            </div>
          </div>

          <div class="zone-title">Ressources</div>
          <div class="stats">
            <div class="stat">
              <div class="k"><v-icon class="mi" size="1.1em" :icon="ICONS.battery" /> Batteries</div>
              <div class="v lime">{{ me.batteries }}</div>
              <div class="cells">
                <i
                  v-for="i in Math.max(me.batteries, 1)" :key="i"
                  :class="i <= remaining ? 'on' : i <= me.batteries ? 'lock' : ''"
                />
              </div>
            </div>
            <div class="stat">
              <div class="k"><v-icon class="mi" size="1.1em" :icon="ICONS.shield" /> Bouclier</div>
              <div class="v cyan">{{ shieldTotal(me) }}</div>
              <div v-if="draft.pact != null && shieldTotal(me)" class="s"><v-icon class="mi" size="1.1em" :icon="ICONS.shieldOff" /> inactif ce tour (pacte)</div>
              <div class="layers">
                <span
                  v-for="(l, i) in me.shields" :key="i"
                  :class="['layer', { old: shieldLeft(l) <= 1 }]"
                >{{ l.amount }} · {{ shieldLeft(l) }}t</span>
                <span v-if="!me.shields.length" class="empty">aucun</span>
              </div>
            </div>
          </div>

          <!-- Fin de partie -->
          <template v-if="g.status === 'over'">
            <h2 class="hero-title" style="font-size:22px;margin-top:24px">FIN DE PARTIE</h2>
            <p class="sub" style="margin-bottom:0">{{ endSummary }}</p>
            <div class="rank">
              <div v-for="(id, i) in g.ranking" :key="id" :class="{ dead: !g.players[id].alive }">
                <span class="pos">#{{ i + 1 }}</span>
                <span :style="{ color: g.players[id].color, fontWeight: 700 }"><v-icon v-if="g.players[id].icon" class="mi" size="1em" :icon="g.players[id].icon" /> {{ g.players[id].name }}</span>
                <span class="num teal"><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> {{ g.players[id].razoonium || 0 }}</span>
                <template v-if="g.players[id].alive">
                  <span class="num"><v-icon class="mi" size="1.1em" :icon="ICONS.battery" /> {{ g.players[id].batteries }}</span>
                  <span class="num"><v-icon class="mi" size="1.1em" :icon="ICONS.shield" /> {{ shieldTotal(g.players[id]) }}</span>
                </template>
                <span v-else class="out"><v-icon class="mi" size="1.1em" :icon="ICONS.dead" /> jour {{ g.players[id].elimDay }}</span>
              </div>
            </div>
          </template>

          <div v-else-if="!me.alive" class="locked-msg">DÔME ÉTEINT — JOUR {{ me.elimDay }}</div>

          <!-- Ordres -->
          <template v-else>
            <div class="zone-title orders">Ordres du tour</div>
            <div class="tiles">
              <button
                v-for="a in ACTIONS" :key="a.key"
                :class="['tile', { on: isOn(a), blocked: blockedByPact(a) }]" :style="{ '--a': a.color }"
                :disabled="blockedByPact(a)" :title="blockedByPact(a) ? 'Interdit pendant un pacte' : ''"
                @click="openKey = a.key"
              >
                <span class="ic"><v-icon :icon="a.icon" /></span>
                <span class="nm">{{ a.name }}</span>
                <span class="sm">{{ summary(a) }}</span>
                <span v-if="!a.noAmount && draft[a.key] > 0" class="badge">{{ draft[a.key] }}</span>
              </button>
            </div>

            <v-dialog v-model="actionOpen" max-width="440">
              <div v-if="current" class="acard on modal" :style="{ '--a': current.color }">
                <div class="hd">
                  <div class="ic"><v-icon :icon="current.icon" /></div>
                  <div style="flex:1"><div class="nm">{{ current.name }}</div><div class="tg">{{ current.tag }}</div></div>
                  <button class="btn ghost icon" title="Fermer" @click="openKey = null"><v-icon size="18">mdi-close</v-icon></button>
                </div>
                <div class="ds">{{ current.desc }}</div>
                <div v-if="current.key === 'bid'" class="lotchips">
                  <span v-for="(v, i) in g.lots" :key="i">
                    <small>LOT {{ i + 1 }}</small> +{{ v }} <v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" />
                  </span>
                  <span v-if="!g.lots.length" class="empty">Aucun lot aujourd'hui</span>
                </div>
                <div v-if="!current.noAmount" class="stepper">
                  <button :disabled="!editable || draft[current.key] <= 0" @click="step(current.key, -1, $event)">−</button>
                  <div class="val">{{ draft[current.key] }}</div>
                  <button :disabled="!editable || remaining <= 0" @click="step(current.key, 1, $event)">+</button>
                </div>
                <div v-if="current.target" class="targets">
                  <button
                    v-for="o in others" :key="o.id"
                    :class="['target', { on: draft[current.target] === o.id }]" :style="{ '--c': o.p.color }"
                    :disabled="!editable" @click="pickTarget(current, o.id)"
                  >
                    <span class="tn"><v-icon v-if="o.p.icon" class="mi" size="1em" :icon="o.p.icon" /> {{ o.p.name }}</span>
                    <span class="ts">
                      <v-icon class="mi" size="1em" :icon="ICONS.battery" /> {{ o.p.batteries }}
                      <v-icon class="mi" size="1em" :icon="ICONS.shield" /> {{ shieldTotal(o.p) }}
                    </span>
                  </button>
                </div>
                <div class="pv">{{ preview(current.key) }}</div>
                <div class="mfoot">
                  <span class="muted">Disponibles : <b class="lime">{{ remaining }}</b> <v-icon class="mi" size="1.1em" :icon="ICONS.battery" /></span>
                  <span v-if="!editable" class="muted">Ordres verrouillés</span>
                  <div style="display:flex;gap:8px">
                    <button
                      v-if="editable && current.target && draft[current.target] != null"
                      class="btn ghost" @click="abandon(current)"
                    ><v-icon size="16">mdi-close-circle-outline</v-icon> Abandonner</button>
                    <button class="btn primary" @click="openKey = null">OK</button>
                  </div>
                </div>
              </div>
            </v-dialog>

            <div class="cfoot sticky">
              <span class="hint">Shift + clic : ±5 · ordres modifiables jusqu'à la résolution</span>
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
      </main>

      <!-- Score -->
      <main v-else-if="tab === 'score'" class="board stack">
        <section class="panel">
          <div class="ptitle">
            Classement {{ g.status === 'over' ? 'final' : 'provisoire' }}
            <span v-if="g.status === 'running'" class="tag">Ordres validés {{ readyCount }}/{{ alive.length }}</span>
          </div>
          <div class="rank" style="margin:0">
            <div v-for="(id, i) in standings" :key="id" :class="{ dead: !g.players[id].alive }">
              <span class="pos">#{{ i + 1 }}</span>
              <span class="who-cell">
                <span :style="{ color: g.players[id].color, fontWeight: 700 }">
                  <v-icon v-if="g.players[id].icon" class="mi" size="1em" :icon="g.players[id].icon" /> {{ g.players[id].name }}<span v-if="id === g.me" class="muted"> (toi)</span>
                </span>
                <span
                  v-if="g.status === 'running' && g.players[id].alive"
                  :class="['status', g.ready[id] ? 'ready' : 'wait']"
                  :title="g.ready[id] ? 'Ordres validés pour ce tour' : 'Ordres pas encore validés'"
                >{{ g.ready[id] ? '✔ PRÊT' : '… EN ATTENTE' }}</span>
              </span>
              <span class="num teal"><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> {{ g.players[id].razoonium || 0 }}</span>
              <template v-if="g.players[id].alive">
                <span class="num"><v-icon class="mi" size="1.1em" :icon="ICONS.battery" /> {{ g.players[id].batteries }}</span>
                <span class="num"><v-icon class="mi" size="1.1em" :icon="ICONS.shield" /> {{ shieldTotal(g.players[id]) }}</span>
              </template>
              <span v-else class="out"><v-icon class="mi" size="1.1em" :icon="ICONS.dead" /> jour {{ g.players[id].elimDay }}</span>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="ptitle">Évolution</div>
          <div class="tabs">
            <button :class="{ on: chartTab === 'r' }" @click="chartTab = 'r'"><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> Razoonium</button>
            <button :class="{ on: chartTab === 'b' }" @click="chartTab = 'b'"><v-icon class="mi" size="1.1em" :icon="ICONS.battery" /> Batteries</button>
            <button :class="{ on: chartTab === 's' }" @click="chartTab = 's'"><v-icon class="mi" size="1.1em" :icon="ICONS.shield" /> Boucliers</button>
          </div>
          <EvolutionChart
            :key="chartTab" :players="g.players" :history="g.history"
            :max-days="g.maxDays" :metric="chartTab"
            :projection="chartTab === 's' && g.status === 'running'" :shield-duration="g.shieldDuration"
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
            <div v-for="e in g.log" :key="e.day" class="entry" :style="{ borderColor: WEATHER[e.weather].color }">
              <h4>
                JOUR {{ String(e.day).padStart(2, '0') }}
                <span><v-icon class="mi" size="1.1em" :icon="WEATHER[e.weather].icon" /> {{ WEATHER[e.weather].label }} · dé {{ e.die }}</span>
              </h4>
              <ul>
                <li v-for="(l, i) in e.lines" :key="i" :class="{ sub: l.startsWith('↳ ') }">
                  <LogLine :line="l.replace(/^↳ /, '')" :players="g.players" />
                </li>
              </ul>
              <div class="bilan">
                <template v-for="b in e.bilan" :key="b.id">
                  <span :style="{ color: g.players[b.id].color }">{{ g.players[b.id].name }}</span>
                  <span :class="b.after > b.before ? 'up' : b.after < b.before ? 'down' : ''">
                    {{ b.before }} → {{ b.after }} ({{ b.after >= b.before ? '+' : '' }}{{ b.after - b.before }})
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
import { ACTIONS, WEATHER, ICONS, emptyOrders, spent, shieldTotal, timeLeft } from '../game';
import EvolutionChart from '../components/EvolutionChart.vue';
import LogLine from '../components/LogLine.vue';

const POLL_MS = 15000;
const TABS = [
  { key: 'ordres', label: 'Ordres', icon: 'mdi-console-line' },
  { key: 'score', label: 'Score', icon: 'mdi-chart-line' },
  { key: 'journal', label: 'Journal de bord', icon: 'mdi-script-text-outline' },
];

const props = defineProps({ id: { type: String, required: true } });
const route = useRoute();
const router = useRouter();
const tab = computed(() => (TABS.some((t) => t.key === route.query.tab) ? route.query.tab : 'ordres'));
const setTab = (key) => router.replace({ query: key === 'ordres' ? {} : { tab: key } });

const g = ref(null);
const draft = ref(emptyOrders());
const dirty = ref(false);
const busy = ref(false);
const chartTab = ref('r');
const openKey = ref(null);
const current = computed(() => ACTIONS.find((a) => a.key === openKey.value));
const actionOpen = computed({
  get: () => openKey.value !== null,
  set: (v) => { if (!v) openKey.value = null; },
});
const now = ref(Date.now());

const isHost = computed(() => g.value?.hostId === auth.user?.id);
const me = computed(() => g.value.players[g.value.me]);
// Couleurs et emblèmes encore libres (les miens inclus)
const takenBy = (key) => g.value.players.filter((_, i) => i !== g.value.me).map((p) => p[key]);
const freeColors = computed(() => g.value.palette.filter((c) => !takenBy('color').includes(c)));
const freeEmblems = computed(() => g.value.emblems.filter((e) => !takenBy('icon').includes(e)));
const alive = computed(() => g.value.players.filter((p) => p.alive));
const readyCount = computed(() => g.value.players.filter((p, i) => p.alive && g.value.ready[i]).length);
const used = computed(() => spent(draft.value));
const remaining = computed(() => me.value.batteries - used.value);
const editable = computed(() => g.value.status === 'running' && me.value.alive && (!g.value.myReady || dirty.value));
const others = computed(() => g.value.players.map((p, id) => ({ p, id })).filter((o) => o.p.alive && o.id !== g.value.me));
const dayShown = computed(() => Math.min(g.value.day, g.value.maxDays));
const consoleState = computed(() => {
  if (g.value.status === 'over') return 'PARTIE TERMINÉE';
  if (!me.value.alive) return 'HORS LIGNE';
  return g.value.myReady && !dirty.value ? 'ORDRES VERROUILLÉS' : 'TERMINAL ACTIF';
});
const endSummary = computed(() => {
  const win = g.value.players[g.value.ranking[0]];
  if (!alive.value.length) return 'Tous les dômes se sont éteints.';
  if (alive.value.length === 1 && g.value.day <= g.value.maxDays) return `${win.name} est le dernier dôme debout.`;
  return `${g.value.maxDays} jours écoulés. ${win.name} l'emporte avec ${win.razoonium || 0} Razoonium.`;
});

// Classement : vivants d'abord, puis Razoonium, batteries, bouclier, jour d'élimination
const standings = computed(() => g.value.ranking ?? g.value.players
  .map((p, id) => ({ p, id }))
  .sort((a, b) => (b.p.alive - a.p.alive) || (b.p.razoonium || 0) - (a.p.razoonium || 0) || b.p.batteries - a.p.batteries
    || shieldTotal(b.p) - shieldTotal(a.p) || (b.p.elimDay || 0) - (a.p.elimDay || 0))
  .map((x) => x.id));

const shieldLeft = (l) => g.value.shieldDuration - (g.value.day - l.day);

function apply(data) {
  const prev = g.value;
  g.value = data;
  if (prev && prev.day !== data.day && data.status !== 'lobby') {
    const w = data.lastWeather && WEATHER[data.lastWeather.weather];
    toast(`Jour ${prev.day} résolu${w ? ` — ${w.label}` : ''}`);
    dirty.value = false;
  }
  if (!dirty.value) draft.value = { ...emptyOrders(), ...data.myOrders };
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

async function call(request, success) {
  busy.value = true;
  try {
    const { data } = await request();
    if (data) apply(data);
    if (success) toast(success);
  } catch (e) {
    toast(e.message);
  } finally {
    busy.value = false;
  }
}

function step(key, dir, e) {
  const d = dir * (e.shiftKey ? 5 : 1);
  draft.value[key] = Math.max(0, draft.value[key] + Math.min(d, remaining.value));
  dirty.value = true;
}

function reset() {
  draft.value = emptyOrders();
  dirty.value = true;
}

function submit() {
  const o = draft.value;
  if (o.atk > 0 && o.atkTarget == null) return toast('⚠ Attaque sans cible');
  if (o.xfer > 0 && o.xferTarget == null) return toast('⚠ Transfert sans cible');
  dirty.value = false;
  call(() => api.put(`/games/${props.id}/orders`, { orders: o, ready: true }), 'Ordres verrouillés');
}

function unready() {
  call(() => api.put(`/games/${props.id}/orders`, { orders: draft.value, ready: false }));
}

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

// Proposer un pacte interdit l'attaque et la défense ce tour, réciproque ou non
const blockedByPact = (a) => draft.value.pact != null && (a.key === 'atk' || a.key === 'def');

function pickTarget(a, id) {
  draft.value[a.target] = id;
  dirty.value = true;
  const o = draft.value;
  if (a.key === 'pact' && o.pact != null && (o.atk || o.def)) {
    o.atk = 0;
    o.def = 0;
    o.atkTarget = null;
    toast('Pacte : attaque et défense retirées');
  }
}

// Annule l'action ciblée : cible et mise
function abandon(a) {
  draft.value[a.target] = null;
  if (!a.noAmount) draft.value[a.key] = 0;
  dirty.value = true;
}

const isOn = (a) => (a.noAmount ? draft.value.pact != null : draft.value[a.key] > 0);

/* Résumé court affiché sous l'icône */
function summary(a) {
  const o = draft.value;
  if (blockedByPact(a)) return '∞ pacte';
  if (!isOn(a)) return a.tag;
  if (!a.target) return { gen: `→ +${Math.floor(o.gen * 1.5)}`, def: `bouclier +${o.def}`, bid: `mise ${o.bid}`, ref: `score +${o.ref}` }[a.key];
  const t = o[a.target];
  return t == null ? '⚠ cible ?' : `→ ${g.value.players[t].name}`;
}

function preview(key) {
  const o = draft.value;
  const nm = (id) => (id == null ? '' : g.value.players[id].name);
  switch (key) {
    case 'gen': return o.gen ? `→ +${Math.floor(o.gen * 1.5)} (×1,5) · +${o.gen * 2} si Abondance/Pacte` : '';
    case 'def': return o.def ? `→ Bouclier ${shieldTotal(me.value)} → ${shieldTotal(me.value) + o.def}` : '';
    case 'atk':
      if (!o.atk) return '';
      if (o.atkTarget == null) return '⚠ choisis une cible';
      return `→ ${nm(o.atkTarget)} · bouclier visible ${shieldTotal(g.value.players[o.atkTarget])}`;
    case 'pact':
      if (o.pact == null) return '';
      return `→ si ${nm(o.pact)} accepte aussi : génération ×2 · tes boucliers sont inactifs ce tour`;
    case 'xfer':
      if (!o.xfer) return '';
      return o.xferTarget == null ? '⚠ choisis une cible' : `→ ${o.xfer} pour ${nm(o.xferTarget)}`;
    case 'bid': return o.bid ? `→ mise de ${o.bid} sur ${g.value.lots.length} lot(s)` : '';
    case 'ref': return o.ref ? `→ Razoonium ${me.value.razoonium || 0} → ${(me.value.razoonium || 0) + o.ref}` : '';
  }
  return '';
}

let poll;
let clock;
let lastDeadlineReload = 0;
function onVisible() {
  if (document.visibilityState === 'visible') load();
}

onMounted(() => {
  load();
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
