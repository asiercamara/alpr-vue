import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlateModal from '@/components/ui/PlateModal.vue'

function makePlate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plate_test',
    text: 'ABC123',
    confidence: 0.95,
    croppedImage: null,
    boundingBox: null,
    plateText: { text: 'ABC123', confidence: [0.95, 0.92, 0.88, 0.91, 0.93, 0.9] },
    timestamp: new Date('2025-01-01T12:00:00'),
    ...overrides,
  }
}

describe('PlateModal', () => {
  const globalStubs = {
    Teleport: { template: '<div><slot/></div>' },
    Transition: { template: '<div><slot/></div>' },
  }

  it('does not render when plate is null', () => {
    const wrapper = mount(PlateModal, {
      props: { plate: null },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('renders plate text and confidence when plate exists', () => {
    const wrapper = mount(PlateModal, {
      props: { plate: makePlate() },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('ABC123')
    expect(wrapper.text()).toContain('95.0%')
  })

  it('renders plate ID and detection time', () => {
    const wrapper = mount(PlateModal, {
      props: { plate: makePlate() },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('ate_test')
  })

  it('renders character confidence bars', () => {
    const wrapper = mount(PlateModal, {
      props: { plate: makePlate() },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('95')
    expect(wrapper.text()).toContain('90')
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(PlateModal, {
      props: { plate: makePlate() },
      global: { stubs: globalStubs },
    })
    const buttons = wrapper.findAll('button')
    const closeBtn = buttons.find((b) => b.text().includes('Cerrar'))
    if (closeBtn) {
      await closeBtn.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    }
  })

  it('draws croppedImage on canvas when available', async () => {
    const mockDrawImage = vi.fn()
    const mockCtx = { drawImage: mockDrawImage, getImageData: vi.fn() }
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

    const mockBitmap = { width: 200, height: 100 } as any
    const plate = makePlate({ croppedImage: mockBitmap })

    const wrapper = mount(PlateModal, {
      props: { plate },
      global: { stubs: globalStubs },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(mockDrawImage).toHaveBeenCalledWith(mockBitmap, 0, 0)
  })

  it('does not draw on canvas when croppedImage is null', async () => {
    const mockDrawImage = vi.fn()
    const mockCtx = { drawImage: mockDrawImage }
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

    mount(PlateModal, {
      props: { plate: makePlate() },
      global: { stubs: globalStubs },
    })

    await new Promise((r) => setTimeout(r, 0))

    expect(mockDrawImage).not.toHaveBeenCalled()
  })
})
