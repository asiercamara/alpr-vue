import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockProcessFrame = vi.fn()
const mockOnBoxes = vi.fn(() => vi.fn())
const mockDrawBoxesAndUpdate = vi.fn()
const mockResetProcessing = vi.fn()
const mockSetMode = vi.fn()

vi.mock('@/composables/useDetection', () => ({
  useDetection: () => ({
    modelReady: { value: true },
    isProcessing: { value: false },
    processFrame: mockProcessFrame,
    onBoxes: mockOnBoxes,
    drawBoxesAndUpdate: mockDrawBoxesAndUpdate,
    resetProcessing: mockResetProcessing,
  }),
}))

vi.mock('@/stores/plateStore', () => ({
  usePlateStore: () => ({
    setMode: mockSetMode,
  }),
}))

import { useStaticMedia } from '@/composables/useStaticMedia'
import type { DetectionBox } from '@/types/detection'

describe('useStaticMedia', () => {
  let rafSpy: ReturnType<typeof vi.spyOn>
  let cancelRafSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setActivePinia(createPinia())
    mockProcessFrame.mockClear()
    mockOnBoxes.mockClear()
    mockDrawBoxesAndUpdate.mockClear()
    mockResetProcessing.mockClear()
    mockSetMode.mockClear()
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
      return 1
    })
    cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    rafSpy.mockRestore()
    cancelRafSpy.mockRestore()
  })

  it('starts with idle status', () => {
    const media = useStaticMedia()
    expect(media.status.value).toBe('idle')
  })

  it('exposes expected methods', () => {
    const media = useStaticMedia()
    expect(typeof media.processImage).toBe('function')
    expect(typeof media.processVideoStream).toBe('function')
    expect(typeof media.setVideoSource).toBe('function')
    expect(typeof media.stopMediaProcessing).toBe('function')
    expect(typeof media.cleanup).toBe('function')
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
          resetProcessing: mockResetProcessing,
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
      const mockCtx = {
        drawImage: vi.fn(),
        strokeRect: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
      }
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
          croppedImage: null as any,
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

      expect(capturedCallback).not.toBeNull()
      capturedCallback!(testBoxes)

      const result = await resultPromise

      expect(result).toEqual(testBoxes)
      expect(media.status.value).toBe('done')
      expect(mockBitmap.close).toHaveBeenCalled()
      expect(mockDrawBoxesAndUpdate).toHaveBeenCalledWith(canvas, testBoxes)
      expect(mockUnsubscribe).toHaveBeenCalled()

      HTMLCanvasElement.prototype.getContext = origGetContext
      vi.unstubAllGlobals()
    })

    it('calls plateStore.setMode with upload', async () => {
      const media = useStaticMedia()
      const canvas = document.createElement('canvas')
      const mockCtx = { drawImage: vi.fn() }
      const origGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

      const mockBitmap = { width: 200, height: 100, close: vi.fn() }
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      media.processImage(file, canvas)

      expect(mockSetMode).toHaveBeenCalledWith('upload')

      HTMLCanvasElement.prototype.getContext = origGetContext
      vi.unstubAllGlobals()
    })
  })

  describe('processVideoStream', () => {
    it('sets status to error when model is not ready', async () => {
      vi.resetModules()
      vi.doMock('@/composables/useDetection', () => ({
        useDetection: () => ({
          modelReady: { value: false },
          isProcessing: { value: false },
          processFrame: mockProcessFrame,
          onBoxes: mockOnBoxes,
          drawBoxesAndUpdate: mockDrawBoxesAndUpdate,
          resetProcessing: mockResetProcessing,
        }),
      }))

      const { useStaticMedia: useStaticMediaFresh } = await import('@/composables/useStaticMedia')
      const media = useStaticMediaFresh()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')

      media.processVideoStream(video, canvas)

      expect(media.status.value).toBe('error')

      vi.doUnmock('@/composables/useDetection')
    })

    it('sets status to loading and calls setMode with upload', () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')

      media.processVideoStream(video, canvas)

      expect(media.status.value).toBe('loading')
      expect(mockSetMode).toHaveBeenCalledWith('upload')
    })

    it('unsubscribes previous subscription when called a second time', () => {
      const unsubscribeSpy = vi.fn()
      mockOnBoxes.mockReturnValueOnce(unsubscribeSpy)

      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')

      media.processVideoStream(video, canvas)
      expect(unsubscribeSpy).not.toHaveBeenCalled()

      // Second call should unsubscribe the first subscription
      media.processVideoStream(video, canvas)
      expect(unsubscribeSpy).toHaveBeenCalled()
    })

    it('calls drawBoxesAndUpdate in loop when lastBoxes is non-empty', async () => {
      rafSpy.mockRestore()
      cancelRafSpy.mockRestore()

      let capturedBoxesCallback: ((boxes: DetectionBox[]) => void) | null = null
      mockOnBoxes.mockImplementation((cb: (boxes: DetectionBox[]) => void) => {
        capturedBoxesCallback = cb
        return vi.fn()
      })

      let rafCallback: FrameRequestCallback | null = null
      const rafSpyReal = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb
        return 1
      })

      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')

      Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
      Object.defineProperty(video, 'ended', { value: false, configurable: true })
      Object.defineProperty(video, 'videoWidth', { value: 100, configurable: true })
      Object.defineProperty(video, 'videoHeight', { value: 100, configurable: true })
      vi.spyOn(video, 'play').mockResolvedValue(undefined)

      const mockCtx = { drawImage: vi.fn(), clearRect: vi.fn() }
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

      media.processVideoStream(video, canvas)
      await Promise.resolve()

      // Simulate boxes arriving via the onBoxes subscription
      const fakeBox = {
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 50,
        plateText: { text: 'AB12', confidence: [0.9, 0.9, 0.9, 0.9] },
        croppedImage: null as any,
        confidence: 0.9,
        area: 5000,
      }
      capturedBoxesCallback!([fakeBox])

      // Run the RAF loop
      expect(rafCallback).not.toBeNull()
      rafCallback!(0)
      await Promise.resolve()

      expect(mockDrawBoxesAndUpdate).toHaveBeenCalledWith(canvas, [fakeBox])

      rafSpyReal.mockRestore()
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    })

    it('registers loadeddata listener when video not ready', () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const addEventListenerSpy = vi.spyOn(video, 'addEventListener')

      media.processVideoStream(video, canvas)

      expect(addEventListenerSpy).toHaveBeenCalledWith('loadeddata', expect.any(Function), {
        once: true,
      })
      addEventListenerSpy.mockRestore()
    })

    it('directly calls onLoaded when video readyState >= 2', async () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')

      Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
      vi.spyOn(video, 'play').mockResolvedValue(undefined)

      media.processVideoStream(video, canvas)
      await Promise.resolve()

      expect(rafSpy).toHaveBeenCalled()
    })

    it('sets status to error when video.play() fails', async () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')

      Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
      vi.spyOn(video, 'play').mockRejectedValue(new Error('play failed'))

      media.processVideoStream(video, canvas)
      await Promise.resolve()

      expect(media.status.value).toBe('error')
    })

    it('completes video processing loop with ended video', async () => {
      rafSpy.mockRestore()
      cancelRafSpy.mockRestore()

      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')

      Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
      Object.defineProperty(video, 'ended', { value: true, configurable: true })
      Object.defineProperty(video, 'videoWidth', { value: 100, configurable: true })
      Object.defineProperty(video, 'videoHeight', { value: 100, configurable: true })
      vi.spyOn(video, 'play').mockResolvedValue(undefined)

      media.processVideoStream(video, canvas)
      await new Promise((r) => setTimeout(r, 50))

      expect(media.status.value).toBe('done')

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    })

    it('processes video frames in requestAnimationFrame loop', async () => {
      rafSpy.mockRestore()
      cancelRafSpy.mockRestore()

      let rafCallback: (() => Promise<void>) | null = null
      const rafSpyReal = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb: FrameRequestCallback) => {
          rafCallback = async () => {
            cb(0)
          }
          return 1
        })

      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')

      Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
      Object.defineProperty(video, 'ended', { value: false, configurable: true })
      Object.defineProperty(video, 'videoWidth', { value: 100, configurable: true })
      Object.defineProperty(video, 'videoHeight', { value: 100, configurable: true })
      vi.spyOn(video, 'play').mockResolvedValue(undefined)

      const mockCtx = {
        drawImage: vi.fn(),
        clearRect: vi.fn(),
      }
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

      vi.stubGlobal(
        'createImageBitmap',
        vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }),
      )

      media.processVideoStream(video, canvas)
      await Promise.resolve()

      expect(rafCallback).not.toBeNull()
      await rafCallback!()

      expect(mockCtx.drawImage).toHaveBeenCalled()
      expect(mockProcessFrame).toHaveBeenCalled()

      rafSpyReal.mockRestore()
      vi.unstubAllGlobals()

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    })

    it('skips frame when createImageBitmap fails in loop', async () => {
      rafSpy.mockRestore()
      cancelRafSpy.mockRestore()

      let rafCallback: (() => Promise<void>) | null = null
      const rafSpyReal = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb: FrameRequestCallback) => {
          rafCallback = async () => {
            cb(0)
          }
          return 1
        })

      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')

      Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
      Object.defineProperty(video, 'ended', { value: false, configurable: true })
      Object.defineProperty(video, 'videoWidth', { value: 100, configurable: true })
      Object.defineProperty(video, 'videoHeight', { value: 100, configurable: true })
      vi.spyOn(video, 'play').mockResolvedValue(undefined)

      const mockCtx = {
        drawImage: vi.fn(),
        clearRect: vi.fn(),
      }
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

      vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bitmap error')))

      media.processVideoStream(video, canvas)
      await Promise.resolve()

      await rafCallback!()

      expect(media.status.value).not.toBe('error')

      rafSpyReal.mockRestore()
      vi.unstubAllGlobals()

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    })
  })

  describe('setVideoSource', () => {
    it('sets video src, muted, playsInline and calls load', () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const loadSpy = vi.spyOn(video, 'load')

      media.setVideoSource(video, 'blob:test-url')

      expect(video.src).toBe('blob:test-url')
      expect(video.muted).toBe(true)
      expect(video.playsInline).toBe(true)
      expect(loadSpy).toHaveBeenCalled()

      loadSpy.mockRestore()
    })

    it('revokes previous videoUrl when different', () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')

      media.setVideoSource(video, 'blob:old-url')
      media.setVideoSource(video, 'blob:new-url')

      expect(revokeSpy).toHaveBeenCalledWith('blob:old-url')
      revokeSpy.mockRestore()
    })

    it('does not revoke url when same', () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')

      media.setVideoSource(video, 'blob:same-url')
      media.setVideoSource(video, 'blob:same-url')

      expect(revokeSpy).not.toHaveBeenCalledWith('blob:same-url')
      revokeSpy.mockRestore()
    })

    it('does not revoke when no previous url', () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')

      media.setVideoSource(video, 'blob:first-url')

      expect(revokeSpy).not.toHaveBeenCalled()
      revokeSpy.mockRestore()
    })
  })

  describe('stopMediaProcessing', () => {
    it('does nothing when no animation frame active', () => {
      const media = useStaticMedia()
      media.stopMediaProcessing()
      expect(cancelRafSpy).not.toHaveBeenCalled()
    })

    it('cancels animation frame when previously set by processVideoStream', async () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')

      Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
      vi.spyOn(video, 'play').mockResolvedValue(undefined)

      media.processVideoStream(video, canvas)
      await Promise.resolve()

      media.stopMediaProcessing()

      expect(cancelRafSpy).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('revokes URL and resets status', () => {
      const media = useStaticMedia()
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
      media.status.value = 'done'
      media.cleanup()
      expect(media.status.value).toBe('idle')
      revokeSpy.mockRestore()
    })

    it('resets status to idle on cleanup', () => {
      const media = useStaticMedia()
      media.status.value = 'processing'
      media.cleanup()
      expect(media.status.value).toBe('idle')
    })

    it('revokes the stored videoUrl on cleanup', () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')

      media.setVideoSource(video, 'blob:cleanup-test')
      media.cleanup()

      expect(revokeSpy).toHaveBeenCalledWith('blob:cleanup-test')
      revokeSpy.mockRestore()
    })

    it('does not revoke when videoUrl is null', () => {
      const media = useStaticMedia()
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')

      media.cleanup()

      expect(revokeSpy).not.toHaveBeenCalled()
      revokeSpy.mockRestore()
    })

    it('cancels animation frame on cleanup', async () => {
      const media = useStaticMedia()
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
      vi.spyOn(video, 'play').mockResolvedValue(undefined)

      media.processVideoStream(video, canvas)
      await Promise.resolve()
      media.cleanup()

      expect(cancelRafSpy).toHaveBeenCalled()
    })
  })
})
