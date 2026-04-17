<template>
  <div class="doc-callout doc-info" role="note">
    <InformationCircleIcon class="callout-icon" aria-hidden="true" />
    <div class="callout-content"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/outline'
</script>
