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
          <router-link to="/rules" class="btn ghost icon" title="Règles">
            <v-icon size="18">mdi-book-open-variant</v-icon>
          </router-link>
          <button v-if="auth.user" class="btn ghost icon" title="Déconnexion" @click="logout">
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

    <v-snackbar v-model="needRefresh" :timeout="-1" location="top">
      Nouvelle version disponible
      <template #actions>
        <button class="btn primary" @click="updateServiceWorker()">Mettre à jour</button>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { auth, logout } from './stores/auth';
import { toastState } from './stores/toast';

const { needRefresh, updateServiceWorker } = useRegisterSW();
</script>
