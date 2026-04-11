<template>
  <div
    :class="[
      'relative w-full overflow-hidden bg-surface-950',
      'shadow-camera transition-all duration-500',
      fullHeight
        ? isUploadActive
          ? 'max-h-full mx-auto rounded-none ring-0 aspect-video'
          : 'h-full rounded-none ring-0'
        : isCameraActive || isUploadActive
          ? 'rounded-2xl ring-2 ring-brand-500/50 aspect-video lg:aspect-video'
          : 'rounded-2xl ring-1 ring-surface-200 dark:ring-surface-700 aspect-[3/4] sm:aspect-video',
    ]"
  >
    <div
      :style="
        isDigitalZoom && zoomLevel > 1
          ? { transform: `scale(${zoomLevel})`, transformOrigin: 'center' }
          : undefined
      "
      class="w-full h-full transition-transform duration-200"
    >
      <video
        ref="videoRef"
        :class="[
          'w-full h-full',
          isUploadActive && appStore.uploadMediaType === 'video'
            ? 'object-contain'
            : 'object-cover',
          isUploadActive && appStore.uploadMediaType === 'image' ? 'hidden' : '',
        ]"
        playsinline
        :muted="true"
      ></video>

      <canvas
        ref="canvasRef"
        :class="[
          'top-0 left-0 w-full h-full pointer-events-none',
          isUploadActive && appStore.uploadMediaType === 'image'
            ? 'relative block object-contain'
            : isUploadActive && appStore.uploadMediaType === 'video'
              ? 'absolute object-contain'
              : 'absolute',
        ]"
      ></canvas>
    </div>

    <!-- Camera error -->
    <CameraErrorOverlay
      v-if="appStore.cameraError"
      :message="appStore.cameraError"
      @retry="startCamera()"
    />

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
      <p class="text-white/90 font-medium text-sm">{{ t('camera.loading') }}</p>
      <p class="text-white/60 text-xs mt-1">{{ t('camera.detection') }}</p>
    </div>

    <!-- Upload mode: close button + scanning indicator -->
    <template v-if="isUploadActive">
      <button
        class="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-surface-950/70 backdrop-blur-sm text-white/70 hover:text-white transition-colors"
        :title="t('camera.closeViewer')"
        @click="closeUploadViewer"
      >
        <IconClose class="w-5 h-5" />
      </button>

      <div
        class="absolute top-3 right-3 flex items-center gap-1.5 bg-surface-950/70 backdrop-blur-sm rounded-full px-2.5 py-1"
      >
        <span
          :class="[
            'w-2 h-2 rounded-full',
            staticMedia.isProcessing.value ? 'bg-brand-400 animate-pulse' : 'bg-emerald-400',
          ]"
        ></span>
        <span class="text-xs text-white/80 font-medium">{{
          staticMedia.isProcessing.value
            ? t('camera.scanning')
            : appStore.uploadMediaType === 'video'
              ? t('camera.processingVideo')
              : t('camera.analyzed')
        }}</span>
      </div>
    </template>

    <!-- Camera off (no upload) -->
    <div
      v-else-if="!isCameraActive"
      class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface-950 p-6"
    >
      <div class="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center">
        <IconCamera class="w-8 h-8 text-surface-400" />
      </div>
      <div class="text-center">
        <p class="text-white/90 font-medium">{{ t('camera.inactive') }}</p>
        <p class="text-white/60 text-sm mt-1">{{ t('camera.hint') }}</p>
      </div>
      <div class="w-full max-w-xs flex flex-col gap-4 mt-2">
        <button
          class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all duration-200 active:scale-95 bg-brand-600/90 hover:bg-brand-600 text-white backdrop-blur-sm"
          @click="startCamera()"
        >
          <IconPlay class="w-4 h-4" />
          <span>{{ t('camera.start') }}</span>
        </button>
        <MediaUploader />
      </div>
    </div>

    <!-- Camera mode: scanning indicator -->
    <div
      v-if="isCameraActive && !isUploadActive"
      class="absolute top-3 right-3 flex items-center gap-1.5 bg-surface-950/70 backdrop-blur-sm rounded-full px-2.5 py-1"
    >
      <span
        :class="[
          'w-2 h-2 rounded-full',
          isProcessing ? 'bg-brand-400 animate-pulse' : 'bg-emerald-400',
        ]"
      ></span>
      <span class="text-xs text-white/80 font-medium">{{
        isProcessing ? t('camera.scanning') : t('camera.live')
      }}</span>
    </div>

    <!-- Camera controls -->
    <div
      v-if="isCameraActive && !isUploadActive"
      :class="[
        'absolute left-1/2 -translate-x-1/2 flex items-center gap-3',
        fullHeight ? 'bottom-[96px]' : 'bottom-4',
      ]"
    >
      <button
        class="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg transition-all duration-200 active:scale-95 bg-red-500/90 hover:bg-red-500 text-white backdrop-blur-sm"
        @click="stopCamera()"
      >
        <IconStop class="w-4 h-4" />
        <span>{{ t('camera.stop') }}</span>
      </button>

      <button
        class="p-2.5 rounded-full bg-surface-800/80 hover:bg-surface-700 text-white/70 hover:text-white shadow-lg transition-all duration-200 backdrop-blur-sm"
        :title="t('camera.switchCamera')"
        @click="toggleCameraFacing()"
      >
        <IconFlipCamera class="w-4 h-4" />
      </button>

      <CameraZoomControls
        :zoom-level="zoomLevel"
        :max-zoom="maxZoom"
        @zoom-in="zoomIn()"
        @zoom-out="zoomOut()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCamera } from '@/composables/useCamera'
