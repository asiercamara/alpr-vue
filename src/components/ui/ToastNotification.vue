<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="visible"
        class="fixed top-[calc(3.5rem+8px)] left-1/2 -translate-x-1/2 z-50 lg:hidden"
      >
        <div
          class="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-surface-900/90 dark:bg-surface-800/90 backdrop-blur-sm shadow-modal"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
          <span class="plate-text text-sm text-white font-semibold tracking-widest">
            {{ currentPlate }}
          </span>
          <span class="text-xs text-white/60 shrink-0">{{ t('toast.detected') }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlateStore } from '@/stores/plateStore'

const { t } = useI18n()
const plateStore = usePlateStore()

const visible = ref(false)
const currentPlate = ref('')
let dismissTimer: ReturnType<typeof setTimeout> | null = null

// A plate is announced when a detection was added (`plates` grew) and it started a new
// entry in the list (`bestDetections` grew). Editing a plate regroups it and can change the
// number of entries too, but it adds no detection, and repeats of a listed plate add none.
watch(
  () => [plateStore.plates.length, plateStore.bestDetections.length] as const,
  ([platesLen, bestLen], [oldPlatesLen, oldBestLen]) => {
    if (platesLen > oldPlatesLen && bestLen > oldBestLen) {
      const latest = plateStore.bestDetections[0]
      currentPlate.value = latest.text

      if (dismissTimer) clearTimeout(dismissTimer)
      visible.value = true
      dismissTimer = setTimeout(() => {
        visible.value = false
      }, 2500)
    }
  },
)
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
