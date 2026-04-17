<template>
  <div class="doc-step">
    <div class="doc-step-number" aria-hidden="true"></div>
    <div class="doc-step-content">
      <div class="doc-step-title">{{ title }}</div>
      <div class="doc-step-body"><slot /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
