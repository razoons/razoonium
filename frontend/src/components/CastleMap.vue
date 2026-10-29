<template>
  <div :class="['castle', { dark }]">
    <!-- Vue locale : ma salle au centre, les salles adjacentes dans leur direction réelle -->
    <div :key="here" class="local">
      <svg class="passages" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true">
        <line
          v-for="n in neighbours" :key="n.room.id"
          x1="150" y1="150" :x2="150 + n.dx * 100" :y2="150 + n.dy * 100"
          vector-effect="non-scaling-stroke"
        />
      </svg>

      <component
        :is="clickable.includes(c.room.id) ? 'button' : 'div'"
        v-for="c in cells" :key="c.room.id"
        :class="['room', { here: c.center, go: movable.includes(c.room.id), open: clickable.includes(c.room.id) }]"
        :style="{ left: `${(1 + c.dx) * 33.333 + 16.667}%`, top: `${(1 + c.dy) * 33.333 + 16.667}%` }"
        :title="c.room.name"
        @click="clickable.includes(c.room.id) && emit('pick', c.room.id)"
      >
        <span class="head"><v-icon :size="c.center ? 28 : 22" class="ico">{{ c.room.icon }}</v-icon><span class="nm">{{ c.room.name }}</span></span>

        <!-- Moi, puis les joueurs visibles avec moi -->
        <span v-if="c.center && (self || companions.length)" class="mates">
          <span
            v-if="self" :class="['mate', 'self', { hidden: self.hidden, ghost: self.ghost }]" :style="{ '--c': self.color }"
            :title="self.ghost ? 'Ton fantôme (invisible)' : self.hidden ? 'Toi (caché)' : 'Toi'"
          ><v-icon size="15">{{ self.ghost ? 'mdi-ghost-outline' : self.hidden ? 'mdi-eye-off-outline' : 'mdi-account' }}</v-icon> {{ self.name }}</span>
          <span v-for="m in shownMates" :key="m.id" class="mate" :style="{ '--c': m.color }" :title="m.name">{{ m.name }}</span>
          <span v-if="hiddenMates.length" class="mate more" :title="hiddenMates.map((x) => x.name).join(', ')">+{{ hiddenMates.length }}</span>
        </span>

        <!-- Salle adjacente : ce qu'on en perçoit -->
        <span v-if="!c.center" class="clues">
          <span v-if="people[c.room.id]" class="clue people" :title="`${people[c.room.id]} personne(s) visible(s)`">
            <v-icon size="16">{{ people[c.room.id] > 1 ? 'mdi-account-multiple' : 'mdi-account' }}</v-icon>{{ people[c.room.id] }}
          </span>
          <span v-if="noise[c.room.id]?.steps" class="clue" :title="noiseTitle(noise[c.room.id])"><v-icon size="16">mdi-shoe-print</v-icon></span>
          <span v-if="noise[c.room.id]?.cries" class="clue cry" :title="noiseTitle(noise[c.room.id])"><v-icon size="16">mdi-bullhorn-variant-outline</v-icon></span>
        </span>
        <span v-if="!c.center && movable.includes(c.room.id)" class="go-hint"><v-icon size="16">mdi-shoe-print</v-icon> y aller</span>

        <span v-if="c.center && wallCount" class="wall" :title="`${wallCount} message(s) sur le mur`">
          <v-icon size="14">mdi-script-text-outline</v-icon>{{ wallCount }}
        </span>
      </component>
    </div>

    <!-- Coin haut-gauche, libre lui aussi : contenu fourni par la page (fiche du personnage) -->
    <div class="corner"><slot /></div>

    <!-- Mini-plan pour se repérer (coin toujours libre : les passages sont droits) -->
    <svg class="minimap" :viewBox="`0 0 ${cols * 10} ${rows * 10}`" aria-label="Plan du château">
      <line
        v-for="([a, b], k) in passages" :key="k"
        :x1="byId[a].x * 10 + 5" :y1="byId[a].y * 10 + 5" :x2="byId[b].x * 10 + 5" :y2="byId[b].y * 10 + 5"
      />
      <rect
        v-for="r in rooms" :key="r.id" :x="r.x * 10 + 1.5" :y="r.y * 10 + 1.5" width="7" height="7" rx="1.5"
        :class="{ here: r.id === here, near: adjacent.includes(r.id) }"
      ><title>{{ r.name }}</title></rect>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDisplay } from 'vuetify';

const props = defineProps({
  rooms: { type: Array, required: true },
  passages: { type: Array, required: true },
  here: { type: String, required: true },
  adjacent: { type: Array, default: () => [] },
  clickable: { type: Array, default: () => [] }, // salles qu'on peut toucher pour ouvrir leur modale
  movable: { type: Array, default: () => [] }, // salles où l'on peut se rendre ce tour
  noise: { type: Object, default: () => ({}) }, // { roomId: { steps, cries } } entendus cette manche
  people: { type: Object, default: () => ({}) }, // { roomId: joueurs visibles dans une salle adjacente }
  self: { type: Object, default: null }, // { name, color, hidden, ghost } : moi (ou mon fantôme), sur ma salle
  companions: { type: Array, default: () => [] }, // [{ id, name, color }] joueurs visibles dans ma salle
  dark: { type: Boolean, default: false },
  wallCount: { type: Number, default: 0 }, // messages lisibles sur le mur de ma salle
});
const emit = defineEmits(['pick']);