import { useStaticMedia } from '@/composables/useStaticMedia'
import { useAppStore } from '@/stores/appStore'
import IconPlay from '@/components/icons/IconPlay.vue'
import IconStop from '@/components/icons/IconStop.vue'
import IconCamera from '@/components/icons/IconCamera.vue'
import IconFlipCamera from '@/components/icons/IconFlipCamera.vue'
import IconClose from '@/components/icons/IconClose.vue'
import CameraErrorOverlay from './CameraErrorOverlay.vue'
import CameraZoomControls from './CameraZoomControls.vue'
import MediaUploader from './MediaUploader.vue'

defineProps<{ fullHeight?: boolean }>()

const { t } = useI18n()
const appStore = useAppStore()
const staticMedia = useStaticMedia()

const {
  videoRef,
  canvasRef,
  isCameraActive,
  isProcessing,
  startCamera,
  stopCamera,
  toggleCameraFacing,
  zoomLevel,
  maxZoom,
  isDigitalZoom,
  zoomIn,
  zoomOut,
} = useCamera()

const isUploadActive = computed(
  () => appStore.isUploadMode && !appStore.cameraError && !appStore.isModelLoading,
)

watch(
  () =>
    [
      appStore.isUploadMode,
      appStore.uploadMediaUrl,
      appStore.uploadMediaType,
      appStore.uploadFile,
    ] as const,
  async ([isUpload, url, type, file]) => {
    if (!isUpload || !url || !type) return

    const video = videoRef.value
    const canvas = canvasRef.value
    if (!video || !canvas) return

    await new Promise((r) => setTimeout(r, 50))

    if (type === 'image' && file) {
      await staticMedia.processImage(file, canvas)
    } else if (type === 'video') {
      staticMedia.setVideoSource(video, url)
      staticMedia.processVideoStream(video, canvas)
    }
  },
)

const closeUploadViewer = () => {
  staticMedia.cleanup()
  const video = videoRef.value
  if (video) {
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
  const ctx = canvasRef.value?.getContext('2d')
  if (ctx && canvasRef.value) {
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  }
  appStore.clearUploadMedia()
}

onUnmounted(() => {
  staticMedia.cleanup()
})
</script>
