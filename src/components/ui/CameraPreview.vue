<template>
  <div
    :class="[
      'relative w-full overflow-hidden rounded-2xl bg-surface-950',
      'shadow-camera transition-all duration-500',
      isCameraActive
        ? 'ring-2 ring-brand-500/50 aspect-video lg:aspect-video'
        : 'ring-1 ring-surface-200 dark:ring-surface-700 aspect-[3/4] sm:aspect-video',
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
      class="absolute inset-0 flex flex-col items-center justify-center p-6 bg-surface-950/95"
    >
      <div
        class="w-14 h-14 rounded-2xl bg-red-900/30 border border-red-800/50 flex items-center justify-center mb-4"
      >
        <IconAlertTriangle class="w-7 h-7 text-red-400" />
      </div>
      <p class="text-white/90 font-semibold text-lg mb-1">Error de cámara</p>
      <p class="text-white/60 text-sm mb-6">{{ appStore.cameraError }}</p>
      <button
        class="w-full max-w-xs flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-brand-600 hover:bg-brand-500 text-white transition-all duration-200 active:scale-95"
        @click="startCamera()"
      >
        <IconPlay class="w-4 h-4" />
        Reintentar
      </button>
    </div>

    <!-- Model loading -->
    <div
      v-else-if="appStore.isModelLoading"
      class="absolute inset-0 flex flex-col items-center justify-center p-6 bg-surface-950/90 backdrop-blur-sm"
    >
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
      <p class="text-white/90 font-medium text-sm">Cargando modelo</p>
      <p class="text-white/60 text-xs mt-1">Detección de matrículas</p>
    </div>

    <!-- Camera off -->
    <div
      v-else-if="!isCameraActive && !isProcessing"
      class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface-950 p-6"
    >
      <div class="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center">
        <IconCamera class="w-8 h-8 text-surface-400" />
      </div>
      <div class="text-center">
        <p class="text-white/90 font-medium">Cámara desactivada</p>
        <p class="text-white/60 text-sm mt-1">Pulsa Iniciar o sube un archivo</p>
      </div>
      <div class="w-full max-w-xs flex flex-col gap-4 mt-2">
        <button
          class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all duration-200 active:scale-95 bg-brand-600/90 hover:bg-brand-600 text-white backdrop-blur-sm"
          @click="startCamera()"
        >
          <IconPlay class="w-4 h-4" />
          <span>Iniciar cámara</span>
        </button>
        <MediaUploader />
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
          isProcessing ? 'bg-brand-400 animate-pulse' : 'bg-emerald-400',
        ]"
      ></span>
      <span class="text-xs text-white/80 font-medium">{{
        isProcessing ? 'Escaneando' : 'En vivo'
      }}</span>
    </div>

    <!-- Controls when camera is active -->
    <div
      v-if="isCameraActive"
      class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3"
    >
      <button
        class="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg transition-all duration-200 active:scale-95 bg-red-500/90 hover:bg-red-500 text-white backdrop-blur-sm"
        @click="stopCamera()"
      >
        <IconStop class="w-4 h-4" />
        <span>Detener</span>
      </button>

      <button
        class="p-2.5 rounded-full bg-surface-800/80 hover:bg-surface-700 text-white/70 hover:text-white shadow-lg transition-all duration-200 backdrop-blur-sm"
        title="Cambiar cámara"
        @click="toggleCameraFacing()"
      >
        <IconFlipCamera class="w-4 h-4" />
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
import IconFlipCamera from '@/components/icons/IconFlipCamera.vue'
import MediaUploader from './MediaUploader.vue'

const appStore = useAppStore()

const {
  videoRef,
  canvasRef,
  isCameraActive,
  isProcessing,
  startCamera,
  stopCamera,
  toggleCameraFacing,
} = useCamera()
</script>
