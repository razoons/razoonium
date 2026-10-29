<template>
  <div>
    <div ref="list" class="chat">
      <div v-if="!messages.length" class="empty">Aucun message pour l'instant.</div>
      <div v-for="m in messages" :key="m.id" :class="['msg', { mine: m.idx === me }]">
        <b class="pname" :style="{ '--c': players[m.idx]?.color }">{{ players[m.idx]?.name ?? m.name }}</b>
        <span>{{ m.text }}</span>
        <span v-if="m.round" class="r">manche {{ m.round }}</span>
      </div>
    </div>
    <form v-if="canPost" class="chat-form" @submit.prevent="send">
      <input v-model="text" class="input" maxlength="300" placeholder="Accuse, défends-toi, mens…" />
      <button class="btn primary" :disabled="!text.trim() || busy"><v-icon size="18">mdi-send</v-icon></button>
    </form>
    <p v-else class="muted" style="margin:0;font-style:italic">{{ reason }}</p>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';

const props = defineProps({
  messages: { type: Array, required: true },
  players: { type: Array, required: true },
  me: { type: Number, default: -1 },
  canPost: { type: Boolean, default: false },
  reason: { type: String, default: '' },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['send']);

const text = ref('');
const list = ref(null);

function send() {
  const t = text.value.trim();
  if (!t) return;
  emit('send', t);
  text.value = '';
}

// défile en bas à chaque nouveau message
const scroll = () => nextTick(() => { if (list.value) list.value.scrollTop = list.value.scrollHeight; });
watch(() => props.messages.length, scroll);
onMounted(scroll);
</script>
