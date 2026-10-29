<template>
  <span>
    <template v-for="(s, k) in parseLine(text)" :key="k">
      <b v-if="s.player !== undefined" class="pname" :style="{ '--c': players[s.player]?.color }">{{ players[s.player]?.name ?? '?' }}</b>
      <span v-else-if="s.room" class="room-tag">{{ roomName(s.room) }}</span>
      <template v-else>{{ s.text }}</template>
    </template>
  </span>
</template>

<script setup>
import { parseLine } from '../game';

const props = defineProps({
  text: { type: String, required: true },
  players: { type: Array, required: true },
  rooms: { type: Array, default: () => [] },
});

/* « dans {r:cuisine} » → « dans la Cuisine » */
const roomName = (id) => props.rooms.find((r) => r.id === id)?.the ?? id;
</script>
