<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="plate" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-surface-950/70 backdrop-blur-sm" @click="$emit('close')" />
        <div
          class="modal-content relative bg-white dark:bg-surface-850 rounded-modal shadow-modal max-w-md w-full overflow-hidden"
        >
          <!-- Canvas section -->
          <div class="bg-surface-950 rounded-t-modal overflow-hidden">
            <canvas ref="cropCanvas" class="w-full max-h-32 object-contain" />
            <div v-if="!plate?.croppedImage" class="h-24 flex items-center justify-center">
              <p class="text-surface-500 dark:text-surface-200 text-xs">Sin imagen disponible</p>
            </div>
          </div>

          <!-- Close button -->
          <button
            class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 dark:text-surface-200 hover:text-surface-700 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors z-10"
            @click="$emit('close')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <!-- Content -->
          <div class="p-5">
            <!-- Plate text with edit/copy -->
            <div class="flex items-center justify-center gap-2 mb-4">
              <template v-if="isEditing">
                <input
                  ref="editInputRef"
                  v-model="editText"
                  class="plate-text text-4xl tracking-[0.2em] bg-surface-100 dark:bg-surface-700 rounded-lg px-3 py-1 w-full text-center border-2 border-brand-500 outline-none"
                  maxlength="12"
                  @keydown.enter="saveEdit"
                  @keydown.escape="cancelEdit"
                />
                <button
                  class="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  title="Guardar"
                  @click="saveEdit"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
                <button
                  class="p-1.5 rounded-md text-surface-400 dark:text-surface-200 hover:text-red-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  title="Cancelar"
                  @click="cancelEdit"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </template>
              <template v-else>
                <p class="plate-text text-4xl tracking-[0.2em]">
                  {{ plate.plateText.text }}
                </p>
                <button
                  class="p-1.5 rounded-md text-surface-400 dark:text-surface-200 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                  title="Copiar"
                  @click="copyToClipboard"
                >
                  <IconCopy class="w-4 h-4" />
                </button>
                <button
                  class="p-1.5 rounded-md text-surface-400 dark:text-surface-200 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                  title="Editar"
                  @click="startEdit"
                >
                  <IconEdit class="w-4 h-4" />
                </button>
              </template>
            </div>

            <!-- Overall confidence with ring -->
            <div class="flex items-center justify-center gap-3 mb-5">
              <ConfidenceRing :value="plate.confidence" />
              <div class="text-sm">
                <p class="font-semibold text-surface-800 dark:text-surface-200">
                  {{ (plate.confidence * 100).toFixed(1) }}% confianza
                </p>
                <p class="text-xs text-surface-500 dark:text-surface-300">Promedio general</p>
              </div>
            </div>

            <!-- Per-character confidence bars -->
            <div class="bg-surface-100 dark:bg-surface-800 rounded-xl p-4 mb-4">
              <p
                class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3"
              >
                Confianza por carácter
              </p>
              <div class="flex gap-1.5 justify-center flex-wrap">
                <div
                  v-for="(conf, i) in plate.plateText.confidence"
                  :key="i"
                  class="flex flex-col items-center gap-1 group"
                >
                  <!-- confidence fill bar -->
                  <div
                    class="relative w-8 h-14 bg-surface-200 dark:bg-surface-700 rounded-md overflow-hidden"
                  >
                    <div
                      class="absolute bottom-0 left-0 right-0 rounded-md transition-all duration-700"
                      :style="{
                        height: `${Math.max(8, conf * 100)}%`,
                        backgroundColor: charColor(conf),
                      }"
                    />
                  </div>

                  <!-- character label -->
                  <span class="plate-text text-sm">
                    {{ plate.plateText.text[i] }}
                  </span>

                  <!-- confidence number -->
                  <span class="text-[10px] tabular-nums text-surface-500 dark:text-surface-300">{{
                    Math.round(conf * 100)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Metadata -->
            <div class="grid grid-cols-2 gap-2 text-xs mb-5">
              <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-3">
                <p class="text-surface-500 dark:text-surface-300 mb-0.5">Detectado</p>
                <p class="font-medium text-surface-700 dark:text-surface-300">
                  {{ new Date(plate.timestamp).toLocaleString() }}
                </p>
              </div>
              <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-3">
                <p class="text-surface-500 dark:text-surface-300 mb-0.5">ID</p>
                <p class="font-mono text-surface-700 dark:text-surface-300 truncate">
                  {{ plate.id.slice(-8) }}
                </p>
              </div>
            </div>

            <!-- Close button -->
            <button class="btn-primary w-full text-sm" @click="$emit('close')">Cerrar</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, watchEffect } from 'vue'
import { usePlateStore } from '@/stores/plateStore'
import type { PlateRecord } from '@/types/detection'
import ConfidenceRing from './ConfidenceRing.vue'
import IconCopy from '@/components/icons/IconCopy.vue'
import IconEdit from '@/components/icons/IconEdit.vue'

const emit = defineEmits<{
  close: []
  edited: [plateId: string, newText: string]
}>()

const props = defineProps<{
  plate: PlateRecord | null
}>()

const plateStore = usePlateStore()
const cropCanvas = ref<HTMLCanvasElement | null>(null)
const isEditing = ref(false)
const editText = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

watchEffect(() => {
  if (props.plate?.croppedImage && cropCanvas.value) {
    const canvas = cropCanvas.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = props.plate.croppedImage.width
    const height = props.plate.croppedImage.height

    canvas.width = width
    canvas.height = height

    ctx.drawImage(props.plate.croppedImage, 0, 0)
  }
})

function charColor(conf: number): string {
  if (conf >= 0.9) return 'var(--color-conf-high)'
  if (conf >= 0.75) return 'var(--color-conf-good)'
  if (conf >= 0.6) return 'var(--color-conf-mid)'
  if (conf >= 0.45) return 'var(--color-conf-low)'
  return 'var(--color-conf-poor)'
}

function copyToClipboard() {
  if (props.plate) {
    navigator.clipboard?.writeText(props.plate.plateText.text)
  }
}

function startEdit() {
  if (!props.plate) return
  editText.value = props.plate.plateText.text
  isEditing.value = true
  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

function saveEdit() {
  if (!props.plate) return
  const trimmed = editText.value.trim()
  if (!trimmed) return

  plateStore.updatePlateText(props.plate.id, trimmed)
  emit('edited', props.plate.id, trimmed)
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition:
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease;
}
.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.94) translateY(8px);
  opacity: 0;
}
</style>
