import { reactive } from 'vue';

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS se déclare Mac
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

let deferredPrompt = null;

export const install = reactive({
  // Chrome/Edge/Android : invite native disponible ; iOS : instructions manuelles
  canPrompt: false,
  isIos,
  installed: standalone(),
  helpOpen: false,
  get available() {
    return !this.installed && (this.canPrompt || this.isIos);
  },
});

// Enregistré dès le chargement du module : l'évènement peut arriver avant le montage de l'appli
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  install.canPrompt = true;
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  install.canPrompt = false;
  install.installed = true;
});

export async function promptInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    install.canPrompt = false;
    return outcome === 'accepted';
  }
  install.helpOpen = true;
  return false;
}
