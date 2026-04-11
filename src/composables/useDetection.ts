import { ref, markRaw } from 'vue'
import { usePlateStore } from '@/stores/plateStore'
import { useAppStore } from '@/stores/appStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { evaluatePlateQuality } from '@/utils/validation'
import { calculateTextSimilarity } from '@/utils/validation'
import { notifyDetection } from '@/utils/feedback'
import type { DetectionBox } from '@/types/detection'

// Module-level singleton: the Worker and its state are shared across all composable instances.
// This is intentional — only one Worker processes frames at a time, avoiding race conditions.
let _worker: Worker | null = null
const _modelReady = ref(false)
const _modelFailed = ref(false)
const _isProcessing = ref(false)
let _onBoxesCallbacks: Array<(data: DetectionBox[]) => void> = []

function getWorker(): Worker {
  if (_worker) return _worker

  _worker = new Worker(new URL('../workers/mainWorker.js', import.meta.url), { type: 'module' })

  _worker.onmessage = (event: MessageEvent) => {
    const data = event.data

    if (data?.status === 'model_ready') {
      _modelReady.value = true
      try {
        useAppStore().setModelReady()
      } catch {
        /* store puede no estar disponible fuera de componentes */
      }
      return
    }

    if (data?.status === 'model_failed') {
      _modelFailed.value = true
      try {
        useAppStore().setModelError('No se pudo cargar el modelo de detección')
      } catch {
        /* store puede no estar disponible fuera de componentes */
      }
      return
    }

    if (data?.error) {
      console.error('Worker error:', data.error)
      _isProcessing.value = false
      return
    }

    if (Array.isArray(data)) {
      _isProcessing.value = false
      _onBoxesCallbacks.forEach((cb) => cb(data))
    }
  }

  return _worker
}

function selectBestBoxes(boxes: DetectionBox[], threshold: number): DetectionBox[] {
  const validBoxes = boxes.filter((box) => {
    if (!box.plateText?.confidence?.length) return false
    const conf = box.plateText.confidence
    const confMean = conf.reduce((a, b) => a + b, 0) / conf.length
    return confMean >= threshold
  })

  const grouped = new Map<string, DetectionBox>()
  for (const box of validBoxes) {
    const key = box.plateText.text
    const existing = grouped.get(key)
    if (!existing || box.plateText.text.length > existing.plateText.text.length) {
      grouped.set(key, box)
    } else if (box.plateText.text.length === existing.plateText.text.length) {
      const existingConf =
        existing.plateText.confidence.reduce((a, b) => a + b, 0) /
        existing.plateText.confidence.length
      const boxConf =
        box.plateText.confidence.reduce((a, b) => a + b, 0) / box.plateText.confidence.length
      if (boxConf > existingConf) {
        grouped.set(key, box)
      }
    }
  }

  return Array.from(grouped.values())
}

export function useDetection() {
  const plateStore = usePlateStore()
  const settingsStore = useSettingsStore()
  const worker = getWorker()

  const processFrame = async (imageBitmap: ImageBitmap): Promise<void> => {
    if (!_modelReady.value || _isProcessing.value) {
      imageBitmap.close()
      return
    }
    _isProcessing.value = true
    worker.postMessage({ imageBitmap }, [imageBitmap])
  }

  const onBoxes = (callback: (data: DetectionBox[]) => void): (() => void) => {
    _onBoxesCallbacks.push(callback)
    return () => {
      _onBoxesCallbacks = _onBoxesCallbacks.filter((cb) => cb !== callback)
    }
  }

  const drawBoxesAndUpdate = (canvas: HTMLCanvasElement, boxes: DetectionBox[]): boolean => {
    let confirmedNew = false
    if (!boxes?.length) return false

    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 3
    ctx.font = '18px monospace'

    const bestBoxes = selectBestBoxes(boxes, settingsStore.confidenceThreshold)
    if (!bestBoxes.length) return false

    for (const box of bestBoxes) {
      const conf = box.plateText.confidence
      const confMean = conf.reduce((a, b) => a + b, 0) / conf.length

      const { x1, y1, x2, y2 } = box
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

      const label = `${box.plateText.text} ${(confMean * 100).toFixed(1)}%`
      const tw = ctx.measureText(label).width
      ctx.fillStyle = '#00FF00'
      ctx.fillRect(x1, y1 - 24, tw + 10, 24)
      ctx.fillStyle = '#000'
      ctx.fillText(label, x1 + 5, y1 - 6)
    }

    for (const box of bestBoxes) {
      const conf = box.plateText.confidence
      const confMean = conf.reduce((a, b) => a + b, 0) / conf.length
      const quality = evaluatePlateQuality({ ...box, confidenceMean: confMean })
      if (!quality.isValid) continue

      const isDuplicateText = settingsStore.skipDuplicates
        ? plateStore.plates.some((p) => calculateTextSimilarity(p.text, box.plateText.text) >= 0.8)
        : false

      const shouldStop = plateStore.addPlate({
        id: `plate_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        text: box.plateText.text,
        confidence: confMean,
        croppedImage: box.croppedImage ? markRaw(box.croppedImage) : null,
        boundingBox: { x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2 },
        plateText: box.plateText,
        timestamp: new Date(),
      })

      if (shouldStop === true) {
        confirmedNew = true

        if (settingsStore.feedbackEnabled && !isDuplicateText) {
          notifyDetection()
        }
      }
    }

    return confirmedNew
  }

  const resetProcessing = (): void => {
    _isProcessing.value = false
  }

  return {
    modelReady: _modelReady,
    modelFailed: _modelFailed,
    isProcessing: _isProcessing,
    processFrame,
    onBoxes,
    drawBoxesAndUpdate,
    resetProcessing,
  }
}
