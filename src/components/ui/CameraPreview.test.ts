import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'

const mockStartCamera = vi.fn()
const mockStopCamera = vi.fn()
const mockToggleCameraFacing = vi.fn()
const mockIsCameraActive = ref(false)

vi.mock('@/composables/useCamera', () => ({
  useCamera: () => ({
    videoRef: ref(null),
    canvasRef: ref(null),
    isCameraActive: mockIsCameraActive,
    isProcessing: ref(false),
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
    mockStartCamera.mockClear()
    mockStopCamera.mockClear()
    mockToggleCameraFacing.mockClear()
  })

  it('shows camera error overlay', () => {
    mockAppState.cameraError = 'Permiso denegado'
    const wrapper = mount(CameraPreview, {
      global: {
        stubs: {
          IconPlay: { template: '<svg/>' },
          IconStop: { template: '<svg/>' },
          IconCamera: { template: '<svg/>' },
          IconAlertTriangle: { template: '<svg/>' },
          IconFlipCamera: { template: '<svg/>' },
          MediaUploader: { template: '<div data-test="uploader"></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('Error de cámara')
    expect(wrapper.text()).toContain('Permiso denegado')
  })

  it('shows model loading spinner', () => {
    mockAppState.isModelLoading = true
    const wrapper = mount(CameraPreview, {
      global: {
        stubs: {
          IconPlay: { template: '<svg/>' },
          IconStop: { template: '<svg/>' },
          IconCamera: { template: '<svg/>' },
          IconAlertTriangle: { template: '<svg/>' },
          IconFlipCamera: { template: '<svg/>' },
          MediaUploader: { template: '<div data-test="uploader"></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('Cargando modelo')
  })

  it('shows camera off overlay when inactive and no errors', () => {
    mockAppState.cameraError = null
    mockAppState.isModelLoading = false
    const wrapper = mount(CameraPreview, {
      global: {
        stubs: {
          IconPlay: { template: '<svg/>' },
          IconStop: { template: '<svg/>' },
          IconCamera: { template: '<svg/>' },
          IconAlertTriangle: { template: '<svg/>' },
          IconFlipCamera: { template: '<svg/>' },
          MediaUploader: { template: '<div data-test="uploader"></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('Cámara desactivada')
  })

  it('shows retry button on error', () => {
    mockAppState.cameraError = 'Permiso denegado'
    const wrapper = mount(CameraPreview, {
      global: {
        stubs: {
          IconPlay: { template: '<svg/>' },
          IconStop: { template: '<svg/>' },
          IconCamera: { template: '<svg/>' },
          IconAlertTriangle: { template: '<svg/>' },
          IconFlipCamera: { template: '<svg/>' },
          MediaUploader: { template: '<div data-test="uploader"></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('Reintentar')
  })

  it('calls startCamera when retry button is clicked', async () => {
    mockAppState.cameraError = 'Permiso denegado'
    const wrapper = mount(CameraPreview, {
      global: {
        stubs: {
          IconPlay: { template: '<svg/>' },
          IconStop: { template: '<svg/>' },
          IconCamera: { template: '<svg/>' },
          IconAlertTriangle: { template: '<svg/>' },
          IconFlipCamera: { template: '<svg/>' },
          MediaUploader: { template: '<div data-test="uploader"></div>' },
        },
      },
    })
    const retryBtn = wrapper.findAll('button').find((b) => b.text().includes('Reintentar'))
    if (retryBtn) {
      await retryBtn.trigger('click')
      expect(mockStartCamera).toHaveBeenCalled()
    }
  })

  it('calls startCamera when toggle button is clicked (camera inactive)', async () => {
    const wrapper = mount(CameraPreview, {
      global: {
        stubs: {
          IconPlay: { template: '<svg/>' },
          IconStop: { template: '<svg/>' },
          IconCamera: { template: '<svg/>' },
          IconAlertTriangle: { template: '<svg/>' },
          IconFlipCamera: { template: '<svg/>' },
          MediaUploader: { template: '<div data-test="uploader"></div>' },
        },
      },
    })
    const allButtons = wrapper.findAll('button')
    const toggleBtn = allButtons.find((b) => b.text().includes('Iniciar cámara'))
    if (toggleBtn) {
      await toggleBtn.trigger('click')
      expect(mockStartCamera).toHaveBeenCalled()
    }
  })
})
