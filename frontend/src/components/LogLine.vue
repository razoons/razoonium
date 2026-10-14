<template>
  <span>
    <template v-for="(seg, i) in parseLine(line)" :key="i">
      <b v-if="seg.player !== undefined" :style="{ color: players[seg.player]?.color }">{{ players[seg.player]?.name }}</b>
      <b v-else-if="seg.weather" :style="{ color: WEATHER[seg.weather].color }">{{ WEATHER[seg.weather].label }}</b>
      <v-icon
        v-else-if="seg.die" class="mi die" size="1.9em"
        :icon="`mdi-dice-${seg.die}`" :style="{ color: colorOf(seg.owner) }"
      />
      <span v-else-if="seg.duel || seg.free" class="duel">
        <template v-for="(side, k) in sides(seg)" :key="k">
          <span v-if="k === 1" class="vs">VS</span>
          <v-icon
            v-if="side" class="mi die" size="2.2em"
            :icon="`mdi-dice-${side.v}`" :class="{ lose: side.lose }" :style="{ color: side.color }"
          />
          <span v-else class="slot" />
        </template>
      </span>
      <v-icon v-else-if="seg.icon" class="mi" size="1.1em" :icon="ICONS[seg.icon]" />
      <template v-else>{{ seg.text }}</template>
    </template>
  </span>
</template>

<script setup>
import { parseLine, WEATHER, ICONS } from '../game';

const props = defineProps({
  line: { type: String, required: true },
  players: { type: Array, required: true },
});

const colorOf = (id) => (id === undefined ? undefined : props.players[id]?.color);

/* Face-à-face : [dé d'attaque, dé de défense], le perdant estompé ; un dé sans adversaire
   laisse l'autre case vide. Sans lanceur connu (anciens journaux), seul le gagnant est coloré. */
function sides(seg) {
  if (seg.free) {
    const die = { v: seg.v, color: colorOf(seg.p) };
    return seg.free === 'a' ? [die, null] : [null, die];
  }
  const { a, d, win, atkWon } = seg.duel;
  const color = (x, won) => (x.p !== undefined ? colorOf(x.p) : won ? colorOf(win) : undefined);
  return [
    { v: a.v, lose: !atkWon, color: color(a, atkWon) },
    { v: d.v, lose: atkWon, color: color(d, !atkWon) },
  ];
}
</script>
