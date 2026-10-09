<template>
  <div class="page narrow">
    <div class="stack">
      <div v-if="showPushInvite" class="panel notif-invite">
        <v-icon size="28" color="success">mdi-bell-ring-outline</v-icon>
        <div style="flex:1">
          <b>Sois prévenu à chaque tour</b>
          <div class="muted" style="font-size:14px">
            <template v-if="push.needsInstall">
              Sur iPhone, installe d'abord l'appli : Partager → « Sur l'écran d'accueil ».
            </template>
            <template v-else>Début de partie, résultat de chaque tour, rappel avant l'échéance.</template>
          </div>
        </div>
        <button v-if="push.needsInstall" class="btn primary" @click="install.helpOpen = true">Comment installer</button>
        <button v-else class="btn primary" :disabled="push.busy" @click="activatePush">Activer</button>
      </div>

      <div class="panel">
        <div class="ptitle">Mes parties <span class="tag">{{ games.length }}</span></div>
        <v-progress-linear v-if="loading" indeterminate color="primary" />
        <div v-else-if="!games.length" class="empty">
          Aucune partie. Crée un secteur ou rejoins tes amis avec leur code.
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
                <span>Code <b>{{ g.code }}</b></span>
                <span v-if="g.status === 'lobby'"><b>{{ g.playerCount }}</b> / 8 dômes</span>
                <span v-else>Jour <b>{{ Math.min(g.day, 15) }}</b> / 15</span>
                <span v-if="g.status === 'running' && g.alive"><v-icon class="mi" size="1.1em" :icon="ICONS.battery" /> <b>{{ g.batteries }}</b></span>
                <span v-if="g.status === 'running'"><v-icon class="mi" size="1.1em" :icon="ICONS.razoonium" /> <b>{{ g.razoonium }}</b></span>
                <span v-if="g.status === 'running' && g.deadline"><v-icon class="mi" size="1.1em" :icon="ICONS.timer" /> <b class="countdown">{{ timeLeft(g.deadline, now) }}</b></span>
              </div>
            </span>
            <span :class="['status', statusOf(g).cls]">{{ statusOf(g).label }}</span>
          </router-link>
        </div>
      </div>

      <div class="panel">
        <div class="ptitle">Rejoindre un secteur</div>
        <form style="display:flex;gap:10px" @submit.prevent="join">
          <input v-model="code" class="input code" placeholder="CODE" maxlength="6" required />
          <button class="btn primary" :disabled="code.length < 6 || busy">Rejoindre</button>
        </form>
      </div>

      <div class="panel">
        <div class="ptitle">Créer un secteur</div>
        <form @submit.prevent="create">
          <label class="field">
            <span>Nom de la partie</span>
            <input v-model.trim="name" class="input" maxlength="32" placeholder="Secteur 7" />
          </label>
          <div class="field">
            <span>Durée d'un tour</span>
            <div class="chips">
              <button
                v-for="h in [24, 12, 6, 1]" :key="h" type="button"
                :class="{ sel: turnHours === h }" @click="turnHours = h"
              >
                {{ h }}h
              </button>
            </div>
          </div>
          <label class="check" style="margin:6px 0 18px">
            <input v-model="earlyResolve" type="checkbox" />
            Résoudre le tour dès que tous les dômes ont validé
          </label>
          <button class="btn primary block" :disabled="busy">Initialiser la partie ▸</button>
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
import { timeLeft, ICONS } from '../game';
import { push, enablePush } from '../stores/push';
import { install } from '../stores/install';

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
const turnHours = ref(24);
const earlyResolve = ref(true);

function statusOf(g) {
  if (g.status === 'lobby') return { cls: 'lobby', label: 'LOBBY' };
  if (g.status === 'over') return { cls: 'over', label: 'TERMINÉE' };
  if (!g.alive) return { cls: 'out', label: 'ÉTEINT' };
  return { cls: 'wait', label: 'EN COURS' };
}

function colorOf(g) {
  if (g.status === 'lobby') return 'var(--violet)';
  if (g.status === 'over') return 'var(--muted)';
  return g.alive ? 'var(--cyan)' : 'var(--red)';
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
  name: name.value, turnHours: turnHours.value, earlyResolve: earlyResolve.value,
}));

const now = ref(Date.now());
let clock;
onMounted(() => {
  load();
  clock = setInterval(() => { now.value = Date.now(); }, 1000);
});
onBeforeUnmount(() => clearInterval(clock));
</script>
