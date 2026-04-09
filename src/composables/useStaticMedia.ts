import { ref } from 'vue'
import { useDetection } from './useDetection'
import type { DetectionBox } from '@/types/detection'

export type MediaProcessingStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error'

const VIDEO_FRAME_INTERVAL = 500

export function useStaticMedia() {
  const { modelReady, isProcessing, processFrame, onBoxes, drawBoxesAndUpdate } = useDetection()

  const status = ref<MediaProcessingStatus>('idle')
  const progress = ref(0)
  const currentFrame = ref(0)
  const totalFrames = ref(0)
  let cancelRequested = false

  const processImage = async (file: File, canvas: HTMLCanvasElement): Promise<DetectionBox[]> => {
    if (!modelReady.value) {
      status.value = 'error'
      return []
    }

    status.value = 'loading'
    progress.value = 0

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
      progress.value = 50

      return new Promise<DetectionBox[]>((resolve) => {
        const unsubscribe = onBoxes((boxes: DetectionBox[]) => {
          unsubscribe()
          drawBoxesAndUpdate(canvas, boxes)
          bitmap.close()
          status.value = 'done'
          progress.value = 100
          resolve(boxes)
        })

        processFrame(bitmap)
      })
    } catch {
      status.value = 'error'
      return []
    }
  }

  const processVideo = async (file: File, canvas: HTMLCanvasElement): Promise<DetectionBox[]> => {
    if (!modelReady.value) {
      status.value = 'error'
      return []
    }

    status.value = 'loading'
    cancelRequested = false

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    const url = URL.createObjectURL(file)
    video.src = url

    const allDetections: DetectionBox[] = []

    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Failed to load video'))
      })

      const duration = video.duration
      totalFrames.value = Math.ceil(duration * (1000 / VIDEO_FRAME_INTERVAL))

      status.value = 'processing'
      progress.value = 0
      currentFrame.value = 0

      for (
        let currentTime = 0;
        currentTime < duration;
        currentTime += VIDEO_FRAME_INTERVAL / 1000
      ) {
        if (cancelRequested) break

        await new Promise<void>((resolve) => {
          video.currentTime = currentTime
          video.onseeked = () => resolve()
        })

        while (isProcessing.value) {
          await new Promise<void>((r) => setTimeout(r, 50))
        }

        currentFrame.value++
        progress.value = Math.round((currentFrame.value / totalFrames.value) * 100)

        try {
          const bitmap = await createImageBitmap(video)

          canvas.width = bitmap.width
          canvas.height = bitmap.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0)
          }

          await new Promise<void>((resolve) => {
            const unsubscribe = onBoxes((boxes: DetectionBox[]) => {
              for (const box of boxes) {
                if (!allDetections.some((d) => d.plateText.text === box.plateText.text)) {
                  allDetections.push(box)
                }
              }
              unsubscribe()
              drawBoxesAndUpdate(canvas, boxes)
              resolve()
            })
            processFrame(bitmap)
          })
        } catch {
          // Skip frame if bitmap creation fails
        }
      }

      status.value = 'done'
      progress.value = 100
      return allDetections
    } catch {
      status.value = 'error'
      return allDetections
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const cancelProcessing = (): void => {
    cancelRequested = true
    status.value = 'idle'
    progress.value = 0
  }

  return {
    status,
    progress,
    currentFrame,
    totalFrames,
    processImage,
    processVideo,
    cancelProcessing,
  }
}
