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

vi.stubGlobal(
  'Worker',
  class {
    onmessage: ((event: MessageEvent) => void) | null = null
    postMessage = vi.fn()
    terminate = vi.fn()
    constructor() {
      capturedWorkerInstance = this as any
    }
  },
)

vi.mock('@/stores/appStore', () => ({
  useAppStore: vi.fn(() => ({
    setModelReady: mockSetModelReady,
    setModelError: mockSetModelError,
  })),
}))

vi.mock('@/stores/settingsStore', () => {
  const store = {
    feedbackEnabled: true,
    confidenceThreshold: 0.7,
    skipDuplicates: true,
    continuousMode: true,
    confirmationTimeMs: 3000,
    fastConfirmationTimeMs: 1000,
  }
  return {
    useSettingsStore: vi.fn(() => store),
    DEFAULTS: {
      feedbackEnabled: true,
      confidenceThreshold: 0.7,
      confirmationTime: 3,
      fastConfirmationTime: 1,
      continuousMode: true,
      skipDuplicates: true,
      theme: 'system',
    },
  }
})

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
      plateText: { text: 'AB1234', confidence: [0.95, 0.92, 0.88, 0.91, 0.93, 0.9] },
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

      expect(capturedWorkerInstance.postMessage).toHaveBeenCalledWith({ imageBitmap: bitmap }, [
        bitmap,
      ])
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
      const result = detection.drawBoxesAndUpdate(canvas, [])
      expect(result).toBe(false)
    })

    it('skips boxes without plateText confidence', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      const noConfBox = {
        x1: 10,
        y1: 20,
        x2: 100,
        y2: 50,
        plateText: { text: 'X' },
        confidence: 0.5,
        area: 100,
      }
      detection.drawBoxesAndUpdate(canvas, [noConfBox as any])
      expect(mockCtx.strokeRect).not.toHaveBeenCalled()
    })

    it('skips boxes below confidence threshold', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      const lowConfBox = makeBox({
        plateText: { text: 'AB12', confidence: [0.1] },
      })
      detection.drawBoxesAndUpdate(canvas, [lowConfBox])
    })

    it('draws boxes and adds valid plates to store when not in camera mode', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      detection.drawBoxesAndUpdate(canvas, [makeBox()])

      expect(store.plates.length).toBeGreaterThan(0)
      expect(mockCtx.strokeRect).toHaveBeenCalled()
    })

    it('adds all valid bestBoxes to the store, not just the longest', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      const box1 = makeBox({
        plateText: { text: 'AB1234', confidence: [0.95, 0.93, 0.91, 0.94, 0.92, 0.9] },
        x1: 10,
      })
      const box2 = makeBox({
        plateText: { text: 'CD5678', confidence: [0.96, 0.94, 0.92, 0.95, 0.93, 0.91] },
        x1: 150,
      })

      detection.drawBoxesAndUpdate(canvas, [box1, box2])

      const plates = store.plates
      const plateTexts = plates.map((p: any) => p.text)
      expect(plateTexts).toContain('AB1234')
      expect(plateTexts).toContain('CD5678')
    })

    it('adds multiple different plate texts to the store', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()
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

      detection.drawBoxesAndUpdate(canvas, [shortBox, longBox])

      const plateTexts = store.plates.map((p: any) => p.text)
      expect(plateTexts).toContain('AB12')
      expect(plateTexts).toContain('AB12345')
    })

    it('resetProcessing sets isProcessing to false', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      detection.isProcessing.value = true
      detection.resetProcessing()
      expect(detection.isProcessing.value).toBe(false)
    })

    it('skips boxes with low quality when adding to store', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      const lowQualityBox = makeBox({
        plateText: { text: 'AB', confidence: [0.3, 0.4] },
        x1: 10,
      })

      detection.drawBoxesAndUpdate(canvas, [lowQualityBox])

      expect(mockCtx.strokeRect).not.toHaveBeenCalled()
    })

    it('notifies detection when feedbackEnabled and shouldStop is true in camera mode', async () => {
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

      vi.spyOn(Date, 'now').mockReturnValue(now + 1000)

      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      detection.drawBoxesAndUpdate(canvas, [makeBox()])

      expect(mockNotifyDetection).toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it('does not notify when feedbackEnabled is false', async () => {
      vi.resetModules()
      vi.doMock('@/stores/settingsStore', () => {
        const store = {
          feedbackEnabled: false,
          confidenceThreshold: 0.7,
          skipDuplicates: true,
          continuousMode: true,
          confirmationTimeMs: 3000,
          fastConfirmationTimeMs: 1000,
        }
        return {
          useSettingsStore: vi.fn(() => store),
          DEFAULTS: {
            feedbackEnabled: true,
            confidenceThreshold: 0.7,
            confirmationTime: 3,
            fastConfirmationTime: 1,
            continuousMode: true,
            skipDuplicates: true,
            theme: 'system',
          },
        }
      })

      const { useDetection: useDetectionFresh } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()
      store.setMode('camera')

      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      for (let i = 0; i < 5; i++) {
        store.addPlate({
          id: `existing_fb_${i}`,
          text: 'XY5678',
          confidence: 0.9,
          plateText: { text: 'XY5678', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        })
      }

      vi.spyOn(Date, 'now').mockReturnValue(now + 1000)

      const detection = useDetectionFresh()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      detection.drawBoxesAndUpdate(canvas, [
        makeBox({ plateText: { text: 'XY5678', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] } }),
      ])

      expect(mockNotifyDetection).not.toHaveBeenCalled()

      vi.doUnmock('@/stores/settingsStore')
      vi.restoreAllMocks()
    })

    it('selects higher confidence box when same text length', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      const lowConfBox = makeBox({
        plateText: { text: 'AB1234', confidence: [0.7, 0.7, 0.7, 0.7, 0.7, 0.7] },
        x1: 10,
      })
      const highConfBox = makeBox({
        plateText: { text: 'AB1234', confidence: [0.95, 0.95, 0.95, 0.95, 0.95, 0.95] },
        x1: 200,
      })

      detection.drawBoxesAndUpdate(canvas, [lowConfBox, highConfBox])

      expect(store.plates.length).toBe(1)
      expect(store.plates[0].text).toBe('AB1234')
      expect(store.plates[0].confidence).toBeCloseTo(0.95, 1)
    })

    it('does nothing when canvas has no context', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      const origGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as any

      const result = detection.drawBoxesAndUpdate(canvas, [makeBox()])

      expect(mockCtx.strokeRect).not.toHaveBeenCalled()
      expect(result).toBe(false)

      HTMLCanvasElement.prototype.getContext = origGetContext
    })

    it('returns true when a plate is confirmed in camera mode', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()
      store.setMode('camera')

      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      for (let i = 0; i < 5; i++) {
        store.addPlate({
          id: `conf_${i}`,
          text: 'CONF123',
          confidence: 0.9,
          plateText: { text: 'CONF123', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        })
      }

      vi.spyOn(Date, 'now').mockReturnValue(now + 1000)

      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      const confirmedBox = makeBox({
        text: 'CONF123',
        plateText: { text: 'CONF123', confidence: [0.95, 0.95, 0.95, 0.95, 0.95, 0.95] },
        confidence: 0.95,
      })

      const result = detection.drawBoxesAndUpdate(canvas, [confirmedBox])
      expect(result).toBe(true)

      vi.restoreAllMocks()
    })

    it('returns false when no plate is confirmed', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      const result = detection.drawBoxesAndUpdate(canvas, [])
      expect(result).toBe(false)
    })

    it('does not notify when skipDuplicates is true and plate is duplicate', async () => {
      vi.resetModules()
      vi.doMock('@/stores/settingsStore', () => {
        const store = {
          feedbackEnabled: true,
          confidenceThreshold: 0.7,
          skipDuplicates: true,
          continuousMode: true,
          confirmationTimeMs: 3000,
          fastConfirmationTimeMs: 1000,
        }
        return {
          useSettingsStore: vi.fn(() => store),
          DEFAULTS: {
            feedbackEnabled: true,
            confidenceThreshold: 0.7,
            confirmationTime: 3,
            fastConfirmationTime: 1,
            continuousMode: true,
            skipDuplicates: true,
            theme: 'system',
          },
        }
      })

      const { useDetection: useDetectionFresh } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()

      store.addPlate({
        id: 'dup_existing',
        text: 'DUP123',
        confidence: 0.9,
        plateText: { text: 'DUP123', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        croppedImage: null,
        boundingBox: null,
      })

      store.setMode('camera')

      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      for (let i = 0; i < 5; i++) {
        store.addPlate({
          id: `dup_cam_${i}`,
          text: 'DUP123',
          confidence: 0.9,
          plateText: { text: 'DUP123', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        })
      }

      vi.spyOn(Date, 'now').mockReturnValue(now + 1000)

      const detection = useDetectionFresh()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      detection.drawBoxesAndUpdate(canvas, [
        makeBox({ plateText: { text: 'DUP123', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] } }),
      ])

      expect(mockNotifyDetection).not.toHaveBeenCalled()

      vi.doUnmock('@/stores/settingsStore')
      vi.restoreAllMocks()
    })

    it('notifies when skipDuplicates is false even for duplicate plate', async () => {
      vi.resetModules()
      vi.doMock('@/stores/settingsStore', () => {
        const store = {
          feedbackEnabled: true,
          confidenceThreshold: 0.7,
          skipDuplicates: false,
          continuousMode: true,
          confirmationTimeMs: 3000,
          fastConfirmationTimeMs: 1000,
        }
        return {
          useSettingsStore: vi.fn(() => store),
          DEFAULTS: {
            feedbackEnabled: true,
            confidenceThreshold: 0.7,
            confirmationTime: 3,
            fastConfirmationTime: 1,
            continuousMode: true,
            skipDuplicates: true,
            theme: 'system',
          },
        }
      })

      const { useDetection: useDetectionFresh } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()

      store.addPlate({
        id: 'dup_existing2',
        text: 'DUP456',
        confidence: 0.9,
        plateText: { text: 'DUP456', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        croppedImage: null,
        boundingBox: null,
      })

      store.setMode('camera')

      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      for (let i = 0; i < 5; i++) {
        store.addPlate({
          id: `dup_cam2_${i}`,
          text: 'DUP456',
          confidence: 0.9,
          plateText: { text: 'DUP456', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        })
      }

      vi.spyOn(Date, 'now').mockReturnValue(now + 1000)

      const detection = useDetectionFresh()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      detection.drawBoxesAndUpdate(canvas, [
        makeBox({ plateText: { text: 'DUP456', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] } }),
      ])

      expect(mockNotifyDetection).toHaveBeenCalled()

      vi.doUnmock('@/stores/settingsStore')
      vi.restoreAllMocks()
    })

    it('selects longer text over shorter text in selectBestBoxes', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      const shortBox = makeBox({
        plateText: { text: 'AB', confidence: [0.9, 0.9] },
        x1: 10,
      })
      const longBox = makeBox({
        plateText: { text: 'AB1234', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        x1: 150,
      })

      detection.drawBoxesAndUpdate(canvas, [shortBox, longBox])

      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()
      expect(store.plates.length).toBe(1)
    })
  })
})
