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
          <div v-for="(p, i) in g.players" :key="p.uid" class="pcard" :style="{ '--c': COLORS[i] }">
            <span class="bar" />
            <span class="nm">{{ p.name }}</span>
            <span v-if="p.uid === g.hostId" class="status lobby">HÔTE</span>
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
          <span class="ico" style="color:var(--magenta)">⏱</span>
          <div>
            <div class="lbl">RÉSOLUTION DANS</div>
            <div :class="['val', 'countdown', { urgent: g.deadline - now < 3600e3 }]">
              {{ g.deadline > now ? timeLeft(g.deadline, now) : 'Résolution…' }}
            </div>
          </div>
        </div>
        <div class="infobox">
          <template v-if="g.lastWeather">
            <span class="ico" :style="{ color: WEATHER[g.lastWeather.weather].color }">{{ WEATHER[g.lastWeather.weather].icon }}</span>
            <div>
              <div class="lbl">MÉTÉO J{{ g.day - 1 }} · DÉ {{ g.lastWeather.die }}</div>
              <div class="val" :style="{ color: WEATHER[g.lastWeather.weather].color }">{{ WEATHER[g.lastWeather.weather].label }}</div>
            </div>
          </template>
          <template v-else>
            <span class="ico muted">?</span>
            <div><div class="lbl">MÉTÉO</div><div class="val">Tirée à la résolution</div></div>
          </template>
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
            <div class="avatar">{{ (me.name[0] || '?').toUpperCase() }}</div>
            <div class="who">
              <div class="lbl">COMMANDANT {{ String(g.me + 1).padStart(2, '0') }} · {{ consoleState }}</div>
              <h2>{{ me.name }}</h2>
            </div>
          </div>

          <div class="stats">
            <div class="stat">
              <div class="k">Batteries</div>
              <div class="v lime">{{ me.batteries }}</div>
              <div class="cells">
                <i
                  v-for="i in Math.max(me.batteries, 1)" :key="i"
                  :class="i <= remaining ? 'on' : i <= me.batteries ? 'lock' : ''"
                />
              </div>
            </div>
            <div class="stat">
              <div class="k">Bouclier</div>
              <div class="v cyan">{{ shieldTotal(me) }}</div>
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
                <span :style="{ color: g.players[id].color, fontWeight: 700 }">{{ g.players[id].name }}</span>
                <template v-if="g.players[id].alive">
                  <span class="num">🔋 {{ g.players[id].batteries }}</span>
                  <span class="num">🛡 {{ shieldTotal(g.players[id]) }}</span>
                </template>
                <span v-else class="out">☠ jour {{ g.players[id].elimDay }}</span>
              </div>
            </div>
          </template>

          <div v-else-if="!me.alive" class="locked-msg">DÔME ÉTEINT — JOUR {{ me.elimDay }}</div>

          <!-- Ordres -->
          <template v-else>
            <div class="tiles">
              <button
                v-for="a in ACTIONS" :key="a.key"
                :class="['tile', { on: isOn(a), blocked: blockedByPact(a) }]" :style="{ '--a': a.color }"
                :disabled="blockedByPact(a)" :title="blockedByPact(a) ? 'Interdit pendant un pacte' : ''"
                @click="openKey = a.key"
              >
                <span class="ic"><span>{{ a.icon }}</span></span>
                <span class="nm">{{ a.name }}</span>
                <span class="sm">{{ summary(a) }}</span>
                <span v-if="!a.noAmount && draft[a.key] > 0" class="badge">{{ draft[a.key] }}</span>
              </button>
            </div>

            <v-dialog v-model="actionOpen" max-width="440">
              <div v-if="current" class="acard on modal" :style="{ '--a': current.color }">
                <div class="hd">
                  <div class="ic"><span>{{ current.icon }}</span></div>
                  <div style="flex:1"><div class="nm">{{ current.name }}</div><div class="tg">{{ current.tag }}</div></div>
                  <button class="btn ghost icon" title="Fermer" @click="openKey = null"><v-icon size="18">mdi-close</v-icon></button>
                </div>
                <div class="ds">{{ current.desc }}</div>
                <div v-if="current.key === 'bid'" class="lotchips">
                  <span v-for="(v, i) in g.lots" :key="i"><small>LOT {{ i + 1 }}</small> +{{ v }} 🔋</span>
                  <span v-if="!g.lots.length" class="empty">Aucun lot aujourd'hui</span>
                </div>
                <div v-if="!current.noAmount" class="stepper">
                  <button :disabled="!editable || draft[current.key] <= 0" @click="step(current.key, -1, $event)">−</button>
                  <div class="val">{{ draft[current.key] }}</div>
                  <button :disabled="!editable || remaining <= 0" @click="step(current.key, 1, $event)">+</button>
                </div>
                <select v-if="current.target" v-model="draft[current.target]" :disabled="!editable" @change="onTargetChange(current)">
                  <option :value="null">— Cible —</option>
                  <option v-for="o in others" :key="o.id" :value="o.id">
                    {{ o.p.name }} · 🔋{{ o.p.batteries }} 🛡{{ shieldTotal(o.p) }}
                  </option>
                </select>
                <div class="pv">{{ preview(current.key) }}</div>
                <div class="mfoot">
                  <span class="muted">Disponibles : <b class="lime">{{ remaining }}</b> 🔋</span>
                  <span v-if="!editable" class="muted">Ordres verrouillés</span>
                  <button class="btn primary" @click="openKey = null">OK</button>
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
                  {{ g.players[id].name }}<span v-if="id === g.me" class="muted"> (toi)</span>
                </span>
                <span
                  v-if="g.status === 'running' && g.players[id].alive"
                  :class="['status', g.ready[id] ? 'ready' : 'wait']"
                  :title="g.ready[id] ? 'Ordres validés pour ce tour' : 'Ordres pas encore validés'"
                >{{ g.ready[id] ? '✔ PRÊT' : '… EN ATTENTE' }}</span>
              </span>
              <template v-if="g.players[id].alive">
                <span class="num">🔋 {{ g.players[id].batteries }}</span>
                <span class="num">🛡 {{ shieldTotal(g.players[id]) }}</span>
              </template>
              <span v-else class="out">☠ jour {{ g.players[id].elimDay }}</span>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="ptitle">Évolution</div>
          <div class="tabs">
            <button :class="{ on: chartTab === 'b' }" @click="chartTab = 'b'">🔋 Batteries</button>
            <button :class="{ on: chartTab === 's' }" @click="chartTab = 's'">🛡 Boucliers</button>
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
      </main>

      <!-- Journal de bord -->
      <main v-else class="board">
        <section class="panel">
          <div class="ptitle">Journal de bord <span class="tag">{{ g.log.length }} tour(s)</span></div>
          <div class="log">
            <div v-for="e in g.log" :key="e.day" class="entry" :style="{ borderColor: WEATHER[e.weather].color }">
              <h4>
                JOUR {{ String(e.day).padStart(2, '0') }}
                <span>{{ WEATHER[e.weather].icon }} {{ WEATHER[e.weather].label }} · dé {{ e.die }}</span>
              </h4>
              <ul><li v-for="(l, i) in e.lines" :key="i"><LogLine :line="l" :players="g.players" /></li></ul>
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
import { ACTIONS, WEATHER, emptyOrders, spent, shieldTotal, timeLeft } from '../game';
import EvolutionChart from '../components/EvolutionChart.vue';
import LogLine from '../components/LogLine.vue';

