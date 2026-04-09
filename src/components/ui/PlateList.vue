<template>
  <div class="w-full max-w-2xl mx-auto mt-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2.5">
        <h2 class="heading-display text-base font-semibold text-surface-900 dark:text-white">
          Matrículas Detectadas
        </h2>
        <span
          v-if="plateStore.bestDetections.length > 0"
          class="px-2 py-0.5 text-xs font-bold bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 rounded-full tabular-nums"
        >
          {{ plateStore.bestDetections.length }}
        </span>
      </div>
      <div v-if="plateStore.bestDetections.length > 0" class="flex items-center gap-2">
        <button
          class="btn-ghost flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20"
          @click="handleExport"
        >
          <IconDownload class="w-3.5 h-3.5" />
          Exportar CSV
        </button>
        <button
          class="btn-ghost flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          @click="plateStore.clearPlates()"
        >
          <IconTrash class="w-3.5 h-3.5" />
          Limpiar
        </button>
      </div>
    </div>

    <div
      v-if="plateStore.bestDetections.length === 0"
      class="flex flex-col items-center justify-center py-12 px-4 rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50"
    >
      <!-- Stylized plate illustration -->
      <div class="relative mb-5">
        <div
          class="w-20 h-12 rounded-lg border-2 border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 flex items-center justify-center"
        >
          <div class="flex gap-0.5">
            <div
              v-for="i in 7"
              :key="i"
              class="w-2 h-4 rounded-sm bg-surface-200 dark:bg-surface-700 animate-pulse"
              :style="`animation-delay: ${i * 0.1}s`"
            ></div>
          </div>
        </div>
        <!-- scan line -->
        <div
          class="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent opacity-60 animate-pulse"
        ></div>
      </div>
      <p class="text-sm font-medium text-surface-600 dark:text-surface-300">Sin detecciones</p>
      <p class="text-xs text-surface-400 dark:text-surface-500 mt-1 text-center">
        Activa la cámara o sube una imagen
      </p>
    </div>

    <transition-group tag="div" name="list" class="space-y-2">
      <PlateListItem
        v-for="plate in plateStore.bestDetections"
        :key="plate.id"
        :plate="plate"
        @view-details="viewDetails(plate)"
      />
    </transition-group>

    <PlateModal :plate="selectedPlate" @close="selectedPlate = null" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePlateStore } from '@/stores/plateStore'
import { downloadCSV } from '@/utils/export'
import type { PlateRecord } from '@/types/detection'
import PlateModal from './PlateModal.vue'
import PlateListItem from './PlateListItem.vue'
import IconTrash from '@/components/icons/IconTrash.vue'
import IconDownload from '@/components/icons/IconDownload.vue'

const plateStore = usePlateStore()
const selectedPlate = ref<PlateRecord | null>(null)

const viewDetails = (plate: PlateRecord) => {
  selectedPlate.value = plate
}

const handleExport = () => {
  downloadCSV(plateStore.bestDetections)
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.list-leave-active {
  transition: all 0.25s ease-in;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.97);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
