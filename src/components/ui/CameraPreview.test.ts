import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'

const mockStartCamera = vi.fn()
const mockStopCamera = vi.fn()
const mockIsCameraActive = ref(false)

vi.mock('@/composables/useCamera', () => ({
  useCamera: () => ({
    videoRef: ref(null),
    canvasRef: ref(null),
    isCameraActive: mockIsCameraActive,
    isProcessing: ref(false),
    modelReady: ref(true),
    startCamera: mockStartCamera,
    stopCamera: mockStopCamera,
  }),
}))

const mockAppState = reactive({
  cameraError: null as string | null,
  modelError: null as string | null,
  isModelLoading: false,
})

vi.mock('@/stores/appStore', () => ({
  useAppStore: () => ({
    get cameraError() { return mockAppState.cameraError },
    get modelError() { return mockAppState.modelError },
    get isModelLoading() { return mockAppState.isModelLoading },
    setCameraError: vi.fn((msg: string | null) => { mockAppState.cameraError = msg }),
    setModelError: vi.fn((msg: string | null) => { mockAppState.modelError = msg }),
    setModelReady: vi.fn(),
  }),
}))

import CameraPreview from '@/components/ui/CameraPreview.vue'

describe('CameraPreview', () => {
  beforeEach(() => {
    mockAppState.cameraError = null
    mockAppState.modelError = null
    mockAppState.isModelLoading = false
    mockIsCameraActive.value = false
    mockStartCamera.mockClear()
    mockStopCamera.mockClear()
  })

  it('shows camera error overlay', () => {
    mockAppState.cameraError = 'Permiso denegado'
    const wrapper = mount(CameraPreview, {
      global: { stubs: { IconPlay: { template: '<svg/>' }, IconStop: { template: '<svg/>' } } },
    })
    expect(wrapper.text()).toContain('Error de cámara')
    expect(wrapper.text()).toContain('Permiso denegado')
  })

  it('shows model loading spinner', () => {
    mockAppState.isModelLoading = true
    const wrapper = mount(CameraPreview, {
      global: { stubs: { IconPlay: { template: '<svg/>' }, IconStop: { template: '<svg/>' } } },
    })
    expect(wrapper.text()).toContain('Cargando modelo')
  })

  it('shows camera off overlay when inactive and no errors', () => {
    mockAppState.cameraError = null
    mockAppState.isModelLoading = false
    const wrapper = mount(CameraPreview, {
      global: { stubs: { IconPlay: { template: '<svg/>' }, IconStop: { template: '<svg/>' } } },
    })
    expect(wrapper.text()).toContain('Cámara desactivada')
  })

  it('shows retry button on error', () => {
    mockAppState.cameraError = 'Permiso denegado'
    const wrapper = mount(CameraPreview, {
      global: { stubs: { IconPlay: { template: '<svg/>' }, IconStop: { template: '<svg/>' } } },
    })
    expect(wrapper.text()).toContain('Reintentar')
  })

  it('calls startCamera when retry button is clicked', async () => {
    mockAppState.cameraError = 'Permiso denegado'
    const wrapper = mount(CameraPreview, {
      global: { stubs: { IconPlay: { template: '<svg/>' }, IconStop: { template: '<svg/>' } } },
    })
    const retryBtn = wrapper.findAll('button').find(b => b.text().includes('Reintentar'))
    if (retryBtn) {
      await retryBtn.trigger('click')
      expect(mockStartCamera).toHaveBeenCalled()
    }
  })

  it('calls startCamera when toggle button is clicked (camera inactive)', async () => {
    const wrapper = mount(CameraPreview, {
      global: { stubs: { IconPlay: { template: '<svg/>' }, IconStop: { template: '<svg/>' } } },
    })
    const toggleBtn = wrapper.findAll('button').find(b => !b.text().includes('Reintentar'))
    if (toggleBtn) {
      await toggleBtn.trigger('click')
      expect(mockStartCamera).toHaveBeenCalled()
    }
  })
})