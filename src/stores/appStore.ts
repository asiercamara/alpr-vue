import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const cameraError = ref<string | null>(null)
  const modelError = ref<string | null>(null)
  const isModelLoading = ref(true)
  const isCameraActive = ref(false)
  const feedbackEnabled = ref(localStorage.getItem('alpr-feedback-enabled') !== 'false')

  const uploadMediaType = ref<'image' | 'video' | null>(null)
  const uploadMediaUrl = ref<string | null>(null)
  const uploadFile = ref<File | null>(null)

  const isUploadMode = computed(
    () => uploadMediaType.value !== null && uploadMediaUrl.value !== null,
  )

  function setCameraError(msg: string | null): void {
    cameraError.value = msg
  }

  function setModelError(msg: string | null): void {
    modelError.value = msg
  }

  function setModelReady(): void {
    isModelLoading.value = false
    modelError.value = null
  }

  function setCameraActive(active: boolean): void {
    isCameraActive.value = active
  }

  function toggleFeedback(): void {
    feedbackEnabled.value = !feedbackEnabled.value
    localStorage.setItem('alpr-feedback-enabled', String(feedbackEnabled.value))
  }

  function setUploadMedia(type: 'image' | 'video', url: string, file: File): void {
    uploadMediaType.value = type
    uploadMediaUrl.value = url
    uploadFile.value = file
  }

  function clearUploadMedia(): void {
    if (uploadMediaUrl.value) {
      URL.revokeObjectURL(uploadMediaUrl.value)
    }
    uploadMediaType.value = null
    uploadMediaUrl.value = null
    uploadFile.value = null
  }

  return {
    cameraError,
    modelError,
    isModelLoading,
    isCameraActive,
    feedbackEnabled,
    uploadMediaType,
    uploadMediaUrl,
    uploadFile,
    isUploadMode,
    setCameraError,
    setModelError,
    setModelReady,
    setCameraActive,
    toggleFeedback,
    setUploadMedia,
    clearUploadMedia,
  }
})
