<template>
  <div class="w-full max-w-2xl mx-auto mt-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Matrículas Detectadas</h2>
      <button
        class="text-sm text-red-500 hover:text-red-700 transition-colors"
        @click="plateStore.clearPlates()"
      >
        Limpiar lista
      </button>
    </div>

    <div v-if="plateStore.bestDetections.length === 0" class="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
      <p class="text-gray-500 dark:text-gray-400">No hay detecciones recientes</p>
    </div>

    <transition-group
      tag="div"
      name="list"
      class="space-y-2"
    >
      <div
        v-for="plate in plateStore.bestDetections"
        :key="plate.id"
        class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex items-center gap-4">
          <div class="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
            {{ plate.plateText.text }}
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
              {{ (plate.confidence * 100).toFixed(1) }}% Confianza
            </span>
            <span class="text-xs text-gray-400">
              {{ new Date(plate.timestamp).toLocaleTimeString() }}
            </span>
          </div>
        </div>

        <button
          class="p-2 text-gray-400 hover:text-blue-500 transition-colors"
          @click="viewDetails(plate)"
        >
          <span class="sr-only">Ver detalles</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </transition-group>

    <PlateModal :plate="selectedPlate" @close="selectedPlate = null" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePlateStore } from '@/stores/plateStore'
import type { PlateRecord } from '@/types/detection'
import PlateModal from './PlateModal.vue'

const plateStore = usePlateStore()
const selectedPlate = ref<PlateRecord | null>(null)

const viewDetails = (plate: PlateRecord) => {
  selectedPlate.value = plate
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>