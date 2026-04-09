<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
    <!-- Header -->
    <header
      class="bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200/70 dark:border-surface-700/50 sticky top-0 z-40 py-3 px-6"
    >
      <div class="max-w-5xl mx-auto flex justify-between items-center">
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
          <span class="text-sm font-medium text-surface-600 dark:text-surface-300">
            {{
              appStore.cameraError ? 'Error' : appStore.isCameraActive ? 'Escaneando' : 'Esperando'
            }}
          </span>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 pb-12">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <!-- Main Camera Section -->
        <div class="lg:col-span-2 space-y-6">
          <CameraPreview />

          <Transition name="collapse">
            <div v-if="!appStore.isCameraActive" class="card p-5">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-1 h-5 bg-brand-500 rounded-full"></div>
                <h2
                  class="heading-display text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider"
                >
                  Cómo usar
                </h2>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="flex gap-3 items-start">
                  <span
                    class="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center flex-none"
                    >1</span
                  >
                  <p class="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                    Activa la cámara para comenzar el escaneo en tiempo real.
                  </p>
                </div>
                <div class="flex gap-3 items-start">
                  <span
                    class="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center flex-none"
                    >2</span
                  >
                  <p class="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                    Apunta la cámara directamente a la matrícula del vehículo.
                  </p>
                </div>
                <div class="flex gap-3 items-start">
                  <span
                    class="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center flex-none"
                    >3</span
                  >
                  <p class="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                    El sistema detectará automáticamente el texto y lo guardará en el historial.
                  </p>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Sidebar / History Section -->
        <div class="lg:col-span-1">
          <PlateList />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CameraPreview from '@/components/ui/CameraPreview.vue'
import PlateList from '@/components/ui/PlateList.vue'
import { useAppStore } from '@/stores/appStore'

const appStore = useAppStore()

const statusTitle = computed(() => {
  if (appStore.cameraError) return 'Error de cámara'
  if (appStore.isCameraActive) return 'Cámara activa, escaneando...'
  return 'Esperando activación de cámara'
})
</script>

<style>
.collapse-enter-active {
  transition: all 0.3s ease;
}
.collapse-leave-active {
  transition: all 0.2s ease-in;
}
.collapse-enter-from {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}
</style>
