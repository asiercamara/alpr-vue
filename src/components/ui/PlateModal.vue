<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="plate" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60" @click="$emit('close')" />
        <div class="relative bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
          <button
            @click="$emit('close')"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ✕
          </button>

          <canvas
            ref="cropCanvas"
            class="w-full rounded-lg mb-4 bg-gray-100 dark:bg-gray-700"
          />

          <div class="text-center mb-4">
            <p class="text-4xl font-mono font-bold text-gray-800 dark:text-white mb-2">
              {{ plate.plateText.text }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Confianza: {{ (plate.confidence * 100).toFixed(1) }}%
            </p>
          </div>

          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p class="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3">Confianza por carácter</p>
            <div class="flex gap-2 justify-center">
              <div v-for="(conf, i) in plate.plateText.confidence" :key="i" class="flex flex-col items-center gap-1">
                <div class="w-6 h-16 bg-gray-200 dark:bg-gray-600 rounded-sm flex flex-col justify-end">
                  <div
                    class="w-full rounded-sm transition-all"
                    :class="
                      conf > 0.9 ? 'bg-green-500' :
                      conf > 0.7 ? 'bg-yellow-400' :
                      conf > 0.5 ? 'bg-orange-400' :
                      'bg-red-500'
                    "
                    :style="{ height: `${Math.max(10, conf * 100)}%` }"
                  />
                </div>
                <span class="text-xs font-mono font-bold text-gray-700 dark:text-gray-200">
                  {{ plate.plateText.text[i] }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ (conf * 100).toFixed(0) }}%
                </span>
              </div>
            </div>
          </div>

          <div class="text-xs text-gray-500 dark:text-gray-400 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p><strong>ID:</strong> {{ plate.id }}</p>
            <p><strong>Detectado:</strong> {{ new Date(plate.timestamp).toLocaleString() }}</p>
          </div>

          <button
            @click="$emit('close')"
            class="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { PlateRecord } from '@/types/detection'

const props = defineProps<{
  plate: PlateRecord | null
}>()

defineEmits<{
  close: []
}>()

const cropCanvas = ref<HTMLCanvasElement | null>(null)

watchEffect(() => {
  if (props.plate?.croppedImage && cropCanvas.value) {
    const canvas = cropCanvas.value
    const ctx = canvas.getContext('2d')!

    const width = props.plate.croppedImage.width
    const height = props.plate.croppedImage.height

    canvas.width = width
    canvas.height = height

    ctx.drawImage(props.plate.croppedImage, 0, 0)
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>