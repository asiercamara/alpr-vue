<template>
  <div class="relative">
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept="image/*,video/*"
      @change="handleFileSelect"
    />
    <button
      class="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm shadow-lg transition-all duration-200 active:scale-95 bg-surface-700 hover:bg-surface-600 text-surface-200 backdrop-blur-sm"
      @click="triggerFileSelect"
    >
      <IconUpload class="w-4 h-4" />
      <span>Subir archivo</span>
    </button>

    <!-- Processing overlay -->
    <div
      v-if="isProcessing"
      class="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/80 backdrop-blur-sm"
    >
      <div class="bg-surface-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-modal">
        <div class="text-center">
          <div class="relative w-12 h-12 mx-auto mb-4">
            <div class="absolute inset-0 rounded-full border-2 border-surface-600"></div>
            <div
              class="absolute inset-0 rounded-full border-2 border-brand-400 border-t-transparent animate-spin"
            ></div>
          </div>
          <p class="text-white font-medium mb-2">
            {{ statusText }}
          </p>
          <div class="w-full bg-surface-700 rounded-full h-2 mb-3">
            <div
              class="bg-brand-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
          <p class="text-surface-400 text-xs">{{ progress }}%</p>
          <button
            class="mt-4 px-4 py-2 text-sm rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors"
            @click="cancelProcessing"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStaticMedia } from '@/composables/useStaticMedia'
import IconUpload from '@/components/icons/IconUpload.vue'

const emit = defineEmits<{
  detection: []
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const { status, progress, processImage, processVideo, cancelProcessing } = useStaticMedia()

const isProcessing = computed(() => status.value === 'loading' || status.value === 'processing')

const statusText = computed(() => {
  switch (status.value) {
    case 'loading':
      return 'Cargando archivo...'
    case 'processing':
      return 'Analizando...'
    default:
      return ''
  }
})

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Reset input so same file can be selected again
  input.value = ''

  const canvas = document.createElement('canvas')

  if (file.type.startsWith('image/')) {
    await processImage(file, canvas)
  } else if (file.type.startsWith('video/')) {
    await processVideo(file, canvas)
  }

  if (status.value === 'done') {
    emit('detection')
  }
}
</script>
