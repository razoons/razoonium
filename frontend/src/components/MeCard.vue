<template>
  <div :class="['me-mini', { row }]" :style="{ '--c': player.color }">
    <div class="who">
      <span class="avatar">{{ (player.name[0] || '?').toUpperCase() }}</span>
      <b class="nm">{{ player.name }}</b>
    </div>
    <span :class="['role', killer ? 'killer' : 'survivor']">{{ killer ? 'TUEUR' : 'SURVIVANT' }}</span>
    <Hearts v-if="my.alive" :pv="my.pv" :max="maxPv" style="font-size:18px" />
    <span v-else class="status dead">MORT</span>
    <span v-if="my.alive && my.hidden" class="mini-fact hidden"><v-icon size="14">mdi-eye-off-outline</v-icon> Caché</span>
    <span v-if="my.position" class="mini-fact"><v-icon size="14">mdi-sort-numeric-ascending</v-icon> {{ my.position }}/{{ turnCount }}</span>
    <span v-if="killer && running" class="mini-fact">
      <v-icon size="14">mdi-lightbulb-off-outline</v-icon> {{ my.blackoutAvailable ? 'Blackout dispo' : 'Blackout utilisé' }}
    </span>
  </div>
</template>

<script setup>
import Hearts from './Hearts.vue';

// Fiche compacte du personnage : en colonne dans le coin de la carte, en ligne sur mobile
defineProps({
  player: { type: Object, required: true }, // { name, color }
  my: { type: Object, required: true },
  killer: { type: Boolean, default: false },
  running: { type: Boolean, default: false },
  maxPv: { type: Number, default: 3 },
  turnCount: { type: Number, default: 0 },
  row: { type: Boolean, default: false },
});
</script>
