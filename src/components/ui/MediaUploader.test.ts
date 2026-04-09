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

import MediaUploader from '@/components/ui/MediaUploader.vue'

describe('MediaUploader', () => {
  beforeEach(() => {
    mockStatus.value = 'idle'
    mockProgress.value = 0
    mockProcessImage.mockClear()
    mockProcessVideo.mockClear()
    mockCancelProcessing.mockClear()
  })

  it('renders the upload button', () => {
    const wrapper = mount(MediaUploader, {
      global: {
        stubs: { IconUpload: { template: '<svg />' } },
      },
    })
    expect(wrapper.text()).toContain('Subir archivo')
  })

  it('does not show overlay when idle', () => {
    mockStatus.value = 'idle'
    const wrapper = mount(MediaUploader, {
      global: {
        stubs: { IconUpload: { template: '<svg />' } },
      },
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('shows processing overlay when status is processing', () => {
    mockStatus.value = 'processing'
    const wrapper = mount(MediaUploader, {
      global: {
        stubs: { IconUpload: { template: '<svg />' } },
      },
    })
    expect(wrapper.text()).toContain('Analizando')
  })

  it('shows loading overlay when status is loading', () => {
    mockStatus.value = 'loading'
    const wrapper = mount(MediaUploader, {
      global: {
        stubs: { IconUpload: { template: '<svg />' } },
      },
    })
    expect(wrapper.text()).toContain('Cargando archivo')
  })

  it('shows cancel button in overlay during processing', () => {
    mockStatus.value = 'processing'
    const wrapper = mount(MediaUploader, {
      global: {
        stubs: { IconUpload: { template: '<svg />' } },
      },
    })
    expect(wrapper.text()).toContain('Cancelar')
  })

  it('calls cancelProcessing when cancel button is clicked', async () => {
    mockStatus.value = 'processing'
    const wrapper = mount(MediaUploader, {
      global: {
        stubs: { IconUpload: { template: '<svg />' } },
      },
    })
    const cancelBtn = wrapper.findAll('button').find((b) => b.text().includes('Cancelar'))
    if (cancelBtn) {
      await cancelBtn.trigger('click')
      expect(mockCancelProcessing).toHaveBeenCalled()
    }
  })

  it('shows progress percentage in overlay', () => {
    mockStatus.value = 'processing'
    mockProgress.value = 65
    const wrapper = mount(MediaUploader, {
      global: {
        stubs: { IconUpload: { template: '<svg />' } },
      },
    })
    expect(wrapper.text()).toContain('65%')
  })

  it('renders hidden file input with accept attribute', () => {
    const wrapper = mount(MediaUploader, {
      global: {
        stubs: { IconUpload: { template: '<svg />' } },
      },
    })
    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('accept')).toBe('image/*,video/*')
  })

  it('calls triggerFileSelect when upload button is clicked', async () => {
    const wrapper = mount(MediaUploader, {
      global: {
        stubs: { IconUpload: { template: '<svg />' } },
      },
    })
    const input = wrapper.find('input[type="file"]')
    const clickSpy = vi.fn()
    input.element.click = clickSpy

    const uploadBtn = wrapper.findAll('button').find((b) => b.text().includes('Subir archivo'))
    if (uploadBtn) {
      await uploadBtn.trigger('click')
      expect(clickSpy).toHaveBeenCalled()
    }
  })
})
