<template>
  <div class="absolute inset-0 flex flex-col items-center justify-center p-6 bg-surface-950/95">
    <div
      class="w-14 h-14 rounded-2xl bg-red-900/30 border border-red-800/50 flex items-center justify-center mb-4"
    >
      <IconAlertTriangle class="w-7 h-7 text-red-400" />
    </div>
    <p class="text-white/90 font-semibold text-lg mb-1">{{ t('camera.error') }}</p>
    <p class="text-white/60 text-sm mb-6">{{ message }}</p>
    <button
      class="w-full max-w-xs flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-brand-600 hover:bg-brand-500 text-white transition-all duration-200 active:scale-95"
      @click="$emit('retry')"
    >
      <IconPlay class="w-4 h-4" />
      {{ t('camera.retry') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '@/components/icons/IconAlertTriangle.vue'
import IconPlay from '@/components/icons/IconPlay.vue'

defineProps<{
  /** Error message to display below the title. */
  message: string
}>()

defineEmits<{ retry: [] }>()

const { t } = useI18n()
</script>
