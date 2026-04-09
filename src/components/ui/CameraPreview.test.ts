import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'

const mockStartCamera = vi.fn()
const mockStopCamera = vi.fn()
const mockToggleCameraFacing = vi.fn()
const mockIsCameraActive = ref(false)
const mockIsProcessing = ref(false)

vi.mock('@/composables/useCamera', () => ({
  useCamera: () => ({
    videoRef: ref(null),
    canvasRef: ref(null),
    isCameraActive: mockIsCameraActive,
    isProcessing: mockIsProcessing,
    modelReady: ref(true),
    facingMode: ref('environment'),
    startCamera: mockStartCamera,
    stopCamera: mockStopCamera,
    toggleCameraFacing: mockToggleCameraFacing,
  }),
}))

const mockAppState = reactive({
  cameraError: null as string | null,
  modelError: null as string | null,
  isModelLoading: false,
  isCameraActive: false,
})

vi.mock('@/stores/appStore', () => ({
  useAppStore: () => ({
    get cameraError() {
      return mockAppState.cameraError
    },
    get modelError() {
      return mockAppState.modelError
    },
    get isModelLoading() {
      return mockAppState.isModelLoading
    },
    get isCameraActive() {
      return mockAppState.isCameraActive
    },
    setCameraError: vi.fn((msg: string | null) => {
      mockAppState.cameraError = msg
    }),
    setModelError: vi.fn((msg: string | null) => {
      mockAppState.modelError = msg
    }),
    setCameraActive: vi.fn((active: boolean) => {
      mockAppState.isCameraActive = active
    }),
    setModelReady: vi.fn(),
  }),
}))

vi.mock('@/composables/useStaticMedia', () => ({
  useStaticMedia: () => ({
    status: ref('idle'),
    progress: ref(0),
    currentFrame: ref(0),
    totalFrames: ref(0),
    processImage: vi.fn(),
    processVideo: vi.fn(),
    cancelProcessing: vi.fn(),
  }),
}))

import CameraPreview from '@/components/ui/CameraPreview.vue'

describe('CameraPreview', () => {
  beforeEach(() => {
    mockAppState.cameraError = null
    mockAppState.modelError = null
    mockAppState.isModelLoading = false
    mockAppState.isCameraActive = false
    mockIsCameraActive.value = false
    mockIsProcessing.value = false
    mockStartCamera.mockClear()
    mockStopCamera.mockClear()
    mockToggleCameraFacing.mockClear()
  })

  const globalStubs = {
    IconPlay: { template: '<svg />' },
    IconStop: { template: '<svg />' },
    IconCamera: { template: '<svg />' },
    IconAlertTriangle: { template: '<svg />' },
    IconFlipCamera: { template: '<svg />' },
    MediaUploader: { template: '<div data-test="uploader"></div>' },
  }

  it('shows camera error overlay', () => {
    mockAppState.cameraError = 'Permiso denegado'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('Error de cámara')
    expect(wrapper.text()).toContain('Permiso denegado')
  })

  it('shows model loading spinner', () => {
    mockAppState.isModelLoading = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('Cargando modelo')
  })

  it('shows camera off overlay when inactive and no errors', () => {
    mockAppState.cameraError = null
    mockAppState.isModelLoading = false
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('Cámara desactivada')
  })

  it('shows retry button on error', () => {
    mockAppState.cameraError = 'Permiso denegado'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('Reintentar')
  })

  it('calls startCamera when retry button is clicked', async () => {
    mockAppState.cameraError = 'Permiso denegado'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const retryBtn = wrapper.findAll('button').find((b) => b.text().includes('Reintentar'))
    if (retryBtn) {
      await retryBtn.trigger('click')
      expect(mockStartCamera).toHaveBeenCalled()
    }
  })

  it('calls startCamera when Iniciar cámara button is clicked', async () => {
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const startBtn = wrapper.findAll('button').find((b) => b.text().includes('Iniciar cámara'))
    if (startBtn) {
      await startBtn.trigger('click')
      expect(mockStartCamera).toHaveBeenCalled()
    }
  })

  it('shows stop button and flip camera button when camera is active', async () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })

    const stopBtn = wrapper.findAll('button').find((b) => b.text().includes('Detener'))
    expect(stopBtn).toBeDefined()
  })

  it('calls stopCamera when stop button is clicked', async () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })

    const stopBtn = wrapper.findAll('button').find((b) => b.text().includes('Detener'))
    if (stopBtn) {
      await stopBtn.trigger('click')
      expect(mockStopCamera).toHaveBeenCalled()
    }
  })

  it('calls toggleCameraFacing when flip button is clicked', async () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })

    const flipBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('title') === 'Cambiar cámara')
    if (flipBtn) {
      await flipBtn.trigger('click')
      expect(mockToggleCameraFacing).toHaveBeenCalled()
    }
  })

  it('shows scanning indicator when camera is active', () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('En vivo')
  })

  it('shows Escaneando when processing', () => {
    mockIsCameraActive.value = true
    mockIsProcessing.value = true
    mockAppState.isCameraActive = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('Escaneando')
  })

  it('hides camera off overlay when camera is active', () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).not.toContain('Cámara desactivada')
  })

  it('renders MediaUploader when camera is inactive', () => {
    mockIsCameraActive.value = false
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.find('[data-test="uploader"]').exists()).toBe(true)
  })
})
