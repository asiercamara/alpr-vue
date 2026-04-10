<template>
  <div
    ref="drawerRef"
    class="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-surface-900 rounded-t-2xl shadow-modal"
    :style="drawerStyle"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend.passive="onTouchEnd"
  >
    <!-- Drag handle area -->
    <div class="pt-3 pb-2 cursor-grab active:cursor-grabbing" @click="onHandleClick">
      <div class="mx-auto w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-600"></div>
    </div>

    <!-- Collapsed preview (visible when drawer is collapsed) -->
    <Transition name="fade">
      <div v-if="isCollapsed" class="flex items-center gap-2 px-4 pb-3 overflow-hidden">
        <span class="text-xs font-semibold text-surface-600 dark:text-white/70 shrink-0">
          {{ count > 0 ? `${count} matrícula${count !== 1 ? 's' : ''}` : 'Sin detecciones' }}
        </span>
        <div v-if="lastPlates.length > 0" class="flex gap-1.5 overflow-hidden">
          <span
            v-for="plate in lastPlates"
            :key="plate.id"
            class="plate-text text-xs px-2 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-md shrink-0"
          >
            {{ plate.text }}
          </span>
        </div>
        <button
          v-if="count > 0"
          class="ml-auto shrink-0 text-xs text-brand-600 dark:text-brand-400 font-medium"
          @click.stop="snapTo('half')"
        >
          Ver todas ↑
        </button>
      </div>
    </Transition>

    <!-- Full content (visible when expanded) -->
    <div
      class="overflow-y-auto overscroll-contain px-4"
      :style="{ height: contentHeight, opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlateStore } from '@/stores/plateStore'

const plateStore = usePlateStore()

const SNAP_COLLAPSED = 80
const SNAP_HALF_VH = 0.5
const SNAP_FULL_VH = 0.88

const snapPoint = ref<'collapsed' | 'half' | 'full'>('collapsed')
const dragOffsetY = ref(0)
const isDragging = ref(false)
const startY = ref(0)
const startHeight = ref(SNAP_COLLAPSED)
const windowHeight = ref(window.innerHeight)

const currentHeight = computed(() => {
  switch (snapPoint.value) {
    case 'half':
      return Math.round(windowHeight.value * SNAP_HALF_VH)
    case 'full':
      return Math.round(windowHeight.value * SNAP_FULL_VH)
    default:
      return SNAP_COLLAPSED
  }
})

const drawerStyle = computed(() => {
  const h = isDragging.value
    ? Math.max(
        SNAP_COLLAPSED,
        Math.min(startHeight.value - dragOffsetY.value, windowHeight.value * SNAP_FULL_VH),
      )
    : currentHeight.value
  return {
    height: `${h}px`,
    transition: isDragging.value ? 'none' : 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  }
})

const contentHeight = computed(() => {
  const h = currentHeight.value - 56 // subtract handle + preview area
  return `${Math.max(0, h)}px`
})

const isCollapsed = computed(() => snapPoint.value === 'collapsed')

const count = computed(() => plateStore.bestDetections.length)
const lastPlates = computed(() => plateStore.bestDetections.slice(0, 2))

function snapTo(point: 'collapsed' | 'half' | 'full') {
  snapPoint.value = point
}

function onHandleClick() {
  if (snapPoint.value === 'collapsed') snapTo('half')
  else snapTo('collapsed')
}

function onTouchStart(e: TouchEvent) {
  isDragging.value = true
  startY.value = e.touches[0].clientY
  startHeight.value = currentHeight.value
  dragOffsetY.value = 0
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value) return
  dragOffsetY.value = e.touches[0].clientY - startY.value
}

function onTouchEnd() {
  isDragging.value = false
  const liveHeight = Math.max(
    SNAP_COLLAPSED,
    Math.min(startHeight.value - dragOffsetY.value, windowHeight.value * SNAP_FULL_VH),
  )

  const halfH = windowHeight.value * SNAP_HALF_VH
  const fullH = windowHeight.value * SNAP_FULL_VH

  // Find nearest snap point
  const distances = [
    { point: 'collapsed' as const, dist: Math.abs(liveHeight - SNAP_COLLAPSED) },
    { point: 'half' as const, dist: Math.abs(liveHeight - halfH) },
    { point: 'full' as const, dist: Math.abs(liveHeight - fullH) },
  ]
  const nearest = distances.reduce((a, b) => (a.dist < b.dist ? a : b))
  snapTo(nearest.point)
  dragOffsetY.value = 0
}

function onResize() {
  windowHeight.value = window.innerHeight
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
