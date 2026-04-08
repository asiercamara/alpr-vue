import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mockPlates = [
  {
    id: '1',
    text: 'ABC123',
    confidence: 0.95,
    plateText: { text: 'ABC123', confidence: [0.95, 0.95, 0.95, 0.95, 0.95, 0.95] },
    timestamp: new Date(),
    croppedImage: null,
    boundingBox: null,
  },
]

const mockPlateStore = {
  plates: [] as any[],
  clearPlates: vi.fn(),
}

vi.mock('@/stores/plateStore', () => ({
  usePlateStore: () => mockPlateStore,
}))

vi.mock('@/components/ui/PlateModal.vue', () => ({
  default: {
    template: '<div data-test="plate-modal"></div>',
    props: ['plate'],
    emits: ['close'],
  },
}))

import PlateList from '@/components/ui/PlateList.vue'

describe('PlateList', () => {
  beforeEach(() => {
    mockPlateStore.plates = []
    mockPlateStore.clearPlates.mockClear()
  })

  it('shows empty state when no plates', () => {
    const wrapper = mount(PlateList)
    expect(wrapper.text()).toContain('No hay detecciones recientes')
  })

  it('renders plates list with plate data', () => {
    mockPlateStore.plates = mockPlates
    const wrapper = mount(PlateList)
    expect(wrapper.text()).toContain('ABC123')
  })

  it('has clear button', () => {
    const wrapper = mount(PlateList)
    expect(wrapper.text()).toContain('Limpiar lista')
  })
})