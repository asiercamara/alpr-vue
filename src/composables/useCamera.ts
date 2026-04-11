import { ref, onUnmounted, type Ref } from 'vue'
import { useDetection } from './useDetection'
import { usePlateStore } from '@/stores/plateStore'
import { useAppStore } from '@/stores/appStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { DetectionBox } from '@/types/detection'

const ZOOM_STEP = 0.5
const DIGITAL_ZOOM_MAX = 5

export function useCamera(): {
  videoRef: Ref<HTMLVideoElement | null>
  canvasRef: Ref<HTMLCanvasElement | null>
  isCameraActive: Ref<boolean>
  isProcessing: Ref<boolean>
  modelReady: Ref<boolean>
  facingMode: Ref<string>
  zoomLevel: Ref<number>
  maxZoom: Ref<number>
  isZoomSupported: Ref<boolean>
  isDigitalZoom: Ref<boolean>
  startCamera: () => Promise<void>
  stopCamera: () => void
  toggleCameraFacing: () => Promise<void>
  zoomIn: () => Promise<void>
  zoomOut: () => Promise<void>
  resetZoom: () => void
} {
  const videoRef = ref<HTMLVideoElement | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const isCameraActive = ref(false)
  const facingMode = ref('environment')
  const zoomLevel = ref(1)
  const maxZoom = ref(DIGITAL_ZOOM_MAX)
  const isZoomSupported = ref(false)
  const isDigitalZoom = ref(false)

  let stream: MediaStream | null = null
  let videoTrack: MediaStreamTrack | null = null
  let intervalId: ReturnType<typeof setInterval> | null = null
  let lastBoxes: DetectionBox[] = []

  const plateStore = usePlateStore()
  const appStore = useAppStore()
  const settingsStore = useSettingsStore()
  const { modelReady, isProcessing, processFrame, onBoxes, drawBoxesAndUpdate, resetProcessing } =
    useDetection()

  const unsubscribeBoxes = onBoxes((boxes) => {
    lastBoxes = boxes
  })

  const detectZoomCapabilities = (): void => {
    try {
      videoTrack = stream?.getVideoTracks?.()?.[0] ?? null
      if (!videoTrack) return

      const capabilities = (
        videoTrack as MediaStreamTrack & { getCapabilities?: () => MediaTrackCapabilities }
      ).getCapabilities?.()
      if (capabilities?.zoom) {
        isZoomSupported.value = true
        isDigitalZoom.value = false
        maxZoom.value = (capabilities.zoom as { max?: number }).max ?? DIGITAL_ZOOM_MAX
      } else {
        isZoomSupported.value = false
        isDigitalZoom.value = true
        maxZoom.value = DIGITAL_ZOOM_MAX
      }
    } catch {
      isZoomSupported.value = false
      isDigitalZoom.value = false
      maxZoom.value = DIGITAL_ZOOM_MAX
    }
    zoomLevel.value = 1
  }

  const stopCamera = (): void => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
    videoTrack = null
    isCameraActive.value = false
    zoomLevel.value = 1
    isZoomSupported.value = false
    isDigitalZoom.value = false
    lastBoxes = []
    resetProcessing()
    plateStore.clearConsecutiveDetections()
    appStore.setCameraActive(false)
    const ctx = canvasRef.value?.getContext('2d')
    if (ctx && canvasRef.value) {
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    }
  }

  const startCamera = async (): Promise<void> => {
    try {
      lastBoxes = []
      plateStore.clearConsecutiveDetections()
      resetProcessing()

      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: facingMode.value } },
        audio: false,
      }
      stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.value) {
        videoRef.value.srcObject = stream
        await videoRef.value.play()
        detectZoomCapabilities()
        isCameraActive.value = true
        appStore.setCameraActive(true)
        plateStore.setMode('camera')

        intervalId = setInterval(async () => {
          const video = videoRef.value
          const canvas = canvasRef.value
          if (!video || !canvas || video.readyState < 2) return

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)

          let confirmedNewPlate = false
          if (lastBoxes.length) {
            confirmedNewPlate = drawBoxesAndUpdate(canvas, lastBoxes)
          }

          if (confirmedNewPlate && !settingsStore.continuousMode) {
            stopCamera()
            return
          }

          if (modelReady.value) {
            try {
              const bitmap = await createImageBitmap(video)
              await processFrame(bitmap)
            } catch (err) {
              console.error('Error in processFrame:', err)
            }
          }
        }, 20)
      }
    } catch (err) {
      appStore.setCameraActive(false)
      console.error('Error accessing camera:', err)
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') appStore.setCameraError('Permiso de cámara denegado')
        else if (err.name === 'NotFoundError')
          appStore.setCameraError('No se encontró cámara disponible')
        else appStore.setCameraError(err.message)
      } else {
        appStore.setCameraError('Error inesperado al acceder a la cámara')
      }
    }
  }

  const applyNativeZoom = async (value: number): Promise<void> => {
    if (!videoTrack || !isZoomSupported.value) return
    try {
      await videoTrack.applyConstraints({
        advanced: [{ zoom: value }] as MediaTrackConstraintSet[],
      })
    } catch {
      isZoomSupported.value = false
      isDigitalZoom.value = true
    }
  }

  const zoomIn = async (): Promise<void> => {
    const next = Math.min(zoomLevel.value + ZOOM_STEP, maxZoom.value)
    if (next === zoomLevel.value) return

    if (isZoomSupported.value) {
      await applyNativeZoom(next)
    }

    zoomLevel.value = next
    if (!isZoomSupported.value) {
      isDigitalZoom.value = true
    }
  }

  const zoomOut = async (): Promise<void> => {
    const next = Math.max(zoomLevel.value - ZOOM_STEP, 1)
    if (next === zoomLevel.value) return

    if (isZoomSupported.value) {
      await applyNativeZoom(next)
    }

    zoomLevel.value = next
    if (!isZoomSupported.value) {
      isDigitalZoom.value = true
    }
  }

  const resetZoom = (): void => {
    if (isZoomSupported.value && videoTrack) {
      videoTrack
        .applyConstraints({ advanced: [{ zoom: 1 }] as MediaTrackConstraintSet[] })
        .catch(() => {})
    }
    zoomLevel.value = 1
    isDigitalZoom.value = false
  }

  const toggleCameraFacing = async (): Promise<void> => {
    facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
    if (isCameraActive.value) {
      stopCamera()
      await startCamera()
    }
  }

  onUnmounted(() => {
    unsubscribeBoxes()
    stopCamera()
  })

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    isProcessing,
    modelReady,
    facingMode,
    zoomLevel,
    maxZoom,
    isZoomSupported,
    isDigitalZoom,
    startCamera,
    stopCamera,
    toggleCameraFacing,
    zoomIn,
    zoomOut,
    resetZoom,
  }
}
