import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockProcessImage = vi.fn()
const mockProcessVideo = vi.fn()
const mockCancelProcessing = vi.fn()
const mockStatus = ref<string>('idle')
const mockProgress = ref(0)

vi.mock('@/composables/useStaticMedia', () => ({
  useStaticMedia: () => ({
    status: mockStatus,
    progress: mockProgress,
    currentFrame: ref(0),
    totalFrames: ref(0),
    processImage: mockProcessImage,
    processVideo: mockProcessVideo,
    cancelProcessing: mockCancelProcessing,
  }),
}))

vi.mock('@/components/icons/IconUpload.vue', () => ({
  default: { template: '<svg data-test="icon-upload" />' },
}))

import MediaUploader from '@/components/ui/MediaUploader.vue'

describe('MediaUploader', () => {
  beforeEach(() => {
    mockStatus.value = 'idle'
    mockProgress.value = 0
    mockProcessImage.mockClear()
    mockProcessVideo.mockClear()
    mockCancelProcessing.mockClear()
  })

  const mountComponent = () =>
    mount(MediaUploader, {
      global: {
        stubs: { IconUpload: { template: '<svg />' } },
      },
    })

  it('renders the upload button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Subir archivo')
  })

  it('does not show overlay when idle', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('shows processing overlay when status is processing', () => {
    mockStatus.value = 'processing'
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Analizando')
  })

  it('shows loading overlay when status is loading', () => {
    mockStatus.value = 'loading'
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Cargando archivo')
  })

  it('shows cancel button in overlay during processing', () => {
    mockStatus.value = 'processing'
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Cancelar')
  })

  it('calls cancelProcessing when cancel button is clicked', async () => {
    mockStatus.value = 'processing'
    const wrapper = mountComponent()
    const cancelBtn = wrapper.findAll('button').find((b) => b.text().includes('Cancelar'))
    if (cancelBtn) {
      await cancelBtn.trigger('click')
      expect(mockCancelProcessing).toHaveBeenCalled()
    }
  })

  it('shows progress percentage in overlay', () => {
    mockStatus.value = 'processing'
    mockProgress.value = 65
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('65%')
  })

  it('renders hidden file input with accept attribute', () => {
    const wrapper = mountComponent()
    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('accept')).toBe('image/*,video/*')
  })

  it('calls triggerFileSelect when upload button is clicked', async () => {
    const wrapper = mountComponent()
    const input = wrapper.find('input[type="file"]')
    const clickSpy = vi.fn()
    input.element.click = clickSpy

    const uploadBtn = wrapper.findAll('button').find((b) => b.text().includes('Subir archivo'))
    if (uploadBtn) {
      await uploadBtn.trigger('click')
      expect(clickSpy).toHaveBeenCalled()
    }
  })

  it('does not show overlay when status is done', () => {
    mockStatus.value = 'done'
    const wrapper = mountComponent()
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('does not show overlay when status is error', () => {
    mockStatus.value = 'error'
    const wrapper = mountComponent()
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  describe('handleFileSelect', () => {
    it('calls processImage for image files', async () => {
      mockProcessImage.mockResolvedValue([])
      const wrapper = mountComponent()
      const input = wrapper.find('input[type="file"]')

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      const fileList = {
        length: 1,
        0: file,
        item: (i: number) => (i === 0 ? file : null),
      } as unknown as FileList
      Object.defineProperty(input.element, 'files', { value: fileList, configurable: true })

      await input.trigger('change')
      await wrapper.vm.$nextTick()

      expect(mockProcessImage).toHaveBeenCalledWith(file, expect.any(HTMLCanvasElement))
    })

    it('calls processVideo for video files', async () => {
      mockProcessVideo.mockResolvedValue([])
      const wrapper = mountComponent()
      const input = wrapper.find('input[type="file"]')

      const file = new File(['data'], 'test.mp4', { type: 'video/mp4' })
      const fileList = {
        length: 1,
        0: file,
        item: (i: number) => (i === 0 ? file : null),
      } as unknown as FileList
      Object.defineProperty(input.element, 'files', { value: fileList, configurable: true })

      await input.trigger('change')
      await wrapper.vm.$nextTick()

      expect(mockProcessVideo).toHaveBeenCalledWith(file, expect.any(HTMLCanvasElement))
    })

    it('emits detection when processing completes with done status', async () => {
      mockProcessImage.mockImplementation(async () => {
        mockStatus.value = 'done'
      })
      const wrapper = mountComponent()
      const input = wrapper.find('input[type="file"]')

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      const fileList = {
        length: 1,
        0: file,
        item: (i: number) => (i === 0 ? file : null),
      } as unknown as FileList
      Object.defineProperty(input.element, 'files', { value: fileList, configurable: true })

      await input.trigger('change')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('detection')).toBeTruthy()
    })

    it('does not emit detection when processing fails', async () => {
      mockProcessImage.mockImplementation(async () => {
        mockStatus.value = 'error'
      })
      const wrapper = mountComponent()
      const input = wrapper.find('input[type="file"]')

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      const fileList = {
        length: 1,
        0: file,
        item: (i: number) => (i === 0 ? file : null),
      } as unknown as FileList
      Object.defineProperty(input.element, 'files', { value: fileList, configurable: true })

      await input.trigger('change')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('detection')).toBeFalsy()
    })

    it('does nothing when no file is selected', async () => {
      const wrapper = mountComponent()
      const input = wrapper.find('input[type="file"]')

      Object.defineProperty(input.element, 'files', { value: { length: 0 }, configurable: true })

      await input.trigger('change')
      await wrapper.vm.$nextTick()

      expect(mockProcessImage).not.toHaveBeenCalled()
      expect(mockProcessVideo).not.toHaveBeenCalled()
    })
  })
})
