import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockProcessFrame = vi.fn()
const mockOnBoxes = vi.fn(() => vi.fn())
const mockDrawBoxesAndUpdate = vi.fn()

vi.mock('@/composables/useDetection', () => ({
  useDetection: () => ({
    modelReady: { value: true },
    isProcessing: { value: false },
    processFrame: mockProcessFrame,
    onBoxes: mockOnBoxes,
    drawBoxesAndUpdate: mockDrawBoxesAndUpdate,
    resetProcessing: vi.fn(),
  }),
}))

vi.mock('@/stores/plateStore', () => ({
  usePlateStore: () => ({
    setMode: vi.fn(),
  }),
}))

import { useStaticMedia } from '@/composables/useStaticMedia'
import type { DetectionBox } from '@/types/detection'

describe('useStaticMedia', () => {
  beforeEach(() => {
    mockProcessFrame.mockClear()
    mockOnBoxes.mockClear()
    mockDrawBoxesAndUpdate.mockClear()
  })

  it('starts with idle status and zero progress', () => {
    const media = useStaticMedia()
    expect(media.status.value).toBe('idle')
    expect(media.progress.value).toBe(0)
    expect(media.currentFrame.value).toBe(0)
    expect(media.totalFrames.value).toBe(0)
  })

  it('exposes all expected methods', () => {
    const media = useStaticMedia()
    expect(typeof media.processImage).toBe('function')
    expect(typeof media.processVideo).toBe('function')
    expect(typeof media.cancelProcessing).toBe('function')
  })

  describe('processImage', () => {
    it('sets status to error when model is not ready', async () => {
      vi.resetModules()
      vi.doMock('@/composables/useDetection', () => ({
        useDetection: () => ({
          modelReady: { value: false },
          isProcessing: { value: false },
          processFrame: mockProcessFrame,
          onBoxes: mockOnBoxes,
          drawBoxesAndUpdate: mockDrawBoxesAndUpdate,
          resetProcessing: vi.fn(),
        }),
      }))

      const { useStaticMedia: useStaticMediaFresh } = await import('@/composables/useStaticMedia')
      const media = useStaticMediaFresh()
      const canvas = document.createElement('canvas')
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })

      const result = await media.processImage(file, canvas)

      expect(result).toEqual([])
      expect(media.status.value).toBe('error')

      vi.doUnmock('@/composables/useDetection')
    })

    it('sets status to error when createImageBitmap fails', async () => {
      const media = useStaticMedia()
      const canvas = document.createElement('canvas')
      vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bitmap error')))

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      const result = await media.processImage(file, canvas)

      expect(result).toEqual([])
      expect(media.status.value).toBe('error')

      vi.unstubAllGlobals()
    })

    it('sets status to error when canvas has no context', async () => {
      const media = useStaticMedia()
      const canvas = document.createElement('canvas')
      const mockBitmap = { width: 100, height: 50, close: vi.fn() }

      const origGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as any
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      const result = await media.processImage(file, canvas)

      expect(result).toEqual([])
      expect(media.status.value).toBe('error')
      expect(mockBitmap.close).toHaveBeenCalled()

      HTMLCanvasElement.prototype.getContext = origGetContext
      vi.unstubAllGlobals()
    })

    it('processes image successfully and returns detection boxes', async () => {
      const media = useStaticMedia()
      const canvas = document.createElement('canvas')
      const mockCtx = { drawImage: vi.fn() }
      const origGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

      const mockBitmap = { width: 200, height: 100, close: vi.fn() }
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))

      const testBoxes: DetectionBox[] = [
        {
          x1: 10,
          y1: 20,
          x2: 100,
          y2: 50,
          plateText: { text: 'ABC123', confidence: [0.95] },
          confidence: 0.95,
          area: 2700,
          croppedImage: null,
        },
      ]

      let capturedCallback: ((boxes: DetectionBox[]) => void) | null = null
      const mockUnsubscribe = vi.fn()
      mockOnBoxes.mockImplementation((cb: (boxes: DetectionBox[]) => void) => {
        capturedCallback = cb
        return mockUnsubscribe
      })

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      const resultPromise = media.processImage(file, canvas)

      expect(media.status.value).toBe('loading')

      await new Promise((r) => setTimeout(r, 0))

      expect(media.status.value).toBe('processing')
      expect(media.progress.value).toBe(50)

      expect(capturedCallback).not.toBeNull()
      capturedCallback!(testBoxes)

      const result = await resultPromise

      expect(result).toEqual(testBoxes)
      expect(media.status.value).toBe('done')
      expect(media.progress.value).toBe(100)
      expect(mockBitmap.close).toHaveBeenCalled()
      expect(mockDrawBoxesAndUpdate).toHaveBeenCalledWith(canvas, testBoxes)
      expect(mockUnsubscribe).toHaveBeenCalled()

      HTMLCanvasElement.prototype.getContext = origGetContext
      vi.unstubAllGlobals()
    })
  })

  describe('processVideo', () => {
    it('sets status to error when model is not ready', async () => {
      vi.resetModules()
      vi.doMock('@/composables/useDetection', () => ({
        useDetection: () => ({
          modelReady: { value: false },
          isProcessing: { value: false },
          processFrame: mockProcessFrame,
          onBoxes: mockOnBoxes,
          drawBoxesAndUpdate: mockDrawBoxesAndUpdate,
          resetProcessing: vi.fn(),
        }),
      }))

      const { useStaticMedia: useStaticMediaFresh } = await import('@/composables/useStaticMedia')
      const media = useStaticMediaFresh()
      const canvas = document.createElement('canvas')
      const file = new File([''], 'test.mp4', { type: 'video/mp4' })

      const result = await media.processVideo(file, canvas)

      expect(result).toEqual([])
      expect(media.status.value).toBe('error')

      vi.doUnmock('@/composables/useDetection')
    })

    it('sets status to error when video fails to load', async () => {
      const media = useStaticMedia()
      const canvas = document.createElement('canvas')
      const file = new File([''], 'test.mp4', { type: 'video/mp4' })

      const origCreate = URL.createObjectURL
      const origRevoke = URL.revokeObjectURL
      URL.createObjectURL = vi.fn(() => 'blob:test')
      URL.revokeObjectURL = vi.fn()

      const origCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          const video = origCreateElement('video')
          Object.defineProperty(video, 'onerror', {
            set(fn: (() => void) | null) {
              setTimeout(() => fn?.(), 0)
            },
            configurable: true,
          })
          Object.defineProperty(video, 'onloadedmetadata', {
            set() {},
            configurable: true,
          })
          return video
        }
        return origCreateElement(tag)
      })

      const result = await media.processVideo(file, canvas)

      expect(result).toEqual([])
      expect(media.status.value).toBe('error')
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
      ;(document.createElement as ReturnType<typeof vi.fn>).mockRestore()
      URL.createObjectURL = origCreate
      URL.revokeObjectURL = origRevoke
    })

    it('processes video frames successfully', async () => {
      const media = useStaticMedia()
      const canvas = document.createElement('canvas')
      const mockCtx = { drawImage: vi.fn() }
      const origGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

      const origCreate = URL.createObjectURL
      const origRevoke = URL.revokeObjectURL
      URL.createObjectURL = vi.fn(() => 'blob:test')
      URL.revokeObjectURL = vi.fn()

      const origCreateElement = document.createElement.bind(document)
      let metadataResolve: (() => void) | null = null
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          const video = origCreateElement('video')
          Object.defineProperty(video, 'onloadedmetadata', {
            set(fn: () => void) {
              metadataResolve = fn
            },
            configurable: true,
          })
          Object.defineProperty(video, 'onerror', { set() {}, configurable: true })
          Object.defineProperty(video, 'duration', { value: 1.0, configurable: true })
          Object.defineProperty(video, 'onseeked', {
            set(fn: () => void) {
              setTimeout(fn, 0)
            },
            configurable: true,
          })
          Object.defineProperty(video, 'currentTime', {
            set() {},
            configurable: true,
          })
          return video
        }
        return origCreateElement(tag)
      })

      const mockBitmap = { width: 100, height: 50, close: vi.fn() }
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))

      const testBoxes: DetectionBox[] = [
        {
          x1: 10,
          y1: 20,
          x2: 100,
          y2: 50,
          plateText: { text: 'ABC123', confidence: [0.9] },
          confidence: 0.9,
          area: 2700,
          croppedImage: null,
        },
      ]

      mockOnBoxes.mockImplementation((cb: (boxes: DetectionBox[]) => void) => {
        setTimeout(() => cb(testBoxes), 0)
        return vi.fn()
      })

      const file = new File([''], 'test.mp4', { type: 'video/mp4' })

      const resultPromise = media.processVideo(file, canvas)

      if (metadataResolve) {
        metadataResolve()
      }

      const result = await resultPromise

      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].plateText.text).toBe('ABC123')
      expect(media.status.value).toBe('done')
      expect(media.progress.value).toBe(100)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
      ;(document.createElement as ReturnType<typeof vi.fn>).mockRestore()
      HTMLCanvasElement.prototype.getContext = origGetContext
      URL.createObjectURL = origCreate
      URL.revokeObjectURL = origRevoke
      vi.unstubAllGlobals()
    })

    it('skips frames when createImageBitmap fails in video loop', async () => {
      const media = useStaticMedia()
      const canvas = document.createElement('canvas')
      const mockCtx = { drawImage: vi.fn() }
      const origGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

      const origCreate = URL.createObjectURL
      const origRevoke = URL.revokeObjectURL
      URL.createObjectURL = vi.fn(() => 'blob:test')
      URL.revokeObjectURL = vi.fn()

      const origCreateElement = document.createElement.bind(document)
      let metadataResolve: (() => void) | null = null
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          const video = origCreateElement('video')
          Object.defineProperty(video, 'onloadedmetadata', {
            set(fn: () => void) {
              metadataResolve = fn
            },
            configurable: true,
          })
          Object.defineProperty(video, 'onerror', { set() {}, configurable: true })
          Object.defineProperty(video, 'duration', { value: 1.0, configurable: true })
          Object.defineProperty(video, 'onseeked', {
            set(fn: () => void) {
              setTimeout(fn, 0)
            },
            configurable: true,
          })
          Object.defineProperty(video, 'currentTime', {
            set() {},
            configurable: true,
          })
          return video
        }
        return origCreateElement(tag)
      })

      vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no bitmap')))

      const file = new File([''], 'test.mp4', { type: 'video/mp4' })

      const resultPromise = media.processVideo(file, canvas)

      if (metadataResolve) {
        metadataResolve()
      }

      const result = await resultPromise

      expect(result).toEqual([])
      expect(media.status.value).toBe('done')
      ;(document.createElement as ReturnType<typeof vi.fn>).mockRestore()
      HTMLCanvasElement.prototype.getContext = origGetContext
      URL.createObjectURL = origCreate
      URL.revokeObjectURL = origRevoke
      vi.unstubAllGlobals()
    })

    it('deduplicates detections with same plate text', async () => {
      const media = useStaticMedia()
      const canvas = document.createElement('canvas')
      const mockCtx = { drawImage: vi.fn() }
      const origGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

      const origCreate = URL.createObjectURL
      const origRevoke = URL.revokeObjectURL
      URL.createObjectURL = vi.fn(() => 'blob:test')
      URL.revokeObjectURL = vi.fn()

      const origCreateElement = document.createElement.bind(document)
      let metadataResolve: (() => void) | null = null
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          const video = origCreateElement('video')
          Object.defineProperty(video, 'onloadedmetadata', {
            set(fn: () => void) {
              metadataResolve = fn
            },
            configurable: true,
          })
          Object.defineProperty(video, 'onerror', { set() {}, configurable: true })
          Object.defineProperty(video, 'duration', { value: 1.0, configurable: true })
          Object.defineProperty(video, 'onseeked', {
            set(fn: () => void) {
              setTimeout(fn, 0)
            },
            configurable: true,
          })
          Object.defineProperty(video, 'currentTime', {
            set() {},
            configurable: true,
          })
          return video
        }
        return origCreateElement(tag)
      })

      const mockBitmap = { width: 100, height: 50, close: vi.fn() }
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))

      const boxA: DetectionBox = {
        x1: 10,
        y1: 20,
        x2: 100,
        y2: 50,
        plateText: { text: 'ABC123', confidence: [0.9] },
        confidence: 0.9,
        area: 2700,
        croppedImage: null,
      }

      mockOnBoxes.mockImplementation((cb: (boxes: DetectionBox[]) => void) => {
        setTimeout(() => cb([boxA]), 0)
        return vi.fn()
      })

      const file = new File([''], 'test.mp4', { type: 'video/mp4' })
      const resultPromise = media.processVideo(file, canvas)

      if (metadataResolve) {
        metadataResolve()
      }

      const result = await resultPromise

      expect(result).toHaveLength(1)
      ;(document.createElement as ReturnType<typeof vi.fn>).mockRestore()
      HTMLCanvasElement.prototype.getContext = origGetContext
      URL.createObjectURL = origCreate
      URL.revokeObjectURL = origRevoke
      vi.unstubAllGlobals()
    })
  })

  describe('cancelProcessing', () => {
    it('resets status to idle and progress to 0', () => {
      const media = useStaticMedia()
      media.status.value = 'processing'
      media.progress.value = 50
      media.cancelProcessing()
      expect(media.status.value).toBe('idle')
      expect(media.progress.value).toBe(0)
    })
  })
})
