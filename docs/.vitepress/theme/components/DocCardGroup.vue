<template>
  <div :class="`doc-card-group cols-${Number(cols) || 2}`">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ cols?: string | number }>()
</script>
