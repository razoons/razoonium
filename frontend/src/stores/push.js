import { reactive } from 'vue';
import api from '../api';

const supported = typeof window !== 'undefined'
  && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// Sur iPhone, le push n'existe que dans l'appli installée sur l'écran d'accueil
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

export const push = reactive({
  supported,
  needsInstall: !supported && isIos && !standalone,
  permission: supported ? Notification.permission : 'denied',
  subscribed: false,
  busy: false,
});

function base64ToBytes(base64) {
  const b64 = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

const registration = () => navigator.serviceWorker.ready;

/* Synchronise l'état local et ré-enregistre l'abonnement (il peut changer côté navigateur) */
export async function initPush() {
  if (!supported) return;
  const sub = await (await registration()).pushManager.getSubscription();
  push.subscribed = !!sub && Notification.permission === 'granted';
  if (push.subscribed) api.post('/push/subscribe', { subscription: sub.toJSON() }).catch(() => {});
}

export async function enablePush() {
  if (!supported) throw new Error('Notifications non disponibles sur ce navigateur.');
  push.busy = true;
  try {
    push.permission = await Notification.requestPermission();
    if (push.permission !== 'granted') throw new Error('Notifications refusées dans le navigateur.');
    const { data } = await api.get('/push/public-key');
    const reg = await registration();
    const sub = await reg.pushManager.getSubscription()
      || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(data.publicKey) });
    await api.post('/push/subscribe', { subscription: sub.toJSON() });
    push.subscribed = true;
  } finally {
    push.busy = false;
  }
}

export async function disablePush() {
  if (!supported) return;
  push.busy = true;
  try {
    const sub = await (await registration()).pushManager.getSubscription();
    if (sub) {
      await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe();
    }
    push.subscribed = false;
  } finally {
    push.busy = false;
  }
}
