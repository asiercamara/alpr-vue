<template>
  <div class="relative w-10 h-10 flex-shrink-0" :title="`Confianza: ${pct}%`">
    <svg class="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
      <!-- track -->
      <circle
        cx="18"
        cy="18"
        r="15.9"
        fill="none"
        stroke="currentColor"
        class="text-surface-200 dark:text-surface-700"
        stroke-width="2.5"
      />
      <!-- fill arc -->
      <circle
        cx="18"
        cy="18"
        r="15.9"
        fill="none"
        :stroke="ringColor"
        stroke-width="2.5"
        stroke-linecap="round"
        :stroke-dasharray="`${circumference * value} ${circumference * (1 - value)}`"
      />
    </svg>
    <!-- center label -->
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="text-[10px] font-bold tabular-nums" :style="{ color: ringColor }">{{
        pct
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { confidenceColor } from '@/utils/confidence'

interface Props {
  value?: number
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
})

const circumference = 2 * Math.PI * 15.9

const pct = computed(() => Math.round(props.value * 100))

const ringColor = computed(() => confidenceColor(props.value))
</script>
