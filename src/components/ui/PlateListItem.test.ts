import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlateListItem from '@/components/ui/PlateListItem.vue'

function makePlate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plate_test',
    text: 'ABC123',
    confidence: 0.95,
    croppedImage: null,
    boundingBox: null,
    plateText: { text: 'ABC123', confidence: [0.95, 0.92, 0.88, 0.91, 0.93, 0.9] },
    timestamp: new Date('2025-01-01T12:00:00'),
    occurrences: 1,
    ...overrides,
  }
}

describe('PlateListItem', () => {
  it('renders plate text', () => {
    const wrapper = mount(PlateListItem, {
      props: { plate: makePlate() },
      global: {
        stubs: {
          ConfidenceRing: { template: '<div data-test="ring" />' },
        },
      },
    })
    expect(wrapper.text()).toContain('ABC123')
  })

  it('renders timestamp', () => {
    const wrapper = mount(PlateListItem, {
      props: { plate: makePlate() },
      global: {
        stubs: {
          ConfidenceRing: { template: '<div data-test="ring" />' },
        },
      },
    })
    expect(wrapper.text()).toContain(':')
  })

  it('renders occurrences badge when occurrences > 1', () => {
    const wrapper = mount(PlateListItem, {
      props: { plate: makePlate({ occurrences: 5 }) },
      global: {
        stubs: {
          ConfidenceRing: { template: '<div data-test="ring" />' },
        },
      },
    })
    expect(wrapper.text()).toContain('×5')
  })

  it('does not render occurrences badge when occurrences is 1', () => {
    const wrapper = mount(PlateListItem, {
      props: { plate: makePlate({ occurrences: 1 }) },
      global: {
        stubs: {
          ConfidenceRing: { template: '<div data-test="ring" />' },
        },
      },
    })
    expect(wrapper.text()).not.toContain('×1')
  })

  it('does not render occurrences badge when occurrences is undefined', () => {
    const wrapper = mount(PlateListItem, {
      props: { plate: makePlate({ occurrences: undefined }) },
      global: {
        stubs: {
          ConfidenceRing: { template: '<div data-test="ring" />' },
        },
      },
    })
    expect(wrapper.text()).not.toContain('×')
  })

  it('emits view-details when clicked', async () => {
    const wrapper = mount(PlateListItem, {
      props: { plate: makePlate() },
      global: {
        stubs: {
          ConfidenceRing: { template: '<div data-test="ring" />' },
        },
      },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('view-details')).toBeTruthy()
  })

  it('renders ConfidenceRing with correct value', () => {
    const wrapper = mount(PlateListItem, {
      props: { plate: makePlate({ confidence: 0.85 }) },
      global: {
        stubs: {
          ConfidenceRing: {
            template: '<div data-test="ring" />',
            props: ['value'],
          },
        },
      },
    })
    const ring = wrapper.find('[data-test="ring"]')
    expect(ring.exists()).toBe(true)
  })
})
