<template>
  <span class="hearts" :title="`${pv} PV`">
    <v-icon v-for="k in max" :key="k" size="1em" :class="{ lost: k > pv }">{{ k > pv ? 'mdi-heart-outline' : 'mdi-heart' }}</v-icon>
  </span>
</template>

<script setup>
defineProps({
  pv: { type: Number, required: true },
  max: { type: Number, default: 3 },
});
</script>
