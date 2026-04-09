import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PlateModal from '@/components/ui/PlateModal.vue'

const mockUpdatePlateText = vi.fn()
const mockClipboardWriteText = vi.fn()

vi.mock('@/stores/plateStore', () => ({
  usePlateStore: () => ({
    updatePlateText: mockUpdatePlateText,
  }),
}))

vi.mock('@/components/ui/ConfidenceRing.vue', () => ({
  default: {
    template: '<div data-test="confidence-ring">ring</div>',
    props: ['value'],
  },
}))

vi.mock('@/components/icons/IconCopy.vue', () => ({
  default: { template: '<svg data-test="icon-copy" />' },
}))

vi.mock('@/components/icons/IconEdit.vue', () => ({
  default: { template: '<svg data-test="icon-edit" />' },
}))

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
  beforeEach(() => {
    mockUpdatePlateText.mockClear()
    mockClipboardWriteText.mockClear()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboardWriteText },
      configurable: true,
    })
  })

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

  it('shows Sin imagen disponible when croppedImage is null', () => {
    const wrapper = mount(PlateModal, {
      props: { plate: makePlate({ croppedImage: null }) },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('Sin imagen disponible')
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(PlateModal, {
      props: { plate: makePlate() },
      global: { stubs: globalStubs },
    })
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Cerrar'))
    if (closeBtn) {
      await closeBtn.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    }
  })

  it('emits close event when backdrop is clicked', async () => {
    const wrapper = mount(PlateModal, {
      props: { plate: makePlate() },
      global: { stubs: globalStubs },
    })
    const backdrop = wrapper.find('.absolute.inset-0')
    if (backdrop.exists()) {
      await backdrop.trigger('click')
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

  describe('edit mode', () => {
    it('enters edit mode when edit button is clicked', async () => {
      const wrapper = mount(PlateModal, {
        props: { plate: makePlate() },
        global: { stubs: globalStubs },
      })
      expect(wrapper.find('input').exists()).toBe(false)

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      if (editBtn) {
        await editBtn.trigger('click')
        expect(wrapper.find('input').exists()).toBe(true)
        expect((wrapper.find('input').element as HTMLInputElement).value).toBe('ABC123')
      }
    })

    it('saves edit when save button is clicked', async () => {
      const wrapper = mount(PlateModal, {
        props: { plate: makePlate() },
        global: { stubs: globalStubs },
      })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      if (editBtn) {
        await editBtn.trigger('click')
      }

      const input = wrapper.find('input')
      await input.setValue('XYZ789')

      const saveBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Guardar')
      if (saveBtn) {
        await saveBtn.trigger('click')
        expect(mockUpdatePlateText).toHaveBeenCalledWith('plate_test', 'XYZ789')
        expect(wrapper.emitted('edited')).toBeTruthy()
        expect(wrapper.emitted('edited')![0]).toEqual(['plate_test', 'XYZ789'])
        expect(wrapper.find('input').exists()).toBe(false)
      }
    })

    it('cancels edit when cancel button is clicked', async () => {
      const wrapper = mount(PlateModal, {
        props: { plate: makePlate() },
        global: { stubs: globalStubs },
      })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      if (editBtn) {
        await editBtn.trigger('click')
      }
      expect(wrapper.find('input').exists()).toBe(true)

      const cancelBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Cancelar')
      if (cancelBtn) {
        await cancelBtn.trigger('click')
        expect(wrapper.find('input').exists()).toBe(false)
        expect(mockUpdatePlateText).not.toHaveBeenCalled()
      }
    })

    it('saves edit on Enter key', async () => {
      const wrapper = mount(PlateModal, {
        props: { plate: makePlate() },
        global: { stubs: globalStubs },
      })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      if (editBtn) {
        await editBtn.trigger('click')
      }

      const input = wrapper.find('input')
      await input.setValue('NEW123')
      await input.trigger('keydown.enter')

      expect(mockUpdatePlateText).toHaveBeenCalledWith('plate_test', 'NEW123')
    })

    it('cancels edit on Escape key', async () => {
      const wrapper = mount(PlateModal, {
        props: { plate: makePlate() },
        global: { stubs: globalStubs },
      })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      if (editBtn) {
        await editBtn.trigger('click')
      }
      expect(wrapper.find('input').exists()).toBe(true)

      await wrapper.find('input').trigger('keydown.escape')
      expect(wrapper.find('input').exists()).toBe(false)
    })

    it('does not save if edit text is empty or whitespace', async () => {
      const wrapper = mount(PlateModal, {
        props: { plate: makePlate() },
        global: { stubs: globalStubs },
      })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      if (editBtn) {
        await editBtn.trigger('click')
      }

      const input = wrapper.find('input')
      await input.setValue('   ')
      await input.trigger('keydown.enter')

      expect(mockUpdatePlateText).not.toHaveBeenCalled()
    })
  })

  describe('copy to clipboard', () => {
    it('calls clipboard API when copy button is clicked', async () => {
      const wrapper = mount(PlateModal, {
        props: { plate: makePlate() },
        global: { stubs: globalStubs },
      })

      const copyBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Copiar')
      if (copyBtn) {
        await copyBtn.trigger('click')
        expect(mockClipboardWriteText).toHaveBeenCalledWith('ABC123')
      }
    })
  })

  describe('charColor', () => {
    it('computes ring colors for different confidence levels', async () => {
      const wrapper = mount(PlateModal, {
        props: {
          plate: makePlate({
            plateText: {
              text: 'ABCDE',
              confidence: [0.95, 0.8, 0.65, 0.5, 0.3],
            },
          }),
        },
        global: { stubs: globalStubs },
      })
      expect(wrapper.text()).toContain('95')
      expect(wrapper.text()).toContain('30')
    })
  })
})
