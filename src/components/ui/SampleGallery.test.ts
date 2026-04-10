import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SampleGallery from '@/components/ui/SampleGallery.vue'
import { TEST_MEDIA } from '@/data/testMedia'

describe('SampleGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountGallery = (modelValue = true) =>
    mount(SampleGallery, {
      props: { modelValue },
      global: {
        stubs: {
          IconImage: { template: '<svg data-test="icon-image" />' },
          IconVideo: { template: '<svg data-test="icon-video" />' },
        },
      },
    })

  it('does not render when modelValue is false', () => {
    const wrapper = mountGallery(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('renders when modelValue is true', () => {
    const wrapper = mountGallery(true)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('renders all image items', () => {
    const wrapper = mountGallery(true)
    const imageCount = TEST_MEDIA.filter((m) => m.type === 'image').length
    const imageButtons = wrapper.findAll('button').filter((b) => b.text().includes('IMG'))
    expect(imageButtons.length).toBe(imageCount)
  })

  it('renders all video items', () => {
    const wrapper = mountGallery(true)
    const videoCount = TEST_MEDIA.filter((m) => m.type === 'video').length
    const videoButtons = wrapper.findAll('button').filter((b) => b.text().includes('VÍD'))
    expect(videoButtons.length).toBe(videoCount)
  })

  it('displays image labels', () => {
    const wrapper = mountGallery(true)
    const imageItems = TEST_MEDIA.filter((m) => m.type === 'image')
    for (const item of imageItems) {
      expect(wrapper.text()).toContain(item.label)
    }
  })

  it('displays video labels', () => {
    const wrapper = mountGallery(true)
    const videoItems = TEST_MEDIA.filter((m) => m.type === 'video')
    for (const item of videoItems) {
      expect(wrapper.text()).toContain(item.label)
    }
  })

  it('renders section headers', () => {
    const wrapper = mountGallery(true)
    expect(wrapper.text()).toContain('Imágenes')
    expect(wrapper.text()).toContain('Vídeos')
  })

  it('emits select event with correct item when image is clicked', async () => {
    const wrapper = mountGallery(true)
    const imageItems = TEST_MEDIA.filter((m) => m.type === 'image')
    const buttons = wrapper.findAll('button').filter((b) => b.text().includes('IMG'))

    if (buttons.length > 0) {
      await buttons[0].trigger('click')
      expect(wrapper.emitted('select')).toBeTruthy()
      expect(wrapper.emitted('select')![0]).toEqual([imageItems[0]])
    }
  })

  it('emits select event with correct item when video is clicked', async () => {
    const wrapper = mountGallery(true)
    const videoItems = TEST_MEDIA.filter((m) => m.type === 'video')
    const buttons = wrapper.findAll('button').filter((b) => b.text().includes('VÍD'))

    if (buttons.length > 0) {
      await buttons[0].trigger('click')
      expect(wrapper.emitted('select')).toBeTruthy()
      expect(wrapper.emitted('select')![0]).toEqual([videoItems[0]])
    }
  })
})
