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
