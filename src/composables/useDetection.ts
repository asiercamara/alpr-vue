/**
 * Web Worker singleton and detection pipeline.
 * One Worker is created per page load and shared across all `useDetection()` calls.
 */
import { ref, markRaw } from 'vue'
import { usePlateStore } from '@/stores/plateStore'
import { useAppStore } from '@/stores/appStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { evaluatePlateQuality } from '@/utils/validation'
import { calculateTextSimilarity } from '@/utils/validation'
import { notifyDetection } from '@/utils/feedback'
import type { DetectionBox } from '@/types/detection'

/**
 * The single Worker instance shared across the application.
 * `null` until the first `getWorker()` call.
 */
let _worker: Worker | null = null
/** `true` once the Worker has sent `{ status: 'model_ready' }`. */
const _modelReady = ref(false)
/** `true` if the Worker failed to load the model. */
const _modelFailed = ref(false)
/**
 * Processing lock: `true` while a frame is in-flight to the Worker.
 * Prevents queuing multiple frames simultaneously.
 */
const _isProcessing = ref(false)
/** Registered callbacks invoked whenever the Worker returns a detection result. */
let _onBoxesCallbacks: Array<(data: DetectionBox[]) => void> = []

/**
 * Lazily initialises and returns the detection Worker singleton.
 *
 * Routes 4 incoming message shapes:
 * - `{ status: 'model_ready' }` — sets `_modelReady`, notifies `appStore`.
 * - `{ status: 'model_failed' }` — sets `_modelFailed`, notifies `appStore`.
 * - `{ error: string }` — logs the error and releases the processing lock.
 * - `DetectionBox[]` — releases the processing lock and fans out to all registered callbacks.
 */
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

/**
 * Filters and deduplicates detection boxes by confidence threshold and text.
 *
 * Filtering: boxes whose mean character confidence is below `threshold` are discarded.
 * Deduplication: for boxes sharing the same `plateText.text`, keeps the one with the
 * longer text (more characters recognized). On equal length, keeps the higher mean confidence.
 *
 * @param boxes - Raw detection results from the Worker.
 * @param threshold - Minimum mean character confidence in `[0, 1]`.
 * @returns Deduplicated array of best-quality boxes.
 */
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

/**
 * Composable that exposes the shared detection Worker and pipeline utilities.
 *
 * Returns:
 * - `modelReady` / `modelFailed` / `isProcessing` — reactive Worker state flags.
 * - `processFrame` — send a frame bitmap to the Worker.
 * - `onBoxes` — subscribe to detection results.
 * - `drawBoxesAndUpdate` — draw bounding boxes and commit valid detections.
 * - `resetProcessing` — release the processing lock after an aborted pipeline.
 */
export function useDetection() {
  const plateStore = usePlateStore()
  const settingsStore = useSettingsStore()
  const worker = getWorker()

  /**
   * Sends a video frame to the Worker for detection.
   *
   * Guards: skips (and closes) the bitmap when the model is not ready or a previous frame
   * is still in-flight (`_isProcessing`), to avoid memory leaks and race conditions.
   *
   * @param imageBitmap - Frame captured via `createImageBitmap`. The Worker takes ownership.
   */
  const processFrame = async (imageBitmap: ImageBitmap): Promise<void> => {
    if (!_modelReady.value || _isProcessing.value) {
      imageBitmap.close()
      return
    }
    _isProcessing.value = true
    worker.postMessage({ imageBitmap }, [imageBitmap])
  }

  /**
   * Subscribes to detection results from the Worker.
   *
   * Uses a simple pub/sub array: the callback is called each time the Worker returns boxes.
   *
   * @param callback - Function to call with the detection results.
   * @returns Unsubscribe function — call it (e.g., in `onUnmounted`) to stop receiving events.
   */
  const onBoxes = (callback: (data: DetectionBox[]) => void): (() => void) => {
    _onBoxesCallbacks.push(callback)
    return () => {
      _onBoxesCallbacks = _onBoxesCallbacks.filter((cb) => cb !== callback)
    }
  }

  /**
   * Draws bounding boxes on the canvas and commits valid detections to `plateStore`.
   *
   * Two-pass approach:
   * 1. **Draw pass** — renders all best-quality boxes on the canvas with confidence labels.
   * 2. **Validate & store pass** — for each box: runs `evaluatePlateQuality`; skips invalid
   *    or duplicate plates (when `skipDuplicates` is on); calls `plateStore.addPlate` and
   *    triggers `notifyDetection` on confirmation.
   *
   * @param canvas - Canvas element to draw onto (must match video dimensions).
   * @param boxes - Raw detection boxes from the Worker.
   * @returns `true` when at least one new plate was confirmed (signals camera to consider stopping).
   */
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

  /**
   * Clears the processing lock.
   *
   * Call after aborting the pipeline (e.g., on camera stop) to prevent deadlock where
   * `_isProcessing` remains `true` and no further frames are sent.
   */
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
