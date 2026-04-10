<template>
  <div>
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept="image/*,video/*"
      @change="handleFileSelect"
    />
    <button
      class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all duration-200 active:scale-95 bg-surface-700 hover:bg-surface-600 text-white/80 hover:text-white backdrop-blur-sm"
      @click="triggerFileSelect"
    >
      <IconUpload class="w-4 h-4" />
      <span>Subir archivo</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/appStore'
import IconUpload from '@/components/icons/IconUpload.vue'

const appStore = useAppStore()
const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  input.value = ''
  if (appStore.isUploadMode) {
    appStore.clearUploadMedia()
  }

  const url = URL.createObjectURL(file)
  const type = file.type.startsWith('video/') ? 'video' : 'image'

  appStore.setUploadMedia(type, url, file)
}
</script>
