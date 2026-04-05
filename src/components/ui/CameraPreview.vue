<template>
  <div class="relative w-full max-w-2xl mx-auto overflow-hidden rounded-lg bg-black aspect-video shadow-xl">
    <!-- Video Element -->
    <video
      ref="videoRef"
      class="w-full h-full object-cover"
      playsinline
    ></video>

    <!-- Overlay Canvas for Bounding Boxes -->
    <canvas
      ref="canvasRef"
      class="absolute top-0 left-0 w-full h-full pointer-events-none"
    ></canvas>

    <!-- Loading/Overlay State -->
    <div v-if="!isCameraActive && !isProcessing" class="absolute inset-0 flex items-center justify-center bg-gray-900/50 text-white">
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
        <component :is="isCameraActive ? 'IconStop' : 'IconPlay'" class="w-6 h-6" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useCamera } from '@/composables/useCamera'

const { 
  videoRef, 
  canvasRef, 
  isCameraActive, 
  isProcessing, 
  startCamera, 
  stopCamera 
} = useCamera()

// Placeholder icons for the demo (Replace with real SVG or Icon component)
const IconPlay = { template: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' }
const IconStop = { template: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>' }
</script>

<style scoped>
/* Using class-based selectors as per project conventions */
.video-container {
  @apply relative overflow-hidden rounded-lg bg-black transition-all duration-300;
}
</style>
