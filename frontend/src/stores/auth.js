import { reactive } from 'vue';

const KEY = 'razoonium.session';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export const auth = reactive({ token: null, user: null, ...load() });

export function setSession({ token, user }) {
  auth.token = token;
  auth.user = user;
  localStorage.setItem(KEY, JSON.stringify({ token, user }));
}

export function logout() {
  auth.token = null;
  auth.user = null;
  localStorage.removeItem(KEY);
  if (location.pathname !== '/login') location.assign('/login');
}
