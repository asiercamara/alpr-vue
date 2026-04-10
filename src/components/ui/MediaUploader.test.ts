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
        stubs: {
          IconUpload: { template: '<svg />' },
          IconImage: { template: '<svg />' },
          SampleGallery: {
            template: '<div data-test="gallery"></div>',
            props: ['modelValue'],
            emits: ['select'],
          },
        },
      },
    })

  it('renders the upload button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Subir archivo')
  })

  it('renders the sample gallery toggle button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('prueba con una muestra')
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

  it('triggers file input when upload button is clicked', async () => {
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

  it('toggles gallery when sample button is clicked', async () => {
    const wrapper = mountComponent()
    const sampleBtn = wrapper.findAll('button').find((b) => b.text().includes('muestra'))
    if (!sampleBtn) return

    expect(wrapper.vm.showGallery).toBe(false)
    await sampleBtn.trigger('click')
    expect(wrapper.vm.showGallery).toBe(true)
    await sampleBtn.trigger('click')
    expect(wrapper.vm.showGallery).toBe(false)
  })

  it('closes gallery when upload button is clicked', async () => {
    const wrapper = mountComponent()
    wrapper.vm.showGallery = true
    await wrapper.vm.$nextTick()

    const uploadBtn = wrapper.findAll('button').find((b) => b.text().includes('Subir archivo'))
    if (uploadBtn) {
      await uploadBtn.trigger('click')
      expect(wrapper.vm.showGallery).toBe(false)
    }
  })

  it('fetches and loads sample image when handleSampleSelect is called', async () => {
    const blob = new Blob(['image data'], { type: 'image/jpeg' })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    })
    vi.stubGlobal('fetch', mockFetch)

    const createObjectURLSpy = vi.fn(() => 'blob:sample-url')
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: vi.fn(),
    })

    const wrapper = mountComponent()
    const testMedia = { file: '/test/600.jpg', label: 'SEAT 600', type: 'image' as const }

    await wrapper.vm.handleSampleSelect(testMedia)

    expect(mockFetch).toHaveBeenCalledWith('/test/600.jpg')
    expect(mockSetUploadMedia).toHaveBeenCalledWith('image', 'blob:sample-url', expect.any(File))

    vi.unstubAllGlobals()
  })

  it('fetches and loads sample video when handleSampleSelect is called', async () => {
    const blob = new Blob(['video data'], { type: 'video/mp4' })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    })
    vi.stubGlobal('fetch', mockFetch)

    const createObjectURLSpy = vi.fn(() => 'blob:video-sample-url')
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: vi.fn(),
    })

    const wrapper = mountComponent()
    const testMedia = { file: '/test/sample.mp4', label: 'Tráfico urbano', type: 'video' as const }

    await wrapper.vm.handleSampleSelect(testMedia)

    expect(mockFetch).toHaveBeenCalledWith('/test/sample.mp4')
    expect(mockSetUploadMedia).toHaveBeenCalledWith(
      'video',
      'blob:video-sample-url',
      expect.any(File),
    )

    vi.unstubAllGlobals()
  })

  it('does nothing when fetch fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', mockFetch)

    const createObjectURLSpy = vi.fn(() => 'blob:fail-url')
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: vi.fn(),
    })

    const wrapper = mountComponent()
    const testMedia = { file: '/test/missing.jpg', label: 'Missing', type: 'image' as const }

    await wrapper.vm.handleSampleSelect(testMedia)

    expect(mockSetUploadMedia).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('clears existing upload mode before setting sample media', async () => {
    mockIsUploadMode.value = true
    const blob = new Blob(['data'], { type: 'image/jpeg' })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    })
    vi.stubGlobal('fetch', mockFetch)

    const createObjectURLSpy = vi.fn(() => 'blob:sample-url')
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: vi.fn(),
    })

    const wrapper = mountComponent()
    const testMedia = { file: '/test/600.jpg', label: 'SEAT 600', type: 'image' as const }

    await wrapper.vm.handleSampleSelect(testMedia)

    expect(mockClearUploadMedia).toHaveBeenCalled()
    expect(mockSetUploadMedia).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
