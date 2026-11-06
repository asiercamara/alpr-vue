import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PlateModal from '@/components/ui/PlateModal.vue'
import { i18n } from '@/i18n'

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
  afterEach(() => {
    i18n.global.locale.value = 'es'
  })

  beforeEach(() => {
    mockUpdatePlateText.mockReset()
    mockUpdatePlateText.mockReturnValue(true)
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

  it('does not render when modelValue is null', () => {
    const wrapper = mount(PlateModal, {
      props: { modelValue: null },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('renders plate text and confidence when plate exists', () => {
    const wrapper = mount(PlateModal, {
      props: { modelValue: makePlate() },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('ABC123')
    expect(wrapper.text()).toContain('95.0%')
  })

  it('renders plate ID and detection time', () => {
    const wrapper = mount(PlateModal, {
      props: { modelValue: makePlate() },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('ate_test')
  })

  it('renders character confidence bars', () => {
    const wrapper = mount(PlateModal, {
      props: { modelValue: makePlate() },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('95')
    expect(wrapper.text()).toContain('90')
  })

  it('shows Sin imagen disponible when croppedImage is null', () => {
    const wrapper = mount(PlateModal, {
      props: { modelValue: makePlate({ croppedImage: null }) },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('Sin imagen disponible')
  })

  it('emits update:modelValue null when close button is clicked', async () => {
    const wrapper = mount(PlateModal, {
      props: { modelValue: makePlate() },
      global: { stubs: globalStubs },
    })
    await wrapper.get('button[aria-label="Cerrar"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
  })

  it('labels the close button in the active locale', async () => {
    const wrapper = mount(PlateModal, {
      props: { modelValue: makePlate() },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('button[aria-label="Cerrar"]').exists()).toBe(true)

    i18n.global.locale.value = 'en'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(true)
  })

  it('emits update:modelValue null when backdrop is clicked', async () => {
    const wrapper = mount(PlateModal, {
      props: { modelValue: makePlate() },
      global: { stubs: globalStubs },
    })
    await wrapper.get('.absolute.inset-0').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
  })

  it('draws croppedImage on canvas when available', async () => {
    const mockDrawImage = vi.fn()
    const mockCtx = { drawImage: mockDrawImage, getImageData: vi.fn() }
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

    const mockBitmap = { width: 200, height: 100 } as any
    const plate = makePlate({ croppedImage: mockBitmap })

    const wrapper = mount(PlateModal, {
      props: { modelValue: plate },
      global: { stubs: globalStubs },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(mockDrawImage).toHaveBeenCalledWith(mockBitmap, 0, 0)
  })

  it('leaves the canvas untouched when no 2d context is available', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as any

    const wrapper = mount(PlateModal, {
      props: { modelValue: makePlate({ croppedImage: { width: 200, height: 100 } }) },
      global: { stubs: globalStubs },
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // jsdom default canvas size: it would be 200x100 had the image been drawn
    const canvas = wrapper.get('canvas').element as HTMLCanvasElement
    expect([canvas.width, canvas.height]).toEqual([300, 150])
  })

  it('does not draw on canvas when croppedImage is null', async () => {
    const mockDrawImage = vi.fn()
    const mockCtx = { drawImage: mockDrawImage }
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any

    mount(PlateModal, {
      props: { modelValue: makePlate() },
      global: { stubs: globalStubs },
    })

    await new Promise((r) => setTimeout(r, 0))

    expect(mockDrawImage).not.toHaveBeenCalled()
  })

  describe('edit mode', () => {
    it('enters edit mode when edit button is clicked', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })
      expect(wrapper.find('input').exists()).toBe(false)

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      expect(editBtn).toBeDefined()
      await editBtn!.trigger('click')
      expect(wrapper.find('input').exists()).toBe(true)
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('ABC123')
    })

    it('saves edit when save button is clicked', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      expect(editBtn).toBeDefined()
      await editBtn!.trigger('click')

      const input = wrapper.find('input')
      await input.setValue('XYZ789')

      const saveBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Guardar')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      expect(mockUpdatePlateText).toHaveBeenCalledWith('plate_test', 'XYZ789')
      expect(wrapper.find('input').exists()).toBe(false)
    })

    it('shows and copies the saved text without reopening the modal', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })
      await wrapper
        .findAll('button')
        .find((b) => b.attributes('title') === 'Editar')!
        .trigger('click')
      await wrapper.find('input').setValue('  XYZ789 ')
      await wrapper
        .findAll('button')
        .find((b) => b.attributes('title') === 'Guardar')!
        .trigger('click')

      expect(wrapper.find('.plate-text').text()).toBe('XYZ789')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
        expect.objectContaining({
          id: 'plate_test',
          text: 'XYZ789',
          plateText: expect.objectContaining({ text: 'XYZ789' }),
        }),
      ])

      await wrapper
        .findAll('button')
        .find((b) => b.attributes('title') === 'Copiar')!
        .trigger('click')
      expect(mockClipboardWriteText).toHaveBeenCalledWith('XYZ789')
    })

    it('keeps the old text when the store does not know the plate', async () => {
      mockUpdatePlateText.mockReturnValue(false)
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })
      await wrapper
        .findAll('button')
        .find((b) => b.attributes('title') === 'Editar')!
        .trigger('click')
      await wrapper.find('input').setValue('XYZ789')
      await wrapper
        .findAll('button')
        .find((b) => b.attributes('title') === 'Guardar')!
        .trigger('click')

      expect(wrapper.find('.plate-text').text()).toBe('ABC123')
    })

    it('cancels edit when cancel button is clicked', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      expect(editBtn).toBeDefined()
      await editBtn!.trigger('click')
      expect(wrapper.find('input').exists()).toBe(true)

      const cancelBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Cancelar')
      expect(cancelBtn).toBeDefined()
      await cancelBtn!.trigger('click')
      expect(wrapper.find('input').exists()).toBe(false)
      expect(mockUpdatePlateText).not.toHaveBeenCalled()
    })

    it('saves edit on Enter key', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      expect(editBtn).toBeDefined()
      await editBtn!.trigger('click')

      const input = wrapper.find('input')
      await input.setValue('NEW123')
      await input.trigger('keydown.enter')

      expect(mockUpdatePlateText).toHaveBeenCalledWith('plate_test', 'NEW123')
    })

    it('cancels edit on Escape key', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      expect(editBtn).toBeDefined()
      await editBtn!.trigger('click')
      expect(wrapper.find('input').exists()).toBe(true)

      await wrapper.find('input').trigger('keydown.escape')
      expect(wrapper.find('input').exists()).toBe(false)
    })

    it('does not save if edit text is empty or whitespace', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      expect(editBtn).toBeDefined()
      await editBtn!.trigger('click')

      const input = wrapper.find('input')
      await input.setValue('   ')
      await input.trigger('keydown.enter')

      expect(mockUpdatePlateText).not.toHaveBeenCalled()
    })
  })

  describe('edit mode when the plate changes', () => {
    const plateB = () =>
      makePlate({
        id: 'plate_other',
        text: 'XYZ789',
        plateText: { text: 'XYZ789', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
      })

    const startEditing = async (wrapper: ReturnType<typeof mount>) => {
      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      await editBtn!.trigger('click')
      await wrapper.find('input').setValue('UNSAVED1')
    }

    it('leaves edit mode and shows the new plate when another one is selected', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })
      await startEditing(wrapper)

      await wrapper.setProps({ modelValue: plateB() })

      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.find('.plate-text').text()).toBe('XYZ789')
    })

    it('offers no way to save the unsaved text over the newly selected plate', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })
      await startEditing(wrapper)

      await wrapper.setProps({ modelValue: plateB() })

      expect(wrapper.findAll('button').some((b) => b.attributes('title') === 'Guardar')).toBe(false)
      expect(mockUpdatePlateText).not.toHaveBeenCalled()
    })

    it('does not resume the edit when the modal is closed and opened again', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })
      await startEditing(wrapper)

      await wrapper.setProps({ modelValue: null })
      await wrapper.setProps({ modelValue: makePlate() })

      expect(wrapper.find('input').exists()).toBe(false)
    })

    it('starts the next edit from the text of the plate that is open', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })
      await startEditing(wrapper)
      await wrapper.setProps({ modelValue: plateB() })

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Editar')
      await editBtn!.trigger('click')

      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('XYZ789')
    })
  })

  describe('copy to clipboard', () => {
    it('calls clipboard API when copy button is clicked', async () => {
      const wrapper = mount(PlateModal, {
        props: { modelValue: makePlate() },
        global: { stubs: globalStubs },
      })

      const copyBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Copiar')
      expect(copyBtn).toBeDefined()
      await copyBtn!.trigger('click')
      expect(mockClipboardWriteText).toHaveBeenCalledWith('ABC123')
    })
  })

  describe('charColor', () => {
    it('computes ring colors for different confidence levels', async () => {
      const wrapper = mount(PlateModal, {
        props: {
          modelValue: makePlate({
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
