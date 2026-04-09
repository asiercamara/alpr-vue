<template>
  <div
    :class="[
      'relative w-full max-w-2xl mx-auto overflow-hidden rounded-2xl bg-surface-950 aspect-video',
      'shadow-camera transition-all duration-500',
      isCameraActive ? 'ring-2 ring-brand-500/50' : 'ring-1 ring-surface-200 dark:ring-surface-700',
    ]"
  >
    <video ref="videoRef" class="w-full h-full object-cover" playsinline></video>

    <canvas
      ref="canvasRef"
      class="absolute top-0 left-0 w-full h-full pointer-events-none"
    ></canvas>

    <!-- Camera error -->
    <div
      v-if="appStore.cameraError"
      class="absolute inset-0 flex items-center justify-center p-6 bg-surface-950/95"
    >
      <div class="text-center max-w-xs">
        <div
          class="w-12 h-12 rounded-full bg-red-900/30 border border-red-800/50 flex items-center justify-center mx-auto mb-3"
        >
          <IconAlertTriangle class="w-6 h-6 text-red-400" />
        </div>
        <p class="text-white font-semibold mb-1">Error de cámara</p>
        <p class="text-surface-400 text-sm mb-4">{{ appStore.cameraError }}</p>
        <button class="btn-primary text-sm" @click="startCamera()">Reintentar</button>
      </div>
    </div>

    <!-- Model loading -->
    <div
      v-else-if="appStore.isModelLoading"
      class="absolute inset-0 flex items-center justify-center p-6 bg-surface-950/90 backdrop-blur-sm"
    >
      <div class="text-center">
        <div class="relative w-12 h-12 mx-auto mb-4">
          <div class="absolute inset-0 rounded-full border-2 border-brand-800"></div>
          <div
            class="absolute inset-0 rounded-full border-2 border-brand-400 border-t-transparent animate-spin"
          ></div>
          <div
            class="absolute inset-1 rounded-full border-2 border-brand-600 border-t-transparent animate-spin"
            style="animation-duration: 1.5s"
          ></div>
        </div>
        <div class="text-center">
          <p class="text-white font-medium text-sm">Cargando modelo</p>
          <p class="text-surface-400 text-xs mt-0.5">Detección de matrículas</p>
        </div>
      </div>
    </div>

    <!-- Camera off -->
    <div
      v-else-if="!isCameraActive && !isProcessing"
      class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface-950"
    >
      <div class="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center">
        <IconCamera class="w-8 h-8 text-surface-500" />
      </div>
      <div class="text-center">
        <p class="text-surface-300 font-medium">Cámara desactivada</p>
        <p class="text-surface-500 text-sm mt-1">Pulsa Iniciar para comenzar</p>
      </div>
    </div>

    <!-- Scanning indicator -->
    <div
      v-if="isCameraActive"
      class="absolute top-3 right-3 flex items-center gap-1.5 bg-surface-950/70 backdrop-blur-sm rounded-full px-2.5 py-1"
    >
      <span
        :class="[
          'w-2 h-2 rounded-full',
          isProcessing ? 'bg-brand-400 animate-pulse' : 'bg-surface-500',
        ]"
      ></span>
      <span class="text-xs text-surface-300 font-medium">{{
        isProcessing ? 'Escaneando' : 'En vivo'
      }}</span>
    </div>

    <!-- Controls -->
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2">
      <button
        :class="[
          'flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg',
          'transition-all duration-200 active:scale-95',
          isCameraActive
            ? 'bg-red-500/90 hover:bg-red-500 text-white backdrop-blur-sm'
            : 'bg-brand-600/90 hover:bg-brand-600 text-white backdrop-blur-sm',
        ]"
        @click="isCameraActive ? stopCamera() : startCamera()"
      >
        <component :is="isCameraActive ? IconStop : IconPlay" class="w-4 h-4" />
        <span>{{ isCameraActive ? 'Detener' : 'Iniciar cámara' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCamera } from '@/composables/useCamera'
import { useAppStore } from '@/stores/appStore'
import IconPlay from '@/components/icons/IconPlay.vue'
import IconStop from '@/components/icons/IconStop.vue'
import IconCamera from '@/components/icons/IconCamera.vue'
import IconAlertTriangle from '@/components/icons/IconAlertTriangle.vue'

const appStore = useAppStore()

const { videoRef, canvasRef, isCameraActive, isProcessing, startCamera, stopCamera } = useCamera()
</script>

<style scoped></style>
