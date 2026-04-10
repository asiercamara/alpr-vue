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
          <span class="text-xs text-white/60 shrink-0">detectada</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePlateStore } from '@/stores/plateStore'

const plateStore = usePlateStore()

const visible = ref(false)
const currentPlate = ref('')
let dismissTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => plateStore.bestDetections.length,
  (newLen, oldLen) => {
    if (newLen > oldLen && plateStore.bestDetections.length > 0) {
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
