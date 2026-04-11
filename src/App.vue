<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
    <!-- Header -->
    <header
      class="bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200/70 dark:border-surface-700/50 sticky top-0 z-40 h-14 px-4 sm:px-6"
    >
      <div class="max-w-5xl mx-auto h-full flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div
            class="bg-gradient-to-br from-brand-500 to-brand-700 p-1.5 rounded-xl shadow-glow-brand"
          >
            <img src="/android-chrome-192x192.png" alt="ALPR" class="w-7 h-7 rounded-lg" />
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
          <!-- Settings -->
          <button
            class="ml-1 w-6 h-6 rounded-full border border-surface-300 dark:border-white/30 flex items-center justify-center text-surface-400 dark:text-white/50 hover:text-brand-500 hover:border-brand-500 transition-colors"
            title="Configuración"
            @click="showSettings = true"
          >
            <IconSettings class="w-3 h-3" />
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

    <!-- Layout wrapper: fullscreen on mobile when active, grid otherwise -->
    <div
      :class="
        isMobileCameraActive
          ? 'fixed inset-x-0 top-14 bottom-0 z-10'
          : 'max-w-5xl mx-auto px-4 pb-12'
      "
    >
      <div :class="isMobileCameraActive ? 'h-full' : 'grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6'">
        <div :class="isMobileCameraActive ? 'h-full' : 'lg:col-span-2'">
          <CameraPreview :full-height="isMobileCameraActive" />
        </div>
        <div v-if="!isMobileCameraActive" class="lg:col-span-1">
          <PlateList />
        </div>
      </div>
    </div>

    <BottomDrawer v-if="isMobileCameraActive">
      <PlateList />
    </BottomDrawer>

    <HelpSheet v-model="showHelp" />
    <SettingsSheet v-model="showSettings" />
    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import CameraPreview from '@/components/ui/CameraPreview.vue'
import PlateList from '@/components/ui/PlateList.vue'
import HelpSheet from '@/components/ui/HelpSheet.vue'
import SettingsSheet from '@/components/ui/SettingsSheet.vue'
import BottomDrawer from '@/components/ui/BottomDrawer.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import IconSettings from '@/components/icons/IconSettings.vue'
import { useAppStore } from '@/stores/appStore'
import { useTheme } from '@/composables/useTheme'

const appStore = useAppStore()
const showHelp = ref(false)
const showSettings = ref(false)

useTheme()

// Track viewport width to distinguish mobile vs desktop
const windowWidth = ref(window.innerWidth)
const LG_BREAKPOINT = 1024

function onResize() {
  windowWidth.value = window.innerWidth
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const isMobile = computed(() => windowWidth.value < LG_BREAKPOINT)
const isMobileCameraActive = computed(
  () => isMobile.value && (appStore.isCameraActive || appStore.isUploadMode),
)

const statusTitle = computed(() => {
  if (appStore.cameraError) return 'Error de cámara'
  if (appStore.isCameraActive) return 'Cámara activa, escaneando...'
  return 'Esperando activación de cámara'
})
</script>
