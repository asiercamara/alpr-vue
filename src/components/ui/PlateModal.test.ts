import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlateModal from '@/components/ui/PlateModal.vue'

function makePlate() {
  return {
    id: 'plate_test',
    text: 'ABC123',
    confidence: 0.95,
    croppedImage: null,
    boundingBox: null,
    plateText: { text: 'ABC123', confidence: [0.95, 0.92, 0.88, 0.91, 0.93, 0.90] },
    timestamp: new Date('2025-01-01T12:00:00'),
  }
}

describe('PlateModal', () => {
  it('does not render when plate is null', () => {
    const wrapper = mount(PlateModal, {
      props: { plate: null },
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('renders plate text when plate exists', () => {
    const wrapper = mount(PlateModal, {
      props: { plate: makePlate() },
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('ABC123')
    expect(wrapper.text()).toContain('95.0%')
  })

  it('has close button', () => {
    const wrapper = mount(PlateModal, {
      props: { plate: makePlate() },
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('Cerrar')
  })
})