import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const cameraError = ref<string | null>(null)
  const modelError = ref<string | null>(null)
  const isModelLoading = ref(true)
  const isCameraActive = ref(false)
  const feedbackEnabled = ref(localStorage.getItem('alpr-feedback-enabled') !== 'false')

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

  return {
    cameraError,
    modelError,
    isModelLoading,
    isCameraActive,
    feedbackEnabled,
    setCameraError,
    setModelError,
    setModelReady,
    setCameraActive,
    toggleFeedback,
  }
})
