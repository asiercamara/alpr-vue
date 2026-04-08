import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useDetection', () => ({
  useDetection: () => ({
    modelReady: { value: true },
    isProcessing: { value: false },
    processFrame: vi.fn(),
    onBoxes: vi.fn(() => vi.fn()),
    drawBoxesAndUpdate: vi.fn(),
  }),
}))

vi.mock('@/stores/plateStore', () => ({
  usePlateStore: () => ({
    setMode: vi.fn(),
  }),
}))

import { useCamera } from '@/composables/useCamera'
import { useAppStore } from '@/stores/appStore'

describe('useCamera', () => {
  let appStore: ReturnType<typeof useAppStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()

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

  it('starts camera successfully', async () => {
    const mockTrack = { stop: vi.fn() }
    const mockStream = {
      getTracks: () => [mockTrack],
    }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

    const camera = useCamera()

    const mockVideo = document.createElement('video')
    mockVideo.play = vi.fn().mockResolvedValue(undefined)
    mockVideo.srcObject = null
    Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

    await camera.startCamera()

    expect(camera.isCameraActive.value).toBe(true)
    expect(appStore.cameraError).toBeNull()
  })

  it('stopCamera sets isCameraActive to false', async () => {
    const mockTrack = { stop: vi.fn() }
    const mockStream = {
      getTracks: () => [mockTrack],
    }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)

    const camera = useCamera()

    const mockVideo = document.createElement('video')
    mockVideo.play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(camera.videoRef, 'value', { value: mockVideo, writable: true })

    await camera.startCamera()
    expect(camera.isCameraActive.value).toBe(true)

    camera.stopCamera()
    expect(camera.isCameraActive.value).toBe(false)
  })
})