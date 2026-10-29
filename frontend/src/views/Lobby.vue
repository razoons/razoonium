<template>
  <div class="page narrow">
    <div class="stack">
      <div v-if="showPushInvite" class="panel notif-invite">
        <v-icon size="28" color="success">mdi-bell-ring-outline</v-icon>
        <div style="flex:1">
          <b>Sois prévenu quand c'est ton tour</b>
          <div class="muted" style="font-size:15px">
            <template v-if="push.needsInstall">
              Sur iPhone, installe d'abord l'appli : Partager → « Sur l'écran d'accueil ».
            </template>
            <template v-else>Ton tour d'agir, la fin de chaque manche, la fin de la partie.</template>
          </div>
        </div>
        <button v-if="push.needsInstall" class="btn primary" @click="install.helpOpen = true">Comment installer</button>
        <button v-else class="btn primary" :disabled="push.busy" @click="activatePush">Activer</button>
      </div>

      <div class="panel">
        <div class="ptitle">Mes parties <span class="tag">{{ games.length }}</span></div>
        <v-progress-linear v-if="loading" indeterminate color="primary" />
        <div v-else-if="!games.length" class="empty">
          Aucune partie. Ouvre un château ou rejoins tes amis avec leur code.
        </div>
        <div class="glist">
          <router-link
            v-for="g in games" :key="g.id" :to="`/game/${g.id}`" class="gcard"
            :style="{ '--c': colorOf(g) }"
          >
            <span class="bar" />
            <span>
              <div class="nm">{{ g.name }}</div>
              <div class="meta">
                <template v-if="g.legacy"><span>Ancien jeu</span></template>
                <template v-else-if="g.status === 'lobby'">
                  <span>Code <b>{{ g.code }}</b></span>
                  <span><b>{{ g.playerCount }}</b> / {{ g.maxPlayers }} joueurs</span>
                </template>
                <template v-else>
                  <span>Manche <b>{{ g.round }}</b></span>
                  <span><b>{{ g.playerCount }}</b> joueurs</span>
                  <span v-if="g.alive"><Hearts :pv="g.pv" /></span>
                  <span v-if="g.status === 'running' && g.deadline">
                    <v-icon class="mi" size="1.1em">mdi-timer-sand</v-icon> <b class="countdown">{{ timeLeft(g.deadline, now) }}</b>
                  </span>
                </template>
              </div>
            </span>
            <span :class="['status', statusOf(g).cls]">{{ statusOf(g).label }}</span>
          </router-link>
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">Rejoindre un château</div>
        <form style="display:flex;gap:10px" @submit.prevent="join">
          <input v-model="code" class="input code" placeholder="CODE" maxlength="6" required />
          <button class="btn primary" :disabled="code.length < 6 || busy">Entrer</button>
        </form>
      </div>

      <div class="panel">
        <div class="ptitle">Ouvrir un château</div>
        <form @submit.prevent="create">
          <label class="field">
            <span>Nom de la partie</span>
            <input v-model.trim="name" class="input" maxlength="32" placeholder="Château de Montfaucon" />
          </label>
          <div class="field">
            <span>Temps pour agir à son tour</span>
            <div class="chips">
              <button
                v-for="s in TURN_CHOICES" :key="s" type="button"
                :class="{ sel: turnSeconds === s }" @click="turnSeconds = s"
              >{{ duration(s) }}</button>
            </div>
          </div>
          <p class="muted" style="margin:0 0 16px;font-size:15px">
            Délais courts pour jouer ensemble en direct, longs pour une partie au fil des jours avec notifications.
          </p>
          <button class="btn primary block" :disabled="busy">Ouvrir les portes ▸</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { toast } from '../stores/toast';
import { TURN_CHOICES, duration, timeLeft } from '../game';
import { push, enablePush } from '../stores/push';
import { install } from '../stores/install';
import Hearts from '../components/Hearts.vue';

const showPushInvite = computed(() => !push.subscribed
  && (push.needsInstall || (push.supported && push.permission !== 'denied')));

async function activatePush() {
  try {
    await enablePush();
    toast('Notifications activées');
  } catch (e) {
    toast(e.message);
  }
}

const router = useRouter();
const games = ref([]);
const loading = ref(true);
const busy = ref(false);
const code = ref('');
const name = ref('');
const turnSeconds = ref(180);

function statusOf(g) {
  if (g.legacy) return { cls: 'over', label: 'ARCHIVE' };
  if (g.status === 'lobby') return { cls: 'lobby', label: 'SALON' };
  if (g.status === 'over') return { cls: 'over', label: 'TERMINÉE' };
  if (g.alive === false) return { cls: 'dead', label: 'MORT' };
  if (g.myTurn) return { cls: 'turn', label: 'À TOI' };
  return { cls: 'wait', label: 'EN COURS' };
}

function colorOf(g) {
  if (g.legacy || g.status === 'over') return 'var(--muted)';
  if (g.status === 'lobby') return 'var(--night)';
  return g.myTurn ? 'var(--candle)' : 'var(--gold)';
}

async function load() {
  try {
    games.value = (await api.get('/games')).data;
  } catch (e) {
    toast(e.message);
  } finally {
    loading.value = false;
  }
}

async function go(request) {
  busy.value = true;
  try {
    const { data } = await request();
    router.push(`/game/${data.id}`);
  } catch (e) {
    toast(e.message);
  } finally {
    busy.value = false;
  }
}

const join = () => go(() => api.post('/games/join', { code: code.value }));
const create = () => go(() => api.post('/games', {
  name: name.value, turnSeconds: turnSeconds.value,
}));

const now = ref(Date.now());
let clock;
let poll;
onMounted(() => {
  load();
  clock = setInterval(() => { now.value = Date.now(); }, 1000);
  poll = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000);
});
onBeforeUnmount(() => {
  clearInterval(clock);
  clearInterval(poll);
});
</script>
