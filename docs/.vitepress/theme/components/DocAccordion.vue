<template>
  <details class="doc-accordion">
    <summary class="doc-accordion-summary">
      <span>{{ title }}</span>
      <ChevronDownIcon class="doc-accordion-chevron" aria-hidden="true" />
    </summary>
    <div class="doc-accordion-body">
      <slot />
    </div>
  </details>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from '@heroicons/vue/24/outline'

defineProps<{ title: string }>()
</script>
