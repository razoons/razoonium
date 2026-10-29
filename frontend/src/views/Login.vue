<template>
  <div class="page narrow" style="max-width:480px">
    <div class="panel" style="padding:28px">
      <h1 class="hero-title">Le Château des Ténèbres</h1>
      <p class="sub">Un tueur rôde parmi vous. Cachez-vous, écoutez, accusez… et frappez le premier.</p>

      <div class="tabs">
        <button :class="{ on: mode === 'login' }" @click="mode = 'login'">Connexion</button>
        <button :class="{ on: mode === 'register' }" @click="mode = 'register'">Inscription</button>
      </div>

      <form @submit.prevent="submit">
        <label class="field">
          <span>Pseudo</span>
          <input v-model.trim="username" class="input" autocomplete="username" maxlength="16" required />
        </label>
        <label class="field">
          <span>Mot de passe</span>
          <input
            v-model="password" class="input" type="password" minlength="6" required
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          />
        </label>
        <div class="error-msg">{{ error }}</div>
        <button class="btn primary block" type="submit" :disabled="busy">
          {{ mode === 'login' ? 'Franchir le pont-levis ▸' : 'Signer le registre ▸' }}
        </button>
      </form>

      <p class="muted" style="text-align:center;margin:20px 0 0;font-size:14px">
        Nouveau ? <router-link to="/rules">Lire les règles du jeu</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { setSession } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const mode = ref('login');
const username = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    const { data } = await api.post(`/auth/${mode.value}`, { username: username.value, password: password.value });
    setSession(data);
    router.replace(route.query.next || '/');
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
