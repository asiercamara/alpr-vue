import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const cameraError = ref<string | null>(null)
  const modelError = ref<string | null>(null)
  const isModelLoading = ref(true)
  const isCameraActive = ref(false)

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

  return {
    cameraError,
    modelError,
    isModelLoading,
    isCameraActive,
    setCameraError,
    setModelError,
    setModelReady,
    setCameraActive,
  }
})
