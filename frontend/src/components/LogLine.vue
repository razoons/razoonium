<template>
  <span>
    <template v-for="(seg, i) in parseLine(line)" :key="i">
      <b v-if="seg.player !== undefined" :style="{ color: players[seg.player]?.color }">{{ players[seg.player]?.name }}</b>
      <b v-else-if="seg.weather" :style="{ color: WEATHER[seg.weather].color }">{{ WEATHER[seg.weather].label }}</b>
      <template v-else>{{ seg.text }}</template>
    </template>
  </span>
</template>

<script setup>
import { parseLine, WEATHER } from '../game';

defineProps({
  line: { type: String, required: true },
  players: { type: Array, required: true },
});
</script>
