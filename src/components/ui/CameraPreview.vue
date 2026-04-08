<template>
  <div class="relative w-full max-w-2xl mx-auto overflow-hidden rounded-lg bg-black aspect-video shadow-xl">
    <video
      ref="videoRef"
      class="w-full h-full object-cover"
      playsinline
    ></video>

    <canvas
      ref="canvasRef"
      class="absolute top-0 left-0 w-full h-full pointer-events-none"
    ></canvas>

    <!-- Camera error -->
    <div v-if="appStore.cameraError" class="absolute inset-0 flex items-center justify-center bg-red-900/80 text-white p-4 text-center rounded-lg">
      <div>
        <p class="font-semibold mb-1">Error de cámara</p>
        <p class="text-sm">{{ appStore.cameraError }}</p>
        <button @click="startCamera()" class="mt-3 px-4 py-2 bg-white text-red-700 rounded-lg text-sm font-medium">Reintentar</button>
      </div>
    </div>

    <!-- Model loading -->
    <div v-else-if="appStore.isModelLoading" class="absolute inset-0 flex items-center justify-center bg-gray-900/70 text-white rounded-lg">
      <div class="text-center">
        <div class="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p class="text-sm">Cargando modelo de detección...</p>
      </div>
    </div>

    <!-- Camera off -->
    <div v-else-if="!isCameraActive && !isProcessing" class="absolute inset-0 flex items-center justify-center bg-gray-900/50 text-white">
      <p class="text-lg font-medium">Cámara desactivada</p>
    </div>

    <!-- Controls -->
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
      <button
        @click="isCameraActive ? stopCamera() : startCamera()"
        :class="[
          'p-3 rounded-full shadow-lg transition-transform active:scale-95',
          isCameraActive ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
        ]"
      >
        <component :is="isCameraActive ? IconStop : IconPlay" class="w-6 h-6" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCamera } from '@/composables/useCamera'
import { useAppStore } from '@/stores/appStore'
import IconPlay from '@/components/icons/IconPlay.vue'
import IconStop from '@/components/icons/IconStop.vue'

const appStore = useAppStore()

const {
  videoRef,
  canvasRef,
  isCameraActive,
  isProcessing,
  startCamera,
  stopCamera,
} = useCamera()
</script>

<style scoped>
</style>