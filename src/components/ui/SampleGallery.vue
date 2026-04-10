<template>
  <Transition name="gallery">
    <div
      v-if="modelValue"
      class="absolute bottom-full left-0 right-0 mb-2 z-20 max-h-64 overflow-y-auto rounded-xl bg-surface-800/95 backdrop-blur-sm border border-surface-600/30 shadow-lg"
    >
      <div class="p-1.5">
        <div class="px-2 py-1.5 text-xs font-semibold text-white/50 uppercase tracking-wider">
          Imágenes
        </div>
        <button
          v-for="item in imageItems"
          :key="item.file"
          class="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-sm text-white/80 hover:bg-surface-600/50 hover:text-white transition-colors"
          @click="$emit('select', item)"
        >
          <IconImage class="w-4 h-4 flex-shrink-0 text-brand-400" />
          <span class="truncate">{{ item.label }}</span>
          <span
            class="ml-auto flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-brand-500/20 text-brand-400"
          >
            IMG
          </span>
        </button>

        <div class="px-2 py-1.5 mt-1 text-xs font-semibold text-white/50 uppercase tracking-wider">
          Vídeos
        </div>
        <button
          v-for="item in videoItems"
          :key="item.file"
          class="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-sm text-white/80 hover:bg-surface-600/50 hover:text-white transition-colors"
          @click="$emit('select', item)"
        >
          <IconVideo class="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span class="truncate">{{ item.label }}</span>
          <span
            class="ml-auto flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-400"
          >
            VÍD
          </span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TEST_MEDIA, type TestMediaItem } from '@/data/testMedia'
import IconImage from '@/components/icons/IconImage.vue'
import IconVideo from '@/components/icons/IconVideo.vue'

defineProps<{ modelValue: boolean }>()
defineEmits<{
  select: [item: TestMediaItem]
}>()

const imageItems = computed(() => TEST_MEDIA.filter((m) => m.type === 'image'))
const videoItems = computed(() => TEST_MEDIA.filter((m) => m.type === 'video'))
</script>

<style scoped>
.gallery-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.gallery-leave-active {
  transition: all 0.15s ease-in;
}
.gallery-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.gallery-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
