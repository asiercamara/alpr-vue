import { ref, onUnmounted } from 'vue'
import { usePlateStore } from '@/stores/plateStore'

export function useCamera() {
  const videoRef = ref(null)
  const canvasRef = ref(null)
  const isCameraActive = ref(false)
  const isProcessing = ref(false)
  const plateStore = usePlateStore()
  
  let stream = null
  let intervalId = null
  let worker = null

  // Initialize worker access (assuming worker is globally available or we can import it)
  // For now, we'll assume the worker is initialized in the main application setup
  
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    isCameraActive.value = false
    isProcessing.value = false
    const ctx = canvasRef.value?.getContext('2d')
    ctx?.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
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
        isCameraActive.value = true
        isProcessing.value = true
        
        videoRef.value.onloadedmetadata = () => {
          videoRef.value.play()
          setupProcessingLoop()
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      throw err
    }
  }

  const setupProcessingLoop = () => {
    if (!videoRef.value || !canvasRef.value) return
    
    intervalId = setInterval(async () => {
      if (!isProcessing.value || !videoRef.value) return

      const video = videoRef.value
      const canvas = canvasRef.value
      const ctx = canvas.getContext('2d')

      if (video.readyState >= 2) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // In a real implementation, we'd call the worker here
        // For now, we placeholder the logic to keep the loop running
        // const imageBitmap = await createImageBitmap(canvas)
        // worker.postMessage({ imageBitmap }, [imageBitmap])
      }
    }, 100)
  }

  onUnmounted(() => {
    stopCamera()
  })

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    isProcessing,
    startCamera,
    stopCamera
  }
}
