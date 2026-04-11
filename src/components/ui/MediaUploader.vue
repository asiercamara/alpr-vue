<template>
  <div class="relative">
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept="image/*,video/*"
      @change="handleFileSelect"
    />
    <div class="flex flex-col gap-2">
      <button
        class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all duration-200 active:scale-95 bg-surface-700 hover:bg-surface-600 text-white/80 hover:text-white backdrop-blur-sm"
        @click="triggerFileSelect"
      >
        <IconUpload class="w-4 h-4" />
        <span>{{ t('uploader.upload') }}</span>
      </button>
      <button
        class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/50 hover:text-white/80 transition-colors"
        @click="toggleGallery"
      >
        <IconImage class="w-3.5 h-3.5" />
        <span>{{ t('uploader.sample') }}</span>
        <svg
          :class="['w-3 h-3 transition-transform duration-200', showGallery ? 'rotate-180' : '']"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>
      <SampleGallery v-model="showGallery" @select="handleSampleSelect" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/appStore'
import { type TestMediaItem } from '@/data/testMedia'
import IconUpload from '@/components/icons/IconUpload.vue'
import IconImage from '@/components/icons/IconImage.vue'
import SampleGallery from './SampleGallery.vue'

const { t } = useI18n()
const appStore = useAppStore()
const fileInputRef = ref<HTMLInputElement | null>(null)
const showGallery = ref(false)

const toggleGallery = () => {
  showGallery.value = !showGallery.value
}

const triggerFileSelect = () => {
  showGallery.value = false
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

const handleSampleSelect = async (item: TestMediaItem) => {
  showGallery.value = false

  try {
    const response = await fetch(item.file)
    if (!response.ok) return

    const blob = await response.blob()
    const extension = item.type === 'video' ? 'mp4' : 'jpg'
    const mimeType = item.type === 'video' ? 'video/mp4' : 'image/jpeg'
    const file = new File([blob], `${item.label}.${extension}`, { type: mimeType })

    if (appStore.isUploadMode) {
      appStore.clearUploadMedia()
    }

    const url = URL.createObjectURL(file)
    appStore.setUploadMedia(item.type, url, file)
  } catch {
    // silently ignore fetch errors
  }
}
</script>
