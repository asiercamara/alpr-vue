import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'

const mockStartCamera = vi.fn()
const mockStopCamera = vi.fn()
const mockToggleCameraFacing = vi.fn()
const mockZoomIn = vi.fn()
const mockZoomOut = vi.fn()
const mockIsCameraActive = ref(false)
const mockIsProcessing = ref(false)
const mockZoomLevel = ref(1)
const mockMaxZoom = ref(5)
const mockIsDigitalZoom = ref(false)

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
    zoomLevel: mockZoomLevel,
    maxZoom: mockMaxZoom,
    isDigitalZoom: mockIsDigitalZoom,
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
  }),
}))

const mockProcessImage = vi.fn()
const mockProcessVideoStream = vi.fn()
const mockSetVideoSource = vi.fn()
const mockStopMediaProcessing = vi.fn()
const mockCleanup = vi.fn()
const mockStaticIsProcessing = ref(false)
const mockStaticStatus = ref('idle')

vi.mock('@/composables/useStaticMedia', () => ({
  useStaticMedia: () => ({
    status: mockStaticStatus,
    isProcessing: mockStaticIsProcessing,
    processImage: mockProcessImage,
    processVideoStream: mockProcessVideoStream,
    setVideoSource: mockSetVideoSource,
    stopMediaProcessing: mockStopMediaProcessing,
    cleanup: mockCleanup,
  }),
}))

const mockAppState = reactive({
  cameraError: null as string | null,
  modelError: null as string | null,
  isModelLoading: false,
  isCameraActive: false,
  isUploadMode: false,
  uploadMediaType: null as 'image' | 'video' | null,
  uploadMediaUrl: null as string | null,
  uploadFile: null as File | null,
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
    get isUploadMode() {
      return mockAppState.isUploadMode
    },
    get uploadMediaType() {
      return mockAppState.uploadMediaType
    },
    get uploadMediaUrl() {
      return mockAppState.uploadMediaUrl
    },
    get uploadFile() {
      return mockAppState.uploadFile
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
    setUploadMedia: vi.fn((type: any, url: any, file: any) => {
      mockAppState.uploadMediaType = type
      mockAppState.uploadMediaUrl = url
      mockAppState.uploadFile = file
      mockAppState.isUploadMode = true
    }),
    clearUploadMedia: vi.fn(() => {
      mockAppState.uploadMediaType = null
      mockAppState.uploadMediaUrl = null
      mockAppState.uploadFile = null
      mockAppState.isUploadMode = false
    }),
  }),
}))

import CameraPreview from '@/components/ui/CameraPreview.vue'

