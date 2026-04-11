/**
 * Global application state: camera errors, model loading status, active camera state,
 * and staged upload media.
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  /** Last camera permission or hardware error message, `null` when healthy. */
  const cameraError = ref<string | null>(null)
  /** Last model loading error message, `null` when the model loaded successfully. */
  const modelError = ref<string | null>(null)
  /** `true` while the ONNX model is being downloaded and initialized. */
  const isModelLoading = ref(true)
  /** `true` when the webcam stream is running and frames are being processed. */
  const isCameraActive = ref(false)

  /** MIME category of the currently staged file (`'image'` or `'video'`), or `null`. */
  const uploadMediaType = ref<'image' | 'video' | null>(null)
  /**
   * Blob URL for the staged upload file.
   * Ownership belongs to this store — revoke via `clearUploadMedia`.
   */
  const uploadMediaUrl = ref<string | null>(null)
  /** The raw `File` object selected by the user for offline processing. */
  const uploadFile = ref<File | null>(null)

  /**
   * `true` when a file has been staged for offline processing.
   * Computed from `uploadMediaType` and `uploadMediaUrl` — both must be non-null.
   */
  const isUploadMode = computed(
    () => uploadMediaType.value !== null && uploadMediaUrl.value !== null,
  )

  /** @param msg - Error message, or `null` to clear the error. */
  function setCameraError(msg: string | null): void {
    cameraError.value = msg
  }

  /** @param msg - Error message, or `null` to clear the error. */
  function setModelError(msg: string | null): void {
    modelError.value = msg
  }

  /** Marks the model as loaded and clears any model error. */
  function setModelReady(): void {
    isModelLoading.value = false
    modelError.value = null
  }

  /** @param active - `true` when the camera stream starts, `false` when it stops. */
  function setCameraActive(active: boolean): void {
    isCameraActive.value = active
  }

  /**
   * Stages a file for offline processing.
   *
   * @param type - Media category (`'image'` or `'video'`).
   * @param url - Blob URL created by the caller. This store takes ownership and will
   *   revoke it when `clearUploadMedia` is called.
   * @param file - The original `File` object.
   */
  function setUploadMedia(type: 'image' | 'video', url: string, file: File): void {
    uploadMediaType.value = type
    uploadMediaUrl.value = url
    uploadFile.value = file
  }

  /**
   * Clears the staged upload media and revokes the blob URL to free memory.
   *
   * Always call this when the user dismisses the upload or processing completes.
   */
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
    uploadMediaType,
    uploadMediaUrl,
    uploadFile,
    isUploadMode,
    setCameraError,
    setModelError,
    setModelReady,
    setCameraActive,
    setUploadMedia,
    clearUploadMedia,
  }
})
