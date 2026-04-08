import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockDrawBoxesAndUpdate = vi.fn()
const mockProcessFrame = vi.fn()
const mockOnBoxes = vi.fn(() => vi.fn())

vi.mock('@/composables/useDetection', () => ({
  useDetection: () => ({
    modelReady: { value: true },
    isProcessing: { value: false },
    processFrame: mockProcessFrame,
    onBoxes: mockOnBoxes,
    drawBoxesAndUpdate: mockDrawBoxesAndUpdate,
  }),
}))

const mockSetMode = vi.fn()

vi.mock('@/stores/plateStore', () => ({
  usePlateStore: () => ({
    setMode: mockSetMode,
    plates: [],
    addPlate: vi.fn(),
    removePlate: vi.fn(),
    clearPlates: vi.fn(),
    currentMode: null,
    bestDetections: [],
    plateGroups: {},
    consecutiveDetections: {},
  }),
}))

import { useCamera } from '@/composables/useCamera'
import { useAppStore } from '@/stores/appStore'

describe('useCamera', () => {
  let appStore: ReturnType<typeof useAppStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
    mockSetMode.mockClear()
    mockDrawBoxesAndUpdate.mockClear()
    mockProcessFrame.mockClear()
    mockOnBoxes.mockClear()

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(),
      },
    })

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 100,
      height: 100,
      close: vi.fn(),
    }))
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

    expect(appStore.cameraError).toBe('Permiso de cámara denegado')
  })

  it('sets cameraError on NotFoundError', async () => {
    const err = new DOMException('Not found', 'NotFoundError')
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(err)

    const camera = useCamera()
    await camera.startCamera()

    expect(appStore.cameraError).toBe('No se encontró cámara disponible')
  })

  it('sets cameraError on generic DOMException', async () => {
    const err = new DOMException('Some error', 'AbortError')
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(err)

    const camera = useCamera()
    await camera.startCamera()

    expect(appStore.cameraError).toBe('Some error')
  })

  it('sets cameraError on non-DOMException error', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new Error('unknown'))

    const camera = useCamera()
    await camera.startCamera()

    expect(appStore.cameraError).toBe('Error inesperado al acceder a la cámara')
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
    expect(appStore.cameraError).toBeNull()
  })

  it('does not start interval if videoRef is null', async () => {
    const mockStream = { getTracks: () => [] }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

    const camera = useCamera()
    await camera.startCamera()

    expect(camera.isCameraActive.value).toBe(false)
  })

  it('stopCamera stops tracks and sets inactive', async () => {
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
})