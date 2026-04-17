<template>
  <div class="doc-callout doc-warning" role="alert">
    <ExclamationTriangleIcon class="callout-icon" aria-hidden="true" />
    <div class="callout-content"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
</script>
