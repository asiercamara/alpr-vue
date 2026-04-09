import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import { useCamera } from '@/composables/useCamera'

describe('useCamera', () => {
  beforeEach(() => {
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

    expect(appStoreMock.setCameraError).toHaveBeenCalledWith(
      'Error inesperado al acceder a la cámara',
    )
  })

  it('starts camera successfully and calls plateStore.setMode', async () => {
    const mockTrack = { stop: vi.fn() }
    const mockStream = { getTracks: () => [mockTrack] }
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
    const mockStream = { getTracks: () => [] }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

    const camera = useCamera()
    await camera.startCamera()

    expect(camera.isCameraActive.value).toBe(false)
  })

  it('stopCamera stops tracks, resets processing and clears consecutive detections', async () => {
    const mockTrack = { stop: vi.fn() }
    const mockStream = { getTracks: () => [mockTrack] }
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
    const mockStream = { getTracks: () => [] }
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
    const mockStream = { getTracks: () => [mockTrack] }
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
      const mockStream = { getTracks: () => [mockTrack] }
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
})
