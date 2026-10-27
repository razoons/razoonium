<template>
  <div>
    <div class="legend">
      <span
        v-for="(p, id) in players" :key="p.uid"
        @pointerenter="hl = id" @pointerleave="hl = null"
      >
        <i :style="{ background: p.color }" />{{ p.name }}
      </span>
    </div>
    <div ref="box" :class="['chart', { hl: hl !== null }]">
      <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`">
        <g v-for="v in ticks" :key="'y' + v">
          <line :x1="m.l" :x2="W - m.r" :y1="y(v)" :y2="y(v)" stroke="rgba(123,147,173,.18)" />
          <text :x="m.l - 6" :y="y(v) + 4" text-anchor="end">{{ v }}</text>
        </g>
        <text
          v-for="k in dayTicks" :key="'x' + k"
          :x="x(k)" :y="H - 6" text-anchor="middle"
        >{{ k > maxDays ? 'Fin' : 'J' + k }}</text>
        <g v-for="s in series" :key="s.id" :class="['line', { on: hl === s.id }]">
          <polyline
            :points="s.points" fill="none" :stroke="s.color" stroke-width="2"
            stroke-linejoin="round" stroke-linecap="round"
          />
          <circle :cx="s.last[0]" :cy="s.last[1]" r="4" :fill="s.color" stroke="#0a1226" stroke-width="2" />
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  players: { type: Array, required: true },
  history: { type: Array, required: true },
  maxDays: { type: Number, default: 15 },
  metric: { type: String, default: 'r' }, // 'r' Razoonium, 't' stock total
});

const box = ref(null);
const W = ref(600);
const H = 220;
const m = { l: 30, r: 14, t: 10, b: 24 };
const hl = ref(null);
const nDays = computed(() => props.maxDays + 1);

const scale = computed(() => {
  const peak = Math.max(1, ...props.history.flatMap((h) => h.players.map((p) => p[props.metric] ?? 0)));
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]) {
    if (Math.ceil(peak / s) <= 5) return { max: Math.max(s, Math.ceil(peak / s) * s), step: s };
  }
  return { max: peak, step: peak };
});
const ticks = computed(() => {
  const out = [];
  for (let v = 0; v <= scale.value.max; v += scale.value.step) out.push(v);
  return out;
});
const dayTicks = computed(() => {
  const every = W.value < 520 ? 3 : 1;
  return Array.from({ length: nDays.value }, (_, i) => i + 1).filter((k) => (k - 1) % every === 0 || k === nDays.value);
});

const x = (k) => m.l + ((k - 1) / (nDays.value - 1)) * (W.value - m.l - m.r);
const y = (v) => m.t + (1 - v / scale.value.max) * (H - m.t - m.b);

const series = computed(() => props.players.map((p, id) => {
  const pts = props.history.map((h) => [x(h.day), y(h.players[id]?.[props.metric] ?? 0)]);
  const last = pts[pts.length - 1];
  return { id, color: p.color, points: pts.map((q) => q.join(',')).join(' '), last };
}));

let observer;
onMounted(() => {
  observer = new ResizeObserver(([e]) => { W.value = Math.max(280, Math.floor(e.contentRect.width)); });
  observer.observe(box.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
