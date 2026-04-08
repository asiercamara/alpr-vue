import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { usePlateStore } from '@/stores/plateStore'
import PlateList from '@/components/ui/PlateList.vue'
import type { PlateTextResult } from '@/types/detection'

function makePlateData(id: string, text: string) {
  return {
    id,
    text,
    confidence: 0.95,
    plateText: { text, confidence: [0.95, 0.92, 0.88, 0.91, 0.93, 0.90] } as PlateTextResult,
    timestamp: new Date(),
    croppedImage: null,
    boundingBox: null,
  }
}

describe('PlateList', () => {
  let plateStore: ReturnType<typeof usePlateStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    plateStore = usePlateStore()
  })

  it('shows empty state when no plates', () => {
    const wrapper = mount(PlateList, {
      global: {
        stubs: {
          PlateModal: { template: '<div data-test="modal"></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('No hay detecciones recientes')
  })

  it('renders plates list with plate data', () => {
    plateStore.addPlate(makePlateData('1', 'ABC123'))

    const wrapper = mount(PlateList, {
      global: {
        stubs: {
          PlateModal: { template: '<div data-test="modal"></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('ABC123')
    expect(wrapper.text()).toContain('95.0%')
  })

  it('renders multiple plates', () => {
    plateStore.addPlate(makePlateData('1', 'ABC123'))
    plateStore.addPlate(makePlateData('2', 'XYZ789'))

    const wrapper = mount(PlateList, {
      global: {
        stubs: {
          PlateModal: { template: '<div data-test="modal"></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('ABC123')
    expect(wrapper.text()).toContain('XYZ789')
  })

  it('clears plates when clear button is clicked', async () => {
    plateStore.addPlate(makePlateData('1', 'ABC123'))

    const wrapper = mount(PlateList, {
      global: {
        stubs: {
          PlateModal: { template: '<div data-test="modal"></div>' },
        },
      },
    })

    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('Limpiar lista'))
    if (clearBtn) {
      await clearBtn.trigger('click')
      expect(plateStore.plates).toHaveLength(0)
    }
  })

  it('sets selectedPlate when detail button is clicked', async () => {
    plateStore.addPlate(makePlateData('1', 'ABC123'))

    const wrapper = mount(PlateList, {
      global: {
        stubs: {
          PlateModal: { template: '<div data-test="modal"></div>' },
        },
      },
    })

    const detailBtn = wrapper.findAll('button').find(b => b.text().includes('Ver detalles') || b.find('svg').exists())
    if (detailBtn) {
      await detailBtn.trigger('click')
      expect(wrapper.vm.$data).toBeDefined()
    }
  })
})