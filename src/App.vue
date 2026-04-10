<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
    <!-- Header -->
    <header
      class="bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200/70 dark:border-surface-700/50 sticky top-0 z-40 h-14 px-4 sm:px-6"
    >
      <div class="max-w-5xl mx-auto h-full flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div
            class="bg-gradient-to-br from-brand-500 to-brand-700 p-2 rounded-xl shadow-glow-brand"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <div class="flex items-baseline gap-1">
              <span
                class="heading-display text-xl font-bold text-surface-900 dark:text-white tracking-tight"
                >ALPR</span
              >
              <span class="heading-display text-xl font-semibold text-brand-500">Vue</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            :class="[
              'w-2.5 h-2.5 rounded-full',
              appStore.cameraError
                ? 'bg-red-500'
                : appStore.isCameraActive
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-surface-400',
            ]"
            :title="statusTitle"
          ></span>
          <span class="text-sm font-medium text-surface-500 dark:text-white/70">
            {{
              appStore.cameraError ? 'Error' : appStore.isCameraActive ? 'Escaneando' : 'Esperando'
            }}
          </span>
          <!-- Feedback toggle -->
          <button
            class="ml-1 w-6 h-6 rounded-full border flex items-center justify-center transition-colors"
            :class="
              appStore.feedbackEnabled
                ? 'border-surface-300 dark:border-white/30 text-surface-400 dark:text-white/50 hover:text-brand-500 hover:border-brand-500'
                : 'border-red-300 dark:border-red-700/60 text-red-400 hover:text-red-500'
            "
            :title="
              appStore.feedbackEnabled
                ? 'Silenciar sonido y vibración'
                : 'Activar sonido y vibración'
            "
            @click="appStore.toggleFeedback()"
          >
            <IconVolumeOn v-if="appStore.feedbackEnabled" class="w-3 h-3" />
            <IconVolumeOff v-else class="w-3 h-3" />
          </button>
          <button
            class="w-6 h-6 rounded-full border border-surface-300 dark:border-white/30 flex items-center justify-center text-surface-400 dark:text-white/50 hover:text-brand-500 hover:border-brand-500 transition-colors text-xs font-bold"
            title="Cómo usar"
            @click="showHelp = true"
          >
            ?
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile fullscreen layout (camera active on small screens) -->
    <template v-if="isMobileCameraActive">
      <div style="height: calc(100svh - 3.5rem)">
        <CameraPreview :full-height="true" />
      </div>
      <BottomDrawer>
        <PlateList />
      </BottomDrawer>
    </template>

    <!-- Normal layout: inactive camera on any screen, or desktop with active camera -->
    <main v-else class="max-w-5xl mx-auto px-4 pb-12">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div class="lg:col-span-2">
          <CameraPreview />
        </div>
        <div class="lg:col-span-1">
          <PlateList />
        </div>
      </div>
    </main>

    <HelpSheet v-model="showHelp" />
    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import CameraPreview from '@/components/ui/CameraPreview.vue'
import PlateList from '@/components/ui/PlateList.vue'
import HelpSheet from '@/components/ui/HelpSheet.vue'
import BottomDrawer from '@/components/ui/BottomDrawer.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import IconVolumeOn from '@/components/icons/IconVolumeOn.vue'
import IconVolumeOff from '@/components/icons/IconVolumeOff.vue'
import { useAppStore } from '@/stores/appStore'

const appStore = useAppStore()
const showHelp = ref(false)

// Track viewport width to distinguish mobile vs desktop
const windowWidth = ref(window.innerWidth)
const LG_BREAKPOINT = 1024

function onResize() {
  windowWidth.value = window.innerWidth
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const isMobile = computed(() => windowWidth.value < LG_BREAKPOINT)
const isMobileCameraActive = computed(() => isMobile.value && appStore.isCameraActive)

const statusTitle = computed(() => {
  if (appStore.cameraError) return 'Error de cámara'
  if (appStore.isCameraActive) return 'Cámara activa, escaneando...'
  return 'Esperando activación de cámara'
})
</script>