const COLORS = ['#00f0ff', '#ff2bd6', '#9dff4a', '#ffb020', '#8a7dff', '#ff5470', '#2bffc6', '#f2f6ff'];
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
const chartTab = ref('b');
const openKey = ref(null);
const current = computed(() => ACTIONS.find((a) => a.key === openKey.value));
const actionOpen = computed({
  get: () => openKey.value !== null,
  set: (v) => { if (!v) openKey.value = null; },
});
const now = ref(Date.now());

const isHost = computed(() => g.value?.hostId === auth.user?.id);
const me = computed(() => g.value.players[g.value.me]);
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
  return `${g.value.maxDays} jours écoulés. ${win.name} l'emporte avec ${win.batteries} batteries.`;
});

// Classement : vivants d'abord, puis batteries, bouclier, jour d'élimination
const standings = computed(() => g.value.ranking ?? g.value.players
  .map((p, id) => ({ p, id }))
  .sort((a, b) => (b.p.alive - a.p.alive) || b.p.batteries - a.p.batteries
    || shieldTotal(b.p) - shieldTotal(a.p) || (b.p.elimDay || 0) - (a.p.elimDay || 0))
  .map((x) => x.id));

const shieldLeft = (l) => g.value.shieldDuration - (g.value.day - l.day);

function apply(data) {
  const prev = g.value;
  g.value = data;
  if (prev && prev.day !== data.day && data.status !== 'lobby') {
    const w = data.lastWeather && WEATHER[data.lastWeather.weather];
    toast(`Jour ${prev.day} résolu${w ? ` — ${w.icon} ${w.label}` : ''}`);
    dirty.value = false;
  }
  if (!dirty.value) draft.value = { ...emptyOrders(), ...data.myOrders };
}

async function load() {
  try {
    apply((await api.get(`/games/${props.id}`)).data);
  } catch (e) {
    toast(e.message);
    if (!g.value) router.replace('/');
  }
}

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

function onTargetChange(a) {
  dirty.value = true;
  const o = draft.value;
  if (a.key === 'pact' && o.pact != null && (o.atk || o.def)) {
    o.atk = 0;
    o.def = 0;
    o.atkTarget = null;
    toast('Pacte : attaque et défense retirées');
  }
}

const isOn = (a) => (a.noAmount ? draft.value.pact != null : draft.value[a.key] > 0);

/* Résumé court affiché sous l'icône */
function summary(a) {
  const o = draft.value;
  if (blockedByPact(a)) return '∞ pacte';
  if (!isOn(a)) return a.tag;
  if (!a.target) return a.key === 'gen' ? `→ +${Math.floor(o.gen * 1.5)}` : a.key === 'def' ? `🛡 +${o.def}` : `mise ${o.bid}`;
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
      return `→ si ${nm(o.pact)} accepte aussi : génération ×2`;
    case 'xfer':
      if (!o.xfer) return '';
      return o.xferTarget == null ? '⚠ choisis une cible' : `→ ${o.xfer} pour ${nm(o.xferTarget)}`;
    case 'bid': return o.bid ? `→ mise de ${o.bid} sur ${g.value.lots.length} lot(s)` : '';
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
