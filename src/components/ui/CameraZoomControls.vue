<template>
  <div class="flex items-center gap-1.5">
    <button
      :class="[
        'p-2 rounded-full shadow-lg transition-all duration-200 backdrop-blur-sm',
        zoomLevel <= 1
          ? 'bg-surface-800/40 text-white/20 cursor-not-allowed'
          : 'bg-surface-800/80 hover:bg-surface-700 text-white/70 hover:text-white active:scale-95',
      ]"
      :disabled="zoomLevel <= 1"
      :title="t('camera.zoomOut')"
      @click="$emit('zoomOut')"
    >
      <IconZoomOut class="w-4 h-4" />
    </button>

    <span
      v-if="zoomLevel > 1"
      class="min-w-[2.5rem] text-center text-xs font-semibold text-white/80 bg-surface-800/70 backdrop-blur-sm rounded-full px-1.5 py-0.5"
    >
      {{ zoomLevel.toFixed(1) }}x
    </span>

    <button
      :class="[
        'p-2 rounded-full shadow-lg transition-all duration-200 backdrop-blur-sm',
        zoomLevel >= maxZoom
          ? 'bg-surface-800/40 text-white/20 cursor-not-allowed'
          : 'bg-surface-800/80 hover:bg-surface-700 text-white/70 hover:text-white active:scale-95',
      ]"
      :disabled="zoomLevel >= maxZoom"
      :title="t('camera.zoomIn')"
      @click="$emit('zoomIn')"
    >
      <IconZoomIn class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconZoomIn from '@/components/icons/IconZoomIn.vue'
import IconZoomOut from '@/components/icons/IconZoomOut.vue'

defineProps<{
  /** Current zoom level (1.0 = no zoom). */
  zoomLevel: number
  /** Maximum achievable zoom level. */
  maxZoom: number
}>()

defineEmits<{
  zoomIn: []
  zoomOut: []
}>()

const { t } = useI18n()
</script>
