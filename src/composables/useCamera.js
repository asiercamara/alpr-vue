import { ref, onUnmounted } from 'vue'
import { useDetection } from './useDetection'
import { appState } from '@/utils/config'

export function useCamera() {
  const videoRef = ref(null)
  const canvasRef = ref(null)
  const isCameraActive = ref(false)

  let stream = null
  let intervalId = null
  let lastBoxes = []

  const { modelReady, processFrame, onBoxes, drawBoxesAndUpdate } = useDetection()

  onBoxes((boxes) => {
    lastBoxes = boxes
  })

  const stopCamera = () => {
    clearInterval(intervalId)
    intervalId = null
    stream?.getTracks().forEach(t => t.stop())
    stream = null
    isCameraActive.value = false
    const ctx = canvasRef.value?.getContext('2d')
    if (ctx && canvasRef.value) {
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    }
  }

  const startCamera = async () => {
    try {
      const constraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      }
      stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.value) {
        videoRef.value.srcObject = stream
        await videoRef.value.play()
        isCameraActive.value = true
        appState.currentMode = 'camera'

        intervalId = setInterval(async () => {
          const video = videoRef.value
          const canvas = canvasRef.value
          if (!video || !canvas || video.readyState < 2) return

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          if (lastBoxes.length) {
            drawBoxesAndUpdate(canvas, lastBoxes, 'camera', stopCamera)
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
      console.error('Error accessing camera:', err)
      throw err
    }
  }

  onUnmounted(() => {
    stopCamera()
  })

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    modelReady,
    startCamera,
    stopCamera
  }
}
