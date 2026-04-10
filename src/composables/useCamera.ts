import { ref, onUnmounted, type Ref } from 'vue'
import { useDetection } from './useDetection'
import { usePlateStore } from '@/stores/plateStore'
import { useAppStore } from '@/stores/appStore'
import type { DetectionBox } from '@/types/detection'

export function useCamera(): {
  videoRef: Ref<HTMLVideoElement | null>
  canvasRef: Ref<HTMLCanvasElement | null>
  isCameraActive: Ref<boolean>
  isProcessing: Ref<boolean>
  modelReady: Ref<boolean>
  facingMode: Ref<string>
  startCamera: () => Promise<void>
  stopCamera: () => void
  toggleCameraFacing: () => Promise<void>
} {
  const videoRef = ref<HTMLVideoElement | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const isCameraActive = ref(false)
  const facingMode = ref('environment')

  let stream: MediaStream | null = null
  let intervalId: ReturnType<typeof setInterval> | null = null
  let lastBoxes: DetectionBox[] = []

  const plateStore = usePlateStore()
  const appStore = useAppStore()
  const { modelReady, isProcessing, processFrame, onBoxes, drawBoxesAndUpdate, resetProcessing } =
    useDetection()

  const unsubscribeBoxes = onBoxes((boxes) => {
    lastBoxes = boxes
  })

  const stopCamera = (): void => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
    isCameraActive.value = false
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

          if (lastBoxes.length) {
            drawBoxesAndUpdate(canvas, lastBoxes)
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
    startCamera,
    stopCamera,
    toggleCameraFacing,
  }
}
