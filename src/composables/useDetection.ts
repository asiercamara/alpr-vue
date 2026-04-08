import { ref, markRaw } from 'vue'
import { usePlateStore } from '@/stores/plateStore'
import { useAppStore } from '@/stores/appStore'
import { evaluatePlateQuality } from '@/utils/validation'
import type { DetectionBox } from '@/types/detection'

let _worker: Worker | null = null
const _modelReady = ref(false)
const _modelFailed = ref(false)
const _isProcessing = ref(false)
let _onBoxesCallbacks: Array<(data: DetectionBox[]) => void> = []

function getWorker(): Worker {
  if (_worker) return _worker

  _worker = new Worker(
    new URL('../workers/mainWorker.js', import.meta.url),
    { type: 'module' },
  )

  _worker.onmessage = (event: MessageEvent) => {
    const data = event.data

    if (data?.status === 'model_ready') {
      _modelReady.value = true
      try { useAppStore().setModelReady() } catch {}
      return
    }

    if (data?.status === 'model_failed') {
      _modelFailed.value = true
      try { useAppStore().setModelError('No se pudo cargar el modelo de detección') } catch {}
      return
    }

    if (data?.error) {
      console.error('Worker error:', data.error)
      _isProcessing.value = false
      return
    }

    if (Array.isArray(data)) {
      _isProcessing.value = false
      _onBoxesCallbacks.forEach(cb => cb(data))
    }
  }

  return _worker
}

export function useDetection() {
  const plateStore = usePlateStore()
  const worker = getWorker()

  const processFrame = async (imageBitmap: ImageBitmap): Promise<void> => {
    if (!_modelReady.value || _isProcessing.value) {
      imageBitmap.close()
      return
    }
    _isProcessing.value = true
    worker.postMessage({ imageBitmap }, [imageBitmap])
  }

  const onBoxes = (callback: (data: DetectionBox[]) => void): () => void => {
    _onBoxesCallbacks.push(callback)
    return () => { _onBoxesCallbacks = _onBoxesCallbacks.filter(cb => cb !== callback) }
  }

  const drawBoxesAndUpdate = (
    canvas: HTMLCanvasElement,
    boxes: DetectionBox[],
    stopCallback?: () => void,
  ): void => {
    if (!boxes?.length) return

    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 3
    ctx.font = '18px monospace'
    const CONF_THRESH = 0.7

    for (const box of boxes) {
      if (!box.plateText?.confidence?.length) continue

      const conf = box.plateText.confidence
      const confMean = conf.reduce((a, b) => a + b, 0) / conf.length
      if (confMean < CONF_THRESH) continue

      const { x1, y1, x2, y2 } = box
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

      const label = `${box.plateText.text} ${(confMean * 100).toFixed(1)}%`
      const tw = ctx.measureText(label).width
      ctx.fillStyle = '#00FF00'
      ctx.fillRect(x1, y1 - 24, tw + 10, 24)
      ctx.fillStyle = '#000'
      ctx.fillText(label, x1 + 5, y1 - 6)

      const quality = evaluatePlateQuality({ ...box, confidenceMean: confMean })
      if (!quality.isValid) continue

      const shouldStop = plateStore.addPlate({
        id: `plate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: box.plateText.text,
        confidence: confMean,
        croppedImage: box.croppedImage ? markRaw(box.croppedImage) : null,
        boundingBox: { x1, y1, x2, y2 },
        plateText: box.plateText,
        timestamp: new Date(),
      })

      if (shouldStop === true) {
        stopCallback?.()
        return
      }
    }
  }

  return {
    modelReady: _modelReady,
    modelFailed: _modelFailed,
    isProcessing: _isProcessing,
    processFrame,
    onBoxes,
    drawBoxesAndUpdate,
  }
}