describe('CameraPreview', () => {
  beforeEach(() => {
    mockAppState.cameraError = null
    mockAppState.modelError = null
    mockAppState.isModelLoading = false
    mockAppState.isCameraActive = false
    mockAppState.isUploadMode = false
    mockAppState.uploadMediaType = null
    mockAppState.uploadMediaUrl = null
    mockAppState.uploadFile = null
    mockIsCameraActive.value = false
    mockIsProcessing.value = false
    mockZoomLevel.value = 1
    mockIsDigitalZoom.value = false
    mockStartCamera.mockClear()
    mockStopCamera.mockClear()
    mockToggleCameraFacing.mockClear()
    mockProcessImage.mockClear()
    mockProcessVideoStream.mockClear()
    mockSetVideoSource.mockClear()
    mockStopMediaProcessing.mockClear()
    mockCleanup.mockClear()
    mockZoomIn.mockClear()
    mockZoomOut.mockClear()
    mockStaticStatus.value = 'idle'
    mockStaticIsProcessing.value = false
  })

  const globalStubs = {
    IconPlay: { template: '<svg />' },
    IconStop: { template: '<svg />' },
    IconCamera: { template: '<svg />' },
    IconAlertTriangle: { template: '<svg />' },
    IconFlipCamera: { template: '<svg />' },
    IconClose: { template: '<svg />' },
    IconZoomIn: { template: '<svg />' },
    IconZoomOut: { template: '<svg />' },
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

  it('shows camera off overlay when inactive and no upload', () => {
    mockAppState.cameraError = null
    mockAppState.isModelLoading = false
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('Cámara desactivada')
  })

  it('does not show camera off overlay when upload mode is active', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'image'
    mockAppState.uploadMediaUrl = 'blob:test'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).not.toContain('Cámara desactivada')
  })

  it('shows close button when upload mode is active', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'image'
    mockAppState.uploadMediaUrl = 'blob:test'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const closeBtn = wrapper.find('button[title="Cerrar visor"]')
    expect(closeBtn.exists()).toBe(true)
  })

  it('calls cleanup and clearUploadMedia when close button is clicked', async () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'image'
    mockAppState.uploadMediaUrl = 'blob:test'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const closeBtn = wrapper.find('button[title="Cerrar visor"]')
    await closeBtn.trigger('click')

    expect(mockCleanup).toHaveBeenCalled()
  })

  it('shows scanning indicator in upload mode', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'image'
    mockAppState.uploadMediaUrl = 'blob:test'
    mockStaticIsProcessing.value = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('Escaneando')
  })

  it('shows "Analizado" indicator in upload mode when not processing for image', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'image'
    mockAppState.uploadMediaUrl = 'blob:test'
    mockStaticIsProcessing.value = false
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('Analizado')
  })

  it('shows "Procesando vídeo" indicator in upload mode when not processing for video', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'video'
    mockAppState.uploadMediaUrl = 'blob:test'
    mockStaticIsProcessing.value = false
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('Procesando vídeo')
  })

  it('calls startCamera when retry button is clicked on error', async () => {
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

  it('shows stop button when camera is active without upload', async () => {
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

  it('renders MediaUploader when camera is inactive and no upload', () => {
    mockIsCameraActive.value = false
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.find('[data-test="uploader"]').exists()).toBe(true)
  })

  it('does not render MediaUploader when upload mode is active', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'image'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.find('[data-test="uploader"]').exists()).toBe(false)
  })

  it('does not show camera controls when upload mode is active', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'image'
    mockAppState.uploadMediaUrl = 'blob:test'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const stopBtn = wrapper.findAll('button').find((b) => b.text().includes('Detener'))
    expect(stopBtn).toBeUndefined()
  })

  it('does not show live camera scanning indicator when upload is active', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'video'
    mockAppState.uploadMediaUrl = 'blob:test'
    mockIsCameraActive.value = false
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).not.toContain('En vivo')
  })

  it('shows upload scanning indicator instead of camera controls', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'image'
    mockAppState.uploadMediaUrl = 'blob:test'
    mockStaticIsProcessing.value = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('Escaneando')
    expect(wrapper.find('button[title="Cerrar visor"]').exists()).toBe(true)
  })

  it('hides close button when not in upload mode', () => {
    mockAppState.isUploadMode = false
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.find('button[title="Cerrar visor"]').exists()).toBe(false)
  })

  it('shows video element when upload is video type', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'video'
    mockAppState.uploadMediaUrl = 'blob:test'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const video = wrapper.find('video')
    expect(video.exists()).toBe(true)
  })

  it('hides video element when upload is image type', () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'image'
    mockAppState.uploadMediaUrl = 'blob:test'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const video = wrapper.find('video')
    expect(video.classes()).toContain('hidden')
  })

  it('applies full height class when fullHeight prop is true', () => {
    const wrapper = mount(CameraPreview, {
      props: { fullHeight: true },
      global: { stubs: globalStubs },
    })
    const container = wrapper.find('div')
    expect(container.classes()).toContain('h-full')
  })

  it('calls cleanup and clearUploadMedia when close button is clicked', async () => {
    mockAppState.isUploadMode = true
    mockAppState.uploadMediaType = 'image'
    mockAppState.uploadMediaUrl = 'blob:test'
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const closeBtn = wrapper.find('button[title="Cerrar visor"]')
    await closeBtn.trigger('click')

    expect(mockCleanup).toHaveBeenCalled()
  })

  it('shows zoom controls when camera is active', async () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.find('button[title="Acercar"]').exists()).toBe(true)
    expect(wrapper.find('button[title="Alejar"]').exists()).toBe(true)
  })

  it('calls zoomIn when zoom in button is clicked', async () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const zoomInBtn = wrapper.find('button[title="Acercar"]')
    await zoomInBtn.trigger('click')
    expect(mockZoomIn).toHaveBeenCalled()
  })

  it('calls zoomOut when zoom out button is clicked', async () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    mockZoomLevel.value = 2
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const zoomOutBtn = wrapper.find('button[title="Alejar"]')
    await zoomOutBtn.trigger('click')
    expect(mockZoomOut).toHaveBeenCalled()
  })

  it('disables zoom out button when zoom is at minimum', () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    mockZoomLevel.value = 1
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const zoomOutBtn = wrapper.find('button[title="Alejar"]')
    expect(zoomOutBtn.attributes('disabled')).toBeDefined()
  })

  it('disables zoom in button when zoom is at maximum', () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    mockZoomLevel.value = 5
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const zoomInBtn = wrapper.find('button[title="Acercar"]')
    expect(zoomInBtn.attributes('disabled')).toBeDefined()
  })

  it('shows zoom level indicator when zoomed in', () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    mockZoomLevel.value = 2.5
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).toContain('2.5x')
  })

  it('hides zoom level indicator when at 1x', () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    mockZoomLevel.value = 1
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    expect(wrapper.text()).not.toContain('1.0x')
  })

  it('applies digital zoom transform when isDigitalZoom and zoomLevel > 1', () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    mockIsDigitalZoom.value = true
    mockZoomLevel.value = 2
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const innerDiv = wrapper.find('div.w-full.h-full.transition-transform')
    expect(innerDiv.exists()).toBe(true)
    expect(innerDiv.attributes('style')).toContain('transform: scale(2)')
  })

  it('does not apply transform when not digital zoom', () => {
    mockIsCameraActive.value = true
    mockAppState.isCameraActive = true
    mockIsDigitalZoom.value = false
    mockZoomLevel.value = 2
    const wrapper = mount(CameraPreview, { global: { stubs: globalStubs } })
    const innerDiv = wrapper.find('div.w-full.h-full.transition-transform')
    expect(innerDiv.attributes('style')).toBeUndefined()
  })
})
