import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockDrawBoxesAndUpdate = vi.fn()
const mockProcessFrame = vi.fn()
const mockOnBoxes = vi.fn(() => vi.fn())
const mockResetProcessing = vi.fn()
const mockSetCameraActive = vi.fn()

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

const mockSetMode = vi.fn()
const mockClearConsecutiveDetections = vi.fn()

vi.mock('@/stores/plateStore', () => ({
  usePlateStore: () => ({
    setMode: mockSetMode,
    plates: [],
    addPlate: vi.fn(),
    removePlate: vi.fn(),
    clearPlates: vi.fn(),
    clearConsecutiveDetections: mockClearConsecutiveDetections,
    currentMode: null,
    bestDetections: [],
    plateGroups: {},
    consecutiveDetections: {},
  }),
}))

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    continuousMode: true,
  })),
  DEFAULTS: {
    feedbackEnabled: true,
    confidenceThreshold: 0.7,
    confirmationTime: 3,
    fastConfirmationTime: 1,
    continuousMode: true,
    skipDuplicates: true,
    theme: 'system',
    language: 'auto',
  },
}))

const createAppStoreMock = () => {
  const state: { cameraError: string | null; cameraActive: boolean } = {
    cameraError: null,
    cameraActive: false,
  }
  return {
    cameraError: null as string | null,
    modelError: null as string | null,
    isModelLoading: false,
    isCameraActive: false,
    setCameraError: vi.fn((msg: string | null) => {
      state.cameraError = msg
    }),
    setModelError: vi.fn(),
    setModelReady: vi.fn(),
    setCameraActive: mockSetCameraActive,
    get cameraErrorState() {
      return state.cameraError
    },
  }
}

let appStoreMock: ReturnType<typeof createAppStoreMock>

vi.mock('@/stores/appStore', () => ({
  useAppStore: () => appStoreMock,
}))

import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useCamera } from '@/composables/useCamera'

