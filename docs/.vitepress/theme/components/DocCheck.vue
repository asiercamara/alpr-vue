<template>
  <div class="doc-callout doc-check">
    <CheckCircleIcon class="callout-icon" aria-hidden="true" />
    <div class="callout-content"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon } from '@heroicons/vue/24/outline'
</script>