// Trop de monde dans ma salle : quelques noms, puis « +N » (la liste complète est dans la modale de la salle)
const { xs } = useDisplay();
const shownMates = computed(() => props.companions.slice(0, xs.value ? 2 : 7));
const hiddenMates = computed(() => props.companions.slice(shownMates.value.length));

const cols = computed(() => Math.max(...props.rooms.map((r) => r.x)) + 1);
const rows = computed(() => Math.max(...props.rooms.map((r) => r.y)) + 1);
const byId = computed(() => Object.fromEntries(props.rooms.map((r) => [r.id, r])));

// Direction de chaque salle adjacente par rapport à la mienne (-1, 0 ou 1 sur chaque axe)
const neighbours = computed(() => {
  const h = byId.value[props.here];
  return props.adjacent.map((id) => {
    const r = byId.value[id];
    return { room: r, dx: Math.sign(r.x - h.x), dy: Math.sign(r.y - h.y) };
  });
});
const cells = computed(() => [{ room: byId.value[props.here], dx: 0, dy: 0, center: true }, ...neighbours.value]);

function noiseTitle({ steps, cries }) {
  const parts = [];
  if (steps) parts.push(`des pas (${steps} fois)`);
  if (cries) parts.push(cries > 1 ? `${cries} cris` : 'un cri');
  return `Entendu de ce côté cette manche : ${parts.join(', ')}`;
}
</script>

<style scoped>
.castle{position:relative;width:100%;height:clamp(420px, 72vw, 680px);user-select:none}
.local{position:absolute;inset:0;animation:arrive .35s ease-out}
@keyframes arrive{from{opacity:0;transform:scale(.97)}}
.passages{position:absolute;inset:0;width:100%;height:100%}
.passages line{stroke:rgba(255,179,71,.55);stroke-width:14;stroke-linecap:round}

.room{
  position:absolute;transform:translate(-50%,-50%);width:30%;height:29%;padding:10px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;
  background:#1d1714;border:1.5px solid rgba(255,179,71,.45);border-radius:12px;color:var(--soft);
  font-family:'Crimson Pro';font-weight:600;line-height:1.05;transition:.15s;
}
.head{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:clamp(15px, 2.2vw, 22px)}
.room .ico{color:var(--muted)}
.room.here{width:32%;height:31%;background:#3a2a17;border:2px solid var(--candle);color:var(--text);box-shadow:0 0 24px rgba(255,179,71,.4);z-index:1}
.room.here .head{font-size:clamp(17px, 2.6vw, 26px)}
.room.here .ico{color:var(--candle)}
.room.open{cursor:pointer}
.room.open:hover{filter:brightness(1.25)}
.room.go{border-style:dashed;border-color:var(--candle)}
.go-hint{display:inline-flex;align-items:center;gap:4px;color:var(--candle);font-family:'Cinzel';font-size:12px;opacity:.85}

.mates{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;max-width:100%}
.mate{display:inline-flex;align-items:center;gap:3px;max-width:100%;padding:3px 10px;border-radius:14px;background:var(--c);color:#1a1006;
  font-family:'Crimson Pro';font-size:clamp(13px, 1.8vw, 16px);font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  border:1px solid #1a1006;box-shadow:0 0 6px color-mix(in srgb, var(--c) 60%, transparent)}
.mate.more{background:rgba(255,255,255,.12);color:var(--text);border-color:rgba(255,255,255,.25)}
.mate.self{background:transparent;color:var(--c);border:2px solid var(--c);box-shadow:0 0 10px color-mix(in srgb, var(--c) 45%, transparent)}
.mate.self.hidden{border-style:dashed;opacity:.75}
.mate.self.ghost{border-style:dotted;color:#b9c6ff;border-color:#b9c6ff;box-shadow:0 0 10px rgba(185,198,255,.4);opacity:.85}

.clues{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.clue{display:inline-flex;align-items:center;gap:2px;padding:1px 8px;border-radius:12px;background:rgba(255,255,255,.06);color:var(--soft);font-size:14px;font-weight:700}
.clue.people{background:var(--gold);color:#1a1006}
.clue.cry{color:#ff7a82;animation:breathe 1.2s ease-in-out infinite}
.wall{position:absolute;bottom:-11px;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:2px;padding:0 8px 0 6px;
  border-radius:10px;background:#b9c6ff;color:#10142a;font-size:13px;font-weight:700;line-height:20px;white-space:nowrap}

.corner{position:absolute;top:0;left:0;width:31%;z-index:2}
.minimap{position:absolute;top:2%;right:2%;width:clamp(70px, 14%, 120px);height:auto;opacity:.9;pointer-events:auto}
.minimap line{stroke:rgba(201,162,74,.35);stroke-width:1.2}
.minimap rect{fill:#2a211b;stroke:rgba(201,162,74,.4);stroke-width:.5}
.minimap rect.near{fill:#4a3820}
.minimap rect.here{fill:var(--candle);stroke:#fff}

.castle.dark .room{background:#101019;border-color:rgba(90,111,168,.45)}
.castle.dark .room.here{background:#1c1f33;border-color:var(--night);box-shadow:0 0 18px rgba(90,111,168,.5)}
.castle.dark .passages line{stroke:rgba(90,111,168,.5)}
@keyframes breathe{50%{opacity:.6}}
@media (max-width:600px){
  .castle{height:clamp(440px, 125vw, 520px)}
  .room{padding:6px;gap:6px}
  .room.here .ico{display:none}
  .mates{gap:3px}
  .mate{padding:1px 7px;font-size:12px}
}
</style>
