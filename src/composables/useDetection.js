import { ref } from 'vue'
import { usePlateStore } from '@/stores/plateStore'
import { evaluatePlateQuality } from '@/composables/useValidation'
import { addPlateDetection } from '@/utils/plateStorage'

// Singleton: un solo worker por módulo JS, compartido entre useCamera y useImage
let _worker = null
const _modelReady = ref(false)
const _modelFailed = ref(false)
const _isProcessing = ref(false)
let _onBoxesCallback = null

function getWorker() {
  if (_worker) return _worker

  _worker = new Worker(
    new URL('../workers/mainWorker.js', import.meta.url),
    { type: 'module' }
  )

  _worker.onmessage = (event) => {
    const data = event.data

    if (data?.status === 'model_ready') {
      _modelReady.value = true
      return
    }

    if (data?.status === 'model_failed') {
      _modelFailed.value = true
      return
    }

    if (data?.error) {
      console.error('Worker error:', data.error)
      _isProcessing.value = false
      return
    }

    if (Array.isArray(data)) {
      _isProcessing.value = false
      _onBoxesCallback?.(data)
    }
  }

  return _worker
}

export function useDetection() {
  const plateStore = usePlateStore()
  const worker = getWorker()

  const processFrame = async (imageBitmap) => {
    if (!_modelReady.value || _isProcessing.value) {
      imageBitmap.close()
      return
    }
    _isProcessing.value = true
    worker.postMessage({ imageBitmap }, [imageBitmap])
  }

  const onBoxes = (callback) => {
    _onBoxesCallback = callback
  }

  const drawBoxesAndUpdate = (canvas, boxes, mode, stopCallback) => {
    if (!boxes?.length) return

    const ctx = canvas.getContext('2d')
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

      const result = addPlateDetection({
        text: box.plateText.text,
        confidence: confMean,
        croppedImage: box.croppedImage,
        boundingBox: { x1, y1, x2, y2 },
        plateText: box.plateText
      })

      if (result === true) {
        stopCallback?.()
        return
      }

      if (result?.id) {
        plateStore.addPlate({
          id: result.id,
          plateText: box.plateText,
          confidence: confMean,
          croppedImage: box.croppedImage,
          timestamp: result.timestamp
        })
      }
    }
  }

  return {
    modelReady: _modelReady,
    modelFailed: _modelFailed,
    isProcessing: _isProcessing,
    processFrame,
    onBoxes,
    drawBoxesAndUpdate
  }
}
