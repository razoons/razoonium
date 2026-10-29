<template>
  <!-- Tout le château d'un coup d'œil : réservé aux morts que le Tueur autorise à tout voir -->
  <div class="omni" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
    <div
      v-for="r in rooms" :key="r.id" class="cell"
      :style="{ gridColumn: r.x + 1, gridRow: r.y + 1 }"
    >
      <span v-if="links[r.id].right" class="link h" />
      <span v-if="links[r.id].down" class="link v" />
      <div :class="['room', { ghost: r.id === ghostRoom }]">
        <span class="head"><v-icon size="16" class="ico">{{ r.icon }}</v-icon>{{ r.name }}</span>
        <span v-if="byRoom[r.id].length" class="who">
          <span
            v-for="p in byRoom[r.id]" :key="p.id"
            :class="['chip', { killer: p.id === killer, hidden: p.hidden, dead: !p.alive }]" :style="{ '--c': p.color }"
            :title="chipTitle(p)"
          >
            <v-icon v-if="!p.alive" size="13">mdi-skull-outline</v-icon>
            <v-icon v-else-if="p.id === killer" size="13">mdi-knife</v-icon>
            <v-icon v-else-if="p.hidden" size="13">mdi-eye-off-outline</v-icon>
            {{ p.name }}<small v-if="p.alive" class="pv">{{ p.pv }}</small>
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  rooms: { type: Array, required: true },
  passages: { type: Array, required: true },
  players: { type: Array, required: true }, // [{ name, color }]
  state: { type: Array, required: true }, // [{ room, hidden, alive, pv }] même ordre que players
  killer: { type: Number, required: true },
  ghostRoom: { type: String, default: null }, // où erre mon fantôme
});

const cols = computed(() => Math.max(...props.rooms.map((r) => r.x)) + 1);
const byId = computed(() => Object.fromEntries(props.rooms.map((r) => [r.id, r])));

// Passages vers la droite et vers le bas de chaque salle (tous droits : un trait suffit)
const links = computed(() => {
  const out = Object.fromEntries(props.rooms.map((r) => [r.id, { right: false, down: false }]));
  props.passages.forEach(([a, b]) => {
    const [ra, rb] = [byId.value[a], byId.value[b]];
    const [first, second] = ra.x + ra.y <= rb.x + rb.y ? [ra, rb] : [rb, ra];
    out[first.id][second.x > first.x ? 'right' : 'down'] = true;
  });
  return out;
});

// Les vivants d'abord (le Tueur en tête), puis les cadavres
const byRoom = computed(() => {
  const out = Object.fromEntries(props.rooms.map((r) => [r.id, []]));
  props.state.forEach((s, id) => out[s.room]?.push({ id, ...props.players[id], ...s }));
  Object.values(out).forEach((list) => list.sort((a, b) => b.alive - a.alive || (b.id === props.killer) - (a.id === props.killer)));
  return out;
});

function chipTitle(p) {
  if (!p.alive) return `Cadavre de ${p.name}`;
  return `${p.name}${p.id === props.killer ? ' — le Tueur' : ''}${p.hidden ? ' (caché)' : ''} · ${p.pv} PV`;
}
</script>

<style scoped>
.omni{display:grid;gap:18px;user-select:none}
.cell{position:relative;display:flex}
.link{position:absolute;background:rgba(201,162,74,.45);z-index:0}
.link.h{top:50%;left:100%;width:18px;height:6px;transform:translateY(-50%)}
.link.v{left:50%;top:100%;height:18px;width:6px;transform:translateX(-50%)}
.room{position:relative;z-index:1;flex:1;min-height:84px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:6px;
  background:#1d1714;border:1.5px solid rgba(255,179,71,.35);border-radius:10px;text-align:center}
.room.ghost{border:2px dashed #b9c6ff}
.head{display:flex;align-items:center;gap:4px;color:var(--soft);font-family:'Crimson Pro';font-weight:600;font-size:15px;line-height:1.1}
.ico{color:var(--muted)}
.who{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;max-width:100%}
.chip{display:inline-flex;align-items:center;gap:2px;max-width:100%;padding:1px 7px;border-radius:12px;background:var(--c);color:#1a1006;
  font-family:'Crimson Pro';font-weight:700;font-size:14px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid #1a1006}
.chip .pv{margin-left:3px;padding:0 4px;border-radius:8px;background:rgba(0,0,0,.25);font-size:11px}
.chip.hidden{background:transparent;color:var(--c);border:1.5px dashed var(--c)}
.chip.killer{outline:2px solid var(--blood);outline-offset:1px}
.chip.dead{background:transparent;color:var(--muted);border:1px solid rgba(255,255,255,.2);text-decoration:line-through}
@media (max-width:600px){
  .omni{gap:12px}
  .link.h{width:12px}
  .link.v{height:12px}
  .room{padding:5px;min-height:70px}
  .head{font-size:13px}
  .head .ico{display:none}
  .chip{font-size:12px;padding:0 5px}
}
</style>