describe('useCamera', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    appStoreMock = createAppStoreMock()
    mockSetMode.mockClear()
    mockDrawBoxesAndUpdate.mockClear()
    mockProcessFrame.mockClear()
    mockOnBoxes.mockClear()
    mockResetProcessing.mockClear()
    mockClearConsecutiveDetections.mockClear()
    mockSetCameraActive.mockClear()

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(),
      },
      vibrate: vi.fn(),
    })

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({
        width: 100,
        height: 100,
        close: vi.fn(),
      }),
    )
  })

  it('starts as inactive', () => {
    const camera = useCamera()
    expect(camera.isCameraActive.value).toBe(false)
  })

  it('calls onBoxes and captures unsubscribe', () => {
    useCamera()
    expect(mockOnBoxes).toHaveBeenCalled()
  })

  it('sets cameraError on NotAllowedError', async () => {
    const err = new DOMException('Permission denied', 'NotAllowedError')
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(err)

    const camera = useCamera()
    await camera.startCamera()

    expect(appStoreMock.setCameraError).toHaveBeenCalledWith('Permiso de cámara denegado')
  })

  it('sets cameraError on NotFoundError', async () => {
    const err = new DOMException('Not found', 'NotFoundError')
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(err)

    const camera = useCamera()
    await camera.startCamera()

    expect(appStoreMock.setCameraError).toHaveBeenCalledWith('No se encontró cámara disponible')
  })

  it('sets cameraError on generic DOMException', async () => {
    const err = new DOMException('Some error', 'AbortError')
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(err)

    const camera = useCamera()
    await camera.startCamera()

    expect(appStoreMock.setCameraError).toHaveBeenCalledWith('Some error')
  })

  it('sets cameraError on non-DOMException error', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new Error('unknown'))

    const camera = useCamera()
    await camera.startCamera()

    expect(appStoreMock.setCameraError).toHaveBeenCalledWith('unknown')
  })

  it('starts camera successfully and calls plateStore.setMode', async () => {
    const mockTrack = { stop: vi.fn() }
    const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

    const camera = useCamera()
    const mockVideo = document.createElement('video')
    mockVideo.play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

    await camera.startCamera()

    expect(camera.isCameraActive.value).toBe(true)
    expect(mockSetMode).toHaveBeenCalledWith('camera')
    expect(appStoreMock.setCameraError).not.toHaveBeenCalled()
    expect(mockSetCameraActive).toHaveBeenCalledWith(true)
  })

  it('does not start interval if videoRef is null', async () => {
    const mockStream = { getTracks: () => [], getVideoTracks: () => [] }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

    const camera = useCamera()
    await camera.startCamera()

    expect(camera.isCameraActive.value).toBe(false)
  })

  it('stopCamera stops tracks, resets processing and clears consecutive detections', async () => {
    const mockTrack = { stop: vi.fn() }
    const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

    const camera = useCamera()
    const mockVideo = document.createElement('video')
    mockVideo.play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

    await camera.startCamera()
    expect(camera.isCameraActive.value).toBe(true)

    camera.stopCamera()
    expect(camera.isCameraActive.value).toBe(false)
    expect(mockTrack.stop).toHaveBeenCalled()
    expect(mockResetProcessing).toHaveBeenCalled()
    expect(mockClearConsecutiveDetections).toHaveBeenCalled()
    expect(mockSetCameraActive).toHaveBeenCalledWith(false)
  })

  it('stopCamera clears canvas', async () => {
    const mockStream = { getTracks: () => [], getVideoTracks: () => [] }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

    const camera = useCamera()
    const mockCtx = { clearRect: vi.fn() }
    const mockCanvas = document.createElement('canvas')
    mockCanvas.width = 300
    mockCanvas.height = 150
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any
    Object.defineProperty(camera.canvasRef, 'value', { value: mockCanvas, writable: true })

    camera.stopCamera()

    expect(mockCtx.clearRect).toHaveBeenCalled()
  })

  it('startCamera calls clearConsecutiveDetections and resetProcessing', async () => {
    const mockTrack = { stop: vi.fn() }
    const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

    const camera = useCamera()
    const mockVideo = document.createElement('video')
    mockVideo.play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

    mockClearConsecutiveDetections.mockClear()
    mockResetProcessing.mockClear()

    await camera.startCamera()

    expect(mockClearConsecutiveDetections).toHaveBeenCalled()
    expect(mockResetProcessing).toHaveBeenCalled()
  })

  describe('toggleCameraFacing', () => {
    it('starts with environment facing mode by default', () => {
      const camera = useCamera()
      expect(camera.facingMode.value).toBe('environment')
    })

    it('toggles facing mode from environment to user', () => {
      const camera = useCamera()
      expect(camera.facingMode.value).toBe('environment')
      camera.toggleCameraFacing()
      expect(camera.facingMode.value).toBe('user')
    })

    it('toggles facing mode back from user to environment', () => {
      const camera = useCamera()
      camera.toggleCameraFacing()
      expect(camera.facingMode.value).toBe('user')
      camera.toggleCameraFacing()
      expect(camera.facingMode.value).toBe('environment')
    })

    it('does not restart camera when camera is inactive', async () => {
      const camera = useCamera()
      const getUserMediaCalls = vi.mocked(navigator.mediaDevices.getUserMedia)

      camera.toggleCameraFacing()

      expect(getUserMediaCalls).not.toHaveBeenCalled()
    })

    it('restarts camera with new facing mode when camera is active', async () => {
      const mockTrack = { stop: vi.fn() }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const camera = useCamera()
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()
      vi.mocked(navigator.mediaDevices.getUserMedia).mockClear()

      await camera.toggleCameraFacing()

      expect(camera.facingMode.value).toBe('user')
      expect(vi.mocked(navigator.mediaDevices.getUserMedia)).toHaveBeenCalled()
    })
  })

  describe('zoom', () => {
    it('starts with zoom level 1', () => {
      const camera = useCamera()
      expect(camera.zoomLevel.value).toBe(1)
      expect(camera.maxZoom.value).toBe(5)
      expect(camera.isZoomSupported.value).toBe(false)
      expect(camera.isDigitalZoom.value).toBe(false)
    })

    it('zoomIn increases zoom level in digital mode when native zoom not supported', async () => {
      const camera = useCamera()
      const mockTrack = { stop: vi.fn() }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()

      expect(camera.isZoomSupported.value).toBe(false)
      expect(camera.isDigitalZoom.value).toBe(true)

      await camera.zoomIn()
      expect(camera.zoomLevel.value).toBe(1.5)

      await camera.zoomIn()
      expect(camera.zoomLevel.value).toBe(2.0)
    })

    it('zoomOut decreases zoom level down to 1', async () => {
      const camera = useCamera()
      const mockTrack = { stop: vi.fn() }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()

      await camera.zoomIn()
      await camera.zoomIn()
      expect(camera.zoomLevel.value).toBe(2.0)

      await camera.zoomOut()
      expect(camera.zoomLevel.value).toBe(1.5)

      await camera.zoomOut()
      expect(camera.zoomLevel.value).toBe(1)
    })

    it('zoomOut does not go below 1', async () => {
      const camera = useCamera()
      await camera.zoomOut()
      expect(camera.zoomLevel.value).toBe(1)
    })

    it('zoomIn does not exceed maxZoom', async () => {
      const camera = useCamera()
      const mockTrack = { stop: vi.fn() }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()

      for (let i = 0; i < 20; i++) {
        await camera.zoomIn()
      }
      expect(camera.zoomLevel.value).toBe(camera.maxZoom.value)
    })

    it('resetZoom sets zoom level back to 1', async () => {
      const camera = useCamera()

      const mockTrack = { stop: vi.fn() }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()
      await camera.zoomIn()
      await camera.zoomIn()
      expect(camera.zoomLevel.value).toBe(2.0)

      camera.resetZoom()
      expect(camera.zoomLevel.value).toBe(1)
    })

    it('stopCamera resets zoom state', async () => {
      const camera = useCamera()
      const mockTrack = { stop: vi.fn() }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()
      await camera.zoomIn()
      expect(camera.zoomLevel.value).toBe(1.5)

      camera.stopCamera()
      expect(camera.zoomLevel.value).toBe(1)
      expect(camera.isZoomSupported.value).toBe(false)
      expect(camera.isDigitalZoom.value).toBe(false)
    })

    it('detects native zoom support from track capabilities', async () => {
      const mockTrack = {
        stop: vi.fn(),
        getCapabilities: vi.fn().mockReturnValue({ zoom: { min: 1, max: 10 } }),
        applyConstraints: vi.fn().mockResolvedValue(undefined),
      }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const camera = useCamera()
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()

      expect(camera.isZoomSupported.value).toBe(true)
      expect(camera.isDigitalZoom.value).toBe(false)
      expect(camera.maxZoom.value).toBe(10)
    })

    it('uses digital zoom when track has no zoom capability', async () => {
      const mockTrack = {
        stop: vi.fn(),
        getCapabilities: vi.fn().mockReturnValue({}),
      }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const camera = useCamera()
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()

      expect(camera.isZoomSupported.value).toBe(false)
      expect(camera.isDigitalZoom.value).toBe(true)
      expect(camera.maxZoom.value).toBe(5)
    })

    it('falls back to digital zoom when track has no getCapabilities', async () => {
      const mockTrack = { stop: vi.fn() }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const camera = useCamera()
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()

      expect(camera.isZoomSupported.value).toBe(false)
      expect(camera.isDigitalZoom.value).toBe(true)
    })

    it('applies native zoom via track.applyConstraints on zoomIn', async () => {
      const mockTrack = {
        stop: vi.fn(),
        getCapabilities: vi.fn().mockReturnValue({ zoom: { min: 1, max: 10 } }),
        applyConstraints: vi.fn().mockResolvedValue(undefined),
      }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const camera = useCamera()
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()
      await camera.zoomIn()

      expect(mockTrack.applyConstraints).toHaveBeenCalledWith({
        advanced: [{ zoom: 1.5 }],
      })
      expect(camera.zoomLevel.value).toBe(1.5)
    })

    it('applies native zoom on zoomOut', async () => {
      const mockTrack = {
        stop: vi.fn(),
        getCapabilities: vi.fn().mockReturnValue({ zoom: { min: 1, max: 10 } }),
        applyConstraints: vi.fn().mockResolvedValue(undefined),
      }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const camera = useCamera()
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()
      await camera.zoomIn()
      await camera.zoomIn()
      await camera.zoomOut()

      expect(mockTrack.applyConstraints).toHaveBeenCalledWith({
        advanced: [{ zoom: 1.5 }],
      })
      expect(camera.zoomLevel.value).toBe(1.5)
    })

    it('falls back to digital zoom when native applyConstraints fails', async () => {
      const mockTrack = {
        stop: vi.fn(),
        getCapabilities: vi.fn().mockReturnValue({ zoom: { min: 1, max: 10 } }),
        applyConstraints: vi.fn().mockRejectedValue(new Error('Not supported')),
      }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const camera = useCamera()
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()
      expect(camera.isZoomSupported.value).toBe(true)

      await camera.zoomIn()

      expect(camera.isZoomSupported.value).toBe(false)
      expect(camera.isDigitalZoom.value).toBe(true)
      expect(camera.zoomLevel.value).toBe(1.5)
    })

    it('resetZoom applies native constraints when zoom is supported', async () => {
      const mockTrack = {
        stop: vi.fn(),
        getCapabilities: vi.fn().mockReturnValue({ zoom: { min: 1, max: 10 } }),
        applyConstraints: vi.fn().mockResolvedValue(undefined),
      }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const camera = useCamera()
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()
      await camera.zoomIn()
      await camera.zoomIn()
      camera.resetZoom()

      expect(mockTrack.applyConstraints).toHaveBeenCalledWith({
        advanced: [{ zoom: 1 }],
      })
      expect(camera.zoomLevel.value).toBe(1)
      expect(camera.isDigitalZoom.value).toBe(false)
    })

    it('handles no video track in detectZoomCapabilities gracefully', async () => {
      const mockStream = { getTracks: () => [], getVideoTracks: () => [] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const camera = useCamera()
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()

      expect(camera.isZoomSupported.value).toBe(false)
      expect(camera.zoomLevel.value).toBe(1)
    })

    it('handles exception in detectZoomCapabilities', async () => {
      const mockTrack = {
        stop: vi.fn(),
        get getCapabilities() {
          throw new Error('Access denied')
        },
      }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const camera = useCamera()
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()

      expect(camera.isZoomSupported.value).toBe(false)
      expect(camera.isDigitalZoom.value).toBe(false)
      expect(camera.zoomLevel.value).toBe(1)
    })

    it('resetZoom does not call applyConstraints when zoom not supported', () => {
      const camera = useCamera()
      camera.resetZoom()
      expect(camera.zoomLevel.value).toBe(1)
    })

    it('zoomIn does nothing when already at maxZoom', async () => {
      const camera = useCamera()
      const mockTrack = { stop: vi.fn() }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

      await camera.startCamera()

      for (let i = 0; i < 20; i++) {
        await camera.zoomIn()
      }
      const levelAtMax = camera.zoomLevel.value
      await camera.zoomIn()
      expect(camera.zoomLevel.value).toBe(levelAtMax)
    })

    it('zoomOut does nothing when already at 1', async () => {
      const camera = useCamera()
      await camera.zoomOut()
      expect(camera.zoomLevel.value).toBe(1)
    })
  })

  describe('auto-stop behavior', () => {
    function startCameraWithCanvas(camera: ReturnType<typeof useCamera>) {
      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(mockVideo, 'readyState', { value: 2, configurable: true })
      Object.defineProperty(mockVideo, 'videoWidth', { value: 300, configurable: true })
      Object.defineProperty(mockVideo, 'videoHeight', { value: 150, configurable: true })
      Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })
      Object.defineProperty(camera.canvasRef, 'value', {
        value: document.createElement('canvas'),
        writable: true,
      })
      return mockVideo
    }

    beforeEach(() => {
      vi.useFakeTimers()
      const mockTrack = { stop: vi.fn() }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)
    })

    afterEach(() => {
      vi.useRealTimers()
      mockDrawBoxesAndUpdate.mockReset()
    })

    it('stops camera when continuousMode is false and a new plate is confirmed', async () => {
      mockDrawBoxesAndUpdate.mockReturnValue(true)

      const camera = useCamera({ settingsStore: { continuousMode: false } as any })
      startCameraWithCanvas(camera)
      await camera.startCamera()
      expect(camera.isCameraActive.value).toBe(true)

      // Trigger lastBoxes so the interval actually calls drawBoxesAndUpdate
      const lastBoxesCallback = mockOnBoxes.mock.calls[0][0] as (boxes: unknown[]) => void
      lastBoxesCallback([{ x1: 0, y1: 0, x2: 100, y2: 50 }])

      await vi.advanceTimersByTimeAsync(20)

      expect(camera.isCameraActive.value).toBe(false)
    })

    it('keeps camera running when continuousMode is false but drawBoxesAndUpdate returns false', async () => {
      mockDrawBoxesAndUpdate.mockReturnValue(false)

      const camera = useCamera({ settingsStore: { continuousMode: false } as any })
      startCameraWithCanvas(camera)
      await camera.startCamera()
      expect(camera.isCameraActive.value).toBe(true)

      const lastBoxesCallback = mockOnBoxes.mock.calls[0][0] as (boxes: unknown[]) => void
      lastBoxesCallback([{ x1: 0, y1: 0, x2: 100, y2: 50 }])

      await vi.advanceTimersByTimeAsync(20)

      expect(camera.isCameraActive.value).toBe(true)
      camera.stopCamera()
    })

    it('keeps camera running when continuousMode is true even when a plate is confirmed', async () => {
      mockDrawBoxesAndUpdate.mockReturnValue(true)

      const camera = useCamera({ settingsStore: { continuousMode: true } as any })
      startCameraWithCanvas(camera)
      await camera.startCamera()
      expect(camera.isCameraActive.value).toBe(true)

      const lastBoxesCallback = mockOnBoxes.mock.calls[0][0] as (boxes: unknown[]) => void
      lastBoxesCallback([{ x1: 0, y1: 0, x2: 100, y2: 50 }])

      await vi.advanceTimersByTimeAsync(20)

      expect(camera.isCameraActive.value).toBe(true)
      camera.stopCamera()
    })
  })

  describe('onUnmounted cleanup', () => {
    it('calls unsubscribe and stopCamera when component is unmounted', async () => {
      const unsubscribeSpy = vi.fn()
      mockOnBoxes.mockReturnValueOnce(unsubscribeSpy)

      const mockTrack = { stop: vi.fn() }
      const mockStream = { getTracks: () => [mockTrack], getVideoTracks: () => [mockTrack] }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

      const TestComponent = defineComponent({
        setup() {
          const cam = useCamera()
          // Expose videoRef so we can assign it before startCamera
          return { cam }
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const { cam } = wrapper.vm as { cam: ReturnType<typeof useCamera> }

      const mockVideo = document.createElement('video')
      mockVideo.play = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(cam.videoRef, 'value', { value: mockVideo, writable: true })

      await cam.startCamera()
      expect(cam.isCameraActive.value).toBe(true)

      wrapper.unmount()

      expect(unsubscribeSpy).toHaveBeenCalled()
      expect(cam.isCameraActive.value).toBe(false)
    })

    it('unsubscribes boxes subscription on unmount even without active camera', () => {
      const unsubscribeSpy = vi.fn()
      mockOnBoxes.mockReturnValueOnce(unsubscribeSpy)

      const TestComponent = defineComponent({
        setup() {
          useCamera()
          return {}
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      wrapper.unmount()

      expect(unsubscribeSpy).toHaveBeenCalled()
    })
  })
})
