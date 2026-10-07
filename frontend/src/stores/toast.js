import { reactive } from 'vue';

export const toastState = reactive({ show: false, text: '', color: 'secondary' });

export function toast(text, color = 'secondary') {
  Object.assign(toastState, { show: true, text, color });
}
