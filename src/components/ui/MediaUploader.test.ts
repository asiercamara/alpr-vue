import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

const mockSetUploadMedia = vi.fn()
const mockClearUploadMedia = vi.fn()
const mockIsUploadMode = ref(false)

vi.mock('@/stores/appStore', () => ({
  useAppStore: () => ({
    isUploadMode: mockIsUploadMode.value,
    setUploadMedia: mockSetUploadMedia,
    clearUploadMedia: mockClearUploadMedia,
  }),
}))

vi.mock('@/components/icons/IconUpload.vue', () => ({
  default: { template: '<svg data-test="icon-upload" />' },
}))

import MediaUploader from '@/components/ui/MediaUploader.vue'

describe('MediaUploader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockIsUploadMode.value = false
    mockSetUploadMedia.mockClear()
    mockClearUploadMedia.mockClear()
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

  it('renders hidden file input with accept attribute', () => {
    const wrapper = mountComponent()
    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('accept')).toBe('image/*,video/*')
  })

  it('calls appStore.setUploadMedia when an image file is selected', async () => {
    const createObjectURLSpy = vi.fn(() => 'blob:test-url')
    vi.stubGlobal('URL', { createObjectURL: createObjectURLSpy, revokeObjectURL: vi.fn() })

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

    expect(mockSetUploadMedia).toHaveBeenCalledWith('image', 'blob:test-url', file)

    vi.unstubAllGlobals()
  })

  it('calls appStore.setUploadMedia when a video file is selected', async () => {
    const createObjectURLSpy = vi.fn(() => 'blob:video-url')
    vi.stubGlobal('URL', { createObjectURL: createObjectURLSpy, revokeObjectURL: vi.fn() })

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

    expect(mockSetUploadMedia).toHaveBeenCalledWith('video', 'blob:video-url', file)

    vi.unstubAllGlobals()
  })

  it('clears existing upload mode before setting new media', async () => {
    mockIsUploadMode.value = true
    const createObjectURLSpy = vi.fn(() => 'blob:test-url')
    vi.stubGlobal('URL', { createObjectURL: createObjectURLSpy, revokeObjectURL: vi.fn() })

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

    expect(mockClearUploadMedia).toHaveBeenCalled()
    expect(mockSetUploadMedia).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('does nothing when no file is selected', async () => {
    const wrapper = mountComponent()
    const input = wrapper.find('input[type="file"]')

    Object.defineProperty(input.element, 'files', { value: { length: 0 }, configurable: true })

    await input.trigger('change')
    await wrapper.vm.$nextTick()

    expect(mockSetUploadMedia).not.toHaveBeenCalled()
  })

  it('triggers file input when button is clicked', async () => {
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
})
