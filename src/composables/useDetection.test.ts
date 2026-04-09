import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

let capturedWorkerInstance: {
  onmessage: ((event: MessageEvent) => void) | null
  postMessage: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
}

const mockSetModelReady = vi.fn()
const mockSetModelError = vi.fn()
const mockNotifyDetection = vi.fn()

vi.stubGlobal('Worker', class {
  onmessage: ((event: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() {
    capturedWorkerInstance = this as any
  }
})

vi.mock('@/stores/appStore', () => ({
  useAppStore: vi.fn(() => ({
    setModelReady: mockSetModelReady,
    setModelError: mockSetModelError,
  })),
}))

vi.mock('@/utils/feedback', () => ({
  notifyDetection: mockNotifyDetection,
  playBeep: vi.fn(),
  triggerVibration: vi.fn(),
}))

function simulateWorkerMessage(data: unknown) {
  if (capturedWorkerInstance?.onmessage) {
    capturedWorkerInstance.onmessage({ data } as MessageEvent)
  }
}

describe('useDetection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
    mockSetModelReady.mockClear()
    mockSetModelError.mockClear()
    mockNotifyDetection.mockClear()
  })

  function makeBox(overrides: Record<string, unknown> = {}) {
    return {
      x1: 10,
      y1: 20,
      x2: 100,
      y2: 50,
      plateText: { text: 'AB1234', confidence: [0.95, 0.92, 0.88, 0.91, 0.93, 0.90] },
      croppedImage: null,
      confidence: 0.9,
      area: 2700,
      ...overrides,
    }
  }

  it('isProcessing starts as false', async () => {
    const { useDetection } = await import('@/composables/useDetection')
    const detection = useDetection()
    expect(detection.isProcessing.value).toBe(false)
  })

  it('modelReady starts as false', async () => {
    const { useDetection } = await import('@/composables/useDetection')
    const detection = useDetection()
    expect(detection.modelReady.value).toBe(false)
  })

  it('processFrame skips and closes bitmap when model not ready', async () => {
    const { useDetection } = await import('@/composables/useDetection')
    const detection = useDetection()
    const bitmap = { close: vi.fn() } as any
    await detection.processFrame(bitmap)
    expect(bitmap.close).toHaveBeenCalled()
  })

  describe('worker message handling', () => {
    it('model_ready message sets modelReady true and calls appStore.setModelReady', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()

      simulateWorkerMessage({ status: 'model_ready' })

      expect(detection.modelReady.value).toBe(true)
      expect(mockSetModelReady).toHaveBeenCalled()
    })

    it('model_failed message sets modelFailed true and calls appStore.setModelError', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()

      simulateWorkerMessage({ status: 'model_failed' })

      expect(detection.modelFailed.value).toBe(true)
      expect(mockSetModelError).toHaveBeenCalledWith('No se pudo cargar el modelo de detección')
    })

    it('error message sets isProcessing false', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()

      detection.isProcessing.value = true

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      simulateWorkerMessage({ error: 'something went wrong' })
      consoleSpy.mockRestore()

      expect(detection.isProcessing.value).toBe(false)
    })

    it('array message sets isProcessing false and invokes onBoxes callbacks', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()

      detection.isProcessing.value = true

      const callback = vi.fn()
      detection.onBoxes(callback)

      const boxes = [makeBox()]
      simulateWorkerMessage(boxes)

      expect(detection.isProcessing.value).toBe(false)
      expect(callback).toHaveBeenCalledWith(boxes)
    })

    it('array message does not invoke unsubscribed callbacks', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()

      const callback = vi.fn()
      const unsubscribe = detection.onBoxes(callback)
      unsubscribe()

      simulateWorkerMessage([makeBox()])

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('processFrame with model ready', () => {
    it('sends bitmap to worker via postMessage', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()

      simulateWorkerMessage({ status: 'model_ready' })

      const bitmap = { close: vi.fn() } as any
      await detection.processFrame(bitmap)

      expect(capturedWorkerInstance.postMessage).toHaveBeenCalledWith(
        { imageBitmap: bitmap },
        [bitmap],
      )
    })

    it('skips when already processing', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()

      simulateWorkerMessage({ status: 'model_ready' })

      const bitmap1 = { close: vi.fn() } as any
      await detection.processFrame(bitmap1)

      capturedWorkerInstance.postMessage.mockClear()

      const bitmap2 = { close: vi.fn() } as any
      await detection.processFrame(bitmap2)

      expect(bitmap2.close).toHaveBeenCalled()
      expect(capturedWorkerInstance.postMessage).not.toHaveBeenCalled()
    })
  })

  describe('onBoxes', () => {
    it('returns unsubscribe function', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const callback = vi.fn()
      const unsubscribe = detection.onBoxes(callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('supports multiple callbacks', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      detection.onBoxes(cb1)
      detection.onBoxes(cb2)

      simulateWorkerMessage([makeBox()])

      expect(cb1).toHaveBeenCalled()
      expect(cb2).toHaveBeenCalled()
    })
  })

  describe('drawBoxesAndUpdate', () => {
    let mockCtx: Record<string, any>

    beforeEach(() => {
      mockCtx = {
        strokeRect: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        fillStyle: '',
        clearRect: vi.fn(),
      }
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any
    })

    it('does nothing with empty boxes', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      const stopCallback = vi.fn()
      detection.drawBoxesAndUpdate(canvas, [], stopCallback)
      expect(stopCallback).not.toHaveBeenCalled()
    })

    it('skips boxes without plateText confidence', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      const noConfBox = { x1: 10, y1: 20, x2: 100, y2: 50, plateText: { text: 'X' }, confidence: 0.5, area: 100 }
      detection.drawBoxesAndUpdate(canvas, [noConfBox as any], vi.fn())
      expect(mockCtx.strokeRect).not.toHaveBeenCalled()
    })

    it('skips boxes below confidence threshold', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      const lowConfBox = makeBox({
        plateText: { text: 'AB12', confidence: [0.1] },
      })
      detection.drawBoxesAndUpdate(canvas, [lowConfBox], vi.fn())
    })

    it('draws boxes and adds valid plates to store when not in camera mode', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      detection.drawBoxesAndUpdate(canvas, [makeBox()], vi.fn())

      expect(store.plates.length).toBeGreaterThan(0)
      expect(mockCtx.strokeRect).toHaveBeenCalled()
    })

    it('calls notifyDetection when shouldStop is true', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()
      store.setMode('camera')

      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      for (let i = 0; i < 5; i++) {
        store.addPlate({
          id: `existing_${i}`,
          text: 'AB1234',
          confidence: 0.9,
          plateText: { text: 'AB1234', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        })
      }

      vi.spyOn(Date, 'now').mockReturnValue(now + store.MIN_FAST_CONFIRMATION_TIME)

      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150
      const stopCallback = vi.fn()

      detection.drawBoxesAndUpdate(canvas, [makeBox()], stopCallback)

      expect(stopCallback).toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it('selects longest plate text when multiple candidates', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      const shortBox = makeBox({
        plateText: { text: 'AB12', confidence: [0.9, 0.9, 0.9, 0.9] },
      })
      const longBox = makeBox({
        plateText: { text: 'AB12345', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
      })

      detection.drawBoxesAndUpdate(canvas, [shortBox, longBox], vi.fn())
    })

    it('resetProcessing sets isProcessing to false', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      detection.isProcessing.value = true
      detection.resetProcessing()
      expect(detection.isProcessing.value).toBe(false)
    })
  })
})