import { ref } from 'vue'
import { useDetection } from './useDetection'
import { usePlateStore } from '@/stores/plateStore'
import type { DetectionBox } from '@/types/detection'

export type MediaProcessingStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error'

export function useStaticMedia() {
  const { modelReady, isProcessing, processFrame, onBoxes, drawBoxesAndUpdate } = useDetection()
  const plateStore = usePlateStore()

  const status = ref<MediaProcessingStatus>('idle')
  let animationFrameId: number | null = null
  let videoUrl: string | null = null
  let lastBoxes: DetectionBox[] = []
  let unsubscribeBoxes: (() => void) | null = null

  const processImage = async (file: File, canvas: HTMLCanvasElement): Promise<DetectionBox[]> => {
    if (!modelReady.value) {
      status.value = 'error'
      return []
    }

    status.value = 'loading'
    plateStore.setMode('upload')

    try {
      const bitmap = await createImageBitmap(file)

      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        status.value = 'error'
        bitmap.close()
        return []
      }
      ctx.drawImage(bitmap, 0, 0)

      status.value = 'processing'

      return new Promise<DetectionBox[]>((resolve) => {
        const unsubscribe = onBoxes((boxes: DetectionBox[]) => {
          unsubscribe()
          drawBoxesAndUpdate(canvas, boxes)
          bitmap.close()
          status.value = 'done'
          resolve(boxes)
        })

        processFrame(bitmap)
      })
    } catch {
      status.value = 'error'
      return []
    }
  }

  const processVideoStream = (video: HTMLVideoElement, canvas: HTMLCanvasElement): void => {
    if (!modelReady.value) {
      status.value = 'error'
      return
    }

    status.value = 'loading'
    plateStore.setMode('upload')
    stopMediaProcessing()
    lastBoxes = []

    if (unsubscribeBoxes) {
      unsubscribeBoxes()
    }
    unsubscribeBoxes = onBoxes((boxes: DetectionBox[]) => {
      lastBoxes = boxes
    })

    const onLoaded = async () => {
      try {
        await video.play()
      } catch {
        status.value = 'error'
        return
      }

      status.value = 'processing'

      const loop = async () => {
        if (video.ended) {
          status.value = 'done'
          return
        }

        if (video.readyState >= 2) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0)
            if (lastBoxes.length) {
              drawBoxesAndUpdate(canvas, lastBoxes)
            }
          }
        }

        if (!isProcessing.value && modelReady.value && video.readyState >= 2) {
          try {
            const bitmap = await createImageBitmap(video)
            processFrame(bitmap)
          } catch {
            // skip frame
          }
        }

        animationFrameId = requestAnimationFrame(loop)
      }

      animationFrameId = requestAnimationFrame(loop)
    }

    if (video.readyState >= 2) {
      onLoaded()
    } else {
      video.addEventListener('loadeddata', onLoaded, { once: true })
    }
  }

  const setVideoSource = (video: HTMLVideoElement, url: string): void => {
    if (videoUrl && videoUrl !== url) {
      URL.revokeObjectURL(videoUrl)
    }
    videoUrl = url
    video.src = url
    video.muted = true
    video.playsInline = true
    video.load()
  }

  const stopMediaProcessing = (): void => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  const cleanup = (): void => {
    stopMediaProcessing()
    if (unsubscribeBoxes) {
      unsubscribeBoxes()
      unsubscribeBoxes = null
    }
    lastBoxes = []
    status.value = 'idle'
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      videoUrl = null
    }
  }

  return {
    status,
    isProcessing,
    processImage,
    processVideoStream,
    setVideoSource,
    stopMediaProcessing,
    cleanup,
  }
}
