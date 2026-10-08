<template>
  <v-app>
    <div class="bg-grid" />
    <div class="scan" />

    <header class="top">
      <div class="top-row">
        <router-link to="/" class="brand">RAZOONIUM<small>LES DERNIERS DÔMES</small></router-link>
        <div class="spacer" />
        <span v-if="auth.user" class="who">Commandant <b>{{ auth.user.username }}</b></span>
        <div class="top-actions">
          <button
            v-if="auth.user && (push.supported || push.needsInstall)"
            :class="['btn', 'ghost', 'icon', { lit: push.subscribed }]" :disabled="push.busy"
            :title="push.subscribed ? 'Notifications activées — cliquer pour couper' : 'Activer les notifications'"
            @click="togglePush"
          >
            <v-icon size="18">{{ push.subscribed ? 'mdi-bell-ring' : 'mdi-bell-off-outline' }}</v-icon>
          </button>
          <router-link to="/rules" class="btn ghost icon" title="Règles">
            <v-icon size="18">mdi-book-open-variant</v-icon>
          </router-link>
          <button v-if="auth.user" class="btn ghost icon" title="Déconnexion" @click="signOut">
            <v-icon size="18">mdi-logout-variant</v-icon>
          </button>
        </div>
      </div>
      <!-- Sous-menu injecté par les pages (ex. onglets d'une partie) -->
      <div id="subnav" />
    </header>

    <v-main>
      <router-view />
    </v-main>

    <v-snackbar v-model="toastState.show" :timeout="2600" location="bottom">
      {{ toastState.text }}
    </v-snackbar>

    <!-- Bandeau d'installation, fixé en bas tant que l'appli n'est pas installée -->
    <transition name="slide-up">
      <div v-if="showInstallBar" class="install-bar">
        <v-icon size="26" color="secondary">mdi-cellphone-arrow-down</v-icon>
        <div class="txt">
          <b>Installe Razoonium</b>
          <span>Plein écran, accès direct, notifications de tour</span>
        </div>
        <button class="btn primary" @click="installApp">Installer</button>
        <button class="btn ghost icon" title="Plus tard" @click="dismissInstall"><v-icon size="18">mdi-close</v-icon></button>
      </div>
    </transition>

    <!-- Installation sur iPhone / iPad : pas d'invite native, on explique -->
    <v-dialog v-model="install.helpOpen" max-width="420">
      <div class="panel" style="padding:24px">
        <div class="ptitle">
          Installer Razoonium
          <button class="btn ghost icon" title="Fermer" @click="install.helpOpen = false"><v-icon size="18">mdi-close</v-icon></button>
        </div>
        <ol class="install-steps">
          <li>
            <v-icon size="22" color="primary">mdi-export-variant</v-icon>
            <span>Touche le bouton <b>Partager</b> de Safari (en bas de l'écran)</span>
          </li>
          <li>
            <v-icon size="22" color="primary">mdi-plus-box-outline</v-icon>
            <span>Choisis <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b></span>
          </li>
          <li>
            <v-icon size="22" color="primary">mdi-hexagon-outline</v-icon>
            <span>Ouvre <b>Razoonium</b> depuis la nouvelle icône : plein écran et notifications activables</span>
          </li>
        </ol>
        <button class="btn primary block" @click="install.helpOpen = false">Compris</button>
      </div>
    </v-dialog>

    <v-snackbar v-model="needRefresh" :timeout="-1" location="top">
      Nouvelle version disponible
      <template #actions>
        <button class="btn primary" @click="updateServiceWorker()">Mettre à jour</button>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { auth, logout } from './stores/auth';
import { toast, toastState } from './stores/toast';
import { push, initPush, enablePush, disablePush } from './stores/push';
import { install, promptInstall } from './stores/install';

const { needRefresh, updateServiceWorker } = useRegisterSW();

watch(() => auth.user, (user) => { if (user) initPush().catch(() => {}); }, { immediate: true });

// « Plus tard » : bandeau masqué 7 jours sur cet appareil
const DISMISS_KEY = 'razoonium.installDismissedAt';
const DISMISS_MS = 7 * 24 * 3600e3;
function readDismissed() {
  try {
    return Number(localStorage.getItem(DISMISS_KEY)) || 0;
  } catch {
    return 0;
  }
}
const dismissedAt = ref(readDismissed());
const showInstallBar = computed(() => install.available && Date.now() - dismissedAt.value > DISMISS_MS);

// Hauteur réservée en bas de page (barre Valider, notifications) : sur :root car les overlays Vuetify sont hors de v-app
watch(showInstallBar, (shown) => {
  document.documentElement.style.setProperty('--install-h', shown ? '68px' : '0px');
}, { immediate: true });

function dismissInstall() {
  dismissedAt.value = Date.now();
  try {
    localStorage.setItem(DISMISS_KEY, String(dismissedAt.value));
  } catch { /* stockage indisponible : masqué pour cette session seulement */ }
}

async function installApp() {
  if (await promptInstall()) toast('Razoonium installé');
}

async function togglePush() {
  if (push.needsInstall) {
    install.helpOpen = true;
    return;
  }
  try {
    if (push.subscribed) {
      await disablePush();
      toast('Notifications coupées');
    } else {
      await enablePush();
      toast('Notifications activées');
    }
  } catch (e) {
    toast(e.message);
  }
}

async function signOut() {
  await disablePush().catch(() => {});
  logout();
}
</script>
