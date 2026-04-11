<template>
  <div
    class="card p-3.5 hover:shadow-card-hover transition-shadow duration-200 cursor-pointer group"
    @click="$emit('view-details')"
  >
    <div class="flex items-center gap-3">
      <!-- Confidence ring indicator -->
      <ConfidenceRing :value="plate.confidence" class="flex-shrink-0" />

      <!-- Plate text + metadata -->
      <div class="flex-1 min-w-0">
        <div class="plate-text text-lg tracking-[0.15em]">
          {{ plate.plateText.text }}
        </div>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-xs text-surface-500 dark:text-white/60">{{ formattedTime }}</span>
          <span
            v-if="plate.occurrences && plate.occurrences > 1"
            class="text-xs px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-white/60 rounded-md"
          >
            ×{{ plate.occurrences }}
          </span>
        </div>
      </div>

      <!-- Arrow chevron -->
      <svg
        class="w-4 h-4 text-surface-300 group-hover:text-brand-500 transition-colors flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlateRecord } from '@/types/detection'
import ConfidenceRing from './ConfidenceRing.vue'

interface Props {
  plate: PlateRecord
}

const props = defineProps<Props>()

defineEmits<{
  'view-details': []
}>()

const formattedTime = computed(() => {
  return new Date(props.plate.timestamp).toLocaleTimeString()
})
</script>
