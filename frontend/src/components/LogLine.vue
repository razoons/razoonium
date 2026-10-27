<template>
  <span>
    <template v-for="(seg, i) in parseLine(line)" :key="i">
      <b v-if="seg.player !== undefined" :style="{ color: players[seg.player]?.color }">{{ players[seg.player]?.name }}</b>
      <v-icon
        v-else-if="seg.resource !== undefined" class="mi" size="1.15em"
        :icon="resources[seg.resource]?.icon" :style="{ color: resources[seg.resource]?.color }"
        :title="resources[seg.resource]?.name"
      />
      <v-icon v-else-if="seg.icon" class="mi" size="1.1em" :icon="ICONS[seg.icon]" />
      <template v-else>{{ seg.text }}</template>
    </template>
  </span>
</template>

<script setup>
import { parseLine, ICONS } from '../game';

defineProps({
  line: { type: String, required: true },
  players: { type: Array, required: true },
  resources: { type: Array, required: true },
});
</script>
