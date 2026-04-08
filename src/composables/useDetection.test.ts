import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.stubGlobal('Worker', class {
  onmessage: ((event: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
})

vi.mock('@/stores/appStore', () => ({
  useAppStore: vi.fn(() => ({
    setModelReady: vi.fn(),
    setModelError: vi.fn(),
  })),
}))

describe('useDetection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
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

  it('onBoxes returns unsubscribe function', async () => {
    const { useDetection } = await import('@/composables/useDetection')
    const detection = useDetection()
    const callback = vi.fn()
    const unsubscribe = detection.onBoxes(callback)
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
  })

  it('onBoxes supports multiple callbacks', async () => {
    const { useDetection } = await import('@/composables/useDetection')
    const detection = useDetection()
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    detection.onBoxes(cb1)
    detection.onBoxes(cb2)
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).not.toHaveBeenCalled()
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
      }
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any
    })

    it('does nothing with empty boxes', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const detection = useDetection()
      const canvas = document.createElement('canvas')
      const stopCallback = vi.fn()
      const result = detection.drawBoxesAndUpdate(canvas, [], stopCallback)
      expect(result).toBeUndefined()
      expect(stopCallback).not.toHaveBeenCalled()
    })

    it('draws boxes and adds valid plates to store', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const detection = useDetection()
      const store = usePlateStore()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150

      const box = makeBox()
      detection.drawBoxesAndUpdate(canvas, [box], vi.fn())

      expect(store.plates.length).toBeGreaterThan(0)
    })

    it('calls stopCallback when shouldStop is true', async () => {
      const { useDetection } = await import('@/composables/useDetection')
      const { usePlateStore } = await import('@/stores/plateStore')
      const store = usePlateStore()
      store.setMode('camera')

      for (let i = 0; i < 10; i++) {
        store.addPlate({
          id: `existing_${i}`,
          text: 'AB1234',
          confidence: 0.9,
          plateText: { text: 'AB1234', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        })
      }

      const detection = useDetection()
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150
      const stopCallback = vi.fn()

      const box = makeBox()
      detection.drawBoxesAndUpdate(canvas, [box], stopCallback)

      expect(stopCallback).toHaveBeenCalled()
    })
  })
})