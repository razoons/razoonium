import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '../stores/auth';
import Login from '../views/Login.vue';
import Lobby from '../views/Lobby.vue';

const routes = [
  { path: '/login', component: Login, meta: { public: true } },
  { path: '/', component: Lobby },
  { path: '/game/:id', component: () => import('../views/Game.vue'), props: true },
  { path: '/rules', component: () => import('../views/Rules.vue'), meta: { public: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (!to.meta.public && !auth.token) return { path: '/login', query: { next: to.fullPath } };
  if (to.path === '/login' && auth.token) return '/';
});

export default router;
