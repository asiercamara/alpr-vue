<template>
  <div class="doc-callout doc-tip">
    <LightBulbIcon class="callout-icon" aria-hidden="true" />
    <div class="callout-content"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { LightBulbIcon } from '@heroicons/vue/24/outline'
</script>
