<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="sheet-backdrop" @click="$emit('update:modelValue', false)"></div>
        <div
          class="sheet-content absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto bg-white dark:bg-surface-900 rounded-t-2xl p-6 shadow-[0_-4px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_-4px_30px_rgba(0,0,0,0.35)]"
        >
          <div class="w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-600 mx-auto mb-5"></div>

          <div class="flex items-center gap-2 mb-5">
            <div class="w-1 h-5 bg-brand-500 rounded-full"></div>
            <h2
              class="heading-display text-sm font-semibold text-surface-700 dark:text-surface-200 uppercase tracking-wider"
            >
              Cómo usar
            </h2>
          </div>

          <div class="flex flex-col gap-4">
            <div class="flex gap-3 items-start">
              <span
                class="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center flex-none"
                >1</span
              >
              <p class="text-sm text-surface-700 dark:text-white/70 leading-relaxed">
                Activa la cámara para comenzar el escaneo en tiempo real.
              </p>
            </div>
            <div class="flex gap-3 items-start">
              <span
                class="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center flex-none"
                >2</span
              >
              <p class="text-sm text-surface-700 dark:text-white/70 leading-relaxed">
                Apunta la cámara directamente a la matrícula del vehículo.
              </p>
            </div>
            <div class="flex gap-3 items-start">
              <span
                class="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center flex-none"
                >3</span
              >
              <p class="text-sm text-surface-700 dark:text-white/70 leading-relaxed">
                El sistema detectará automáticamente el texto y lo guardará en el historial.
              </p>
            </div>
          </div>

          <button
            class="w-full mt-6 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-white/70 font-medium text-sm hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors"
            @click="$emit('update:modelValue', false)"
          >
            Entendido
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.sheet-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-leave-active {
  transition: all 0.2s ease-in;
}
.sheet-enter-from .sheet-backdrop,
.sheet-leave-to .sheet-backdrop {
  opacity: 0;
}
.sheet-enter-from .sheet-content,
.sheet-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
