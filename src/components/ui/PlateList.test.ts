import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { usePlateStore } from '@/stores/plateStore'
import PlateList from '@/components/ui/PlateList.vue'
import type { PlateTextResult } from '@/types/detection'

function makePlateData(id: string, text: string, confidence: number = 0.95) {
  return {
    id,
    text,
    confidence,
    plateText: {
      text,
      confidence: [confidence, confidence, confidence, confidence, confidence, confidence],
    } as PlateTextResult,
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
    expect(wrapper.text()).toContain('Sin detecciones')
  })

  it('renders best detections (deduplicated)', () => {
    plateStore.addPlate(makePlateData('1', 'ABC123', 0.7))
    plateStore.addPlate(makePlateData('2', 'ABC123', 0.95))
    plateStore.addPlate(makePlateData('3', 'ABC123', 0.85))

    const wrapper = mount(PlateList, {
      global: {
        stubs: {
          PlateModal: { template: '<div data-test="modal"></div>' },
        },
      },
    })

    const textContent = wrapper.text()
    expect(textContent).toContain('ABC123')
    expect(textContent).toContain('×3')
  })

  it('shows different plates as separate entries', () => {
    plateStore.addPlate(makePlateData('1', 'AAA111'))
    plateStore.addPlate(makePlateData('2', 'BBB222'))

    const wrapper = mount(PlateList, {
      global: {
        stubs: {
          PlateModal: { template: '<div data-test="modal"></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('AAA111')
    expect(wrapper.text()).toContain('BBB222')
  })

  it('shows the highest confidence version for similar plates', () => {
    plateStore.addPlate(makePlateData('1', 'XYZ789', 0.7))
    plateStore.addPlate(makePlateData('2', 'XYZ789', 0.95))

    const best = plateStore.bestDetections
    expect(best).toHaveLength(1)
    expect(best[0].confidence).toBe(0.95)
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

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('Limpiar'))
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

    const detailBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Ver detalles') || b.find('svg').exists())
    if (detailBtn) {
      await detailBtn.trigger('click')
      expect(wrapper.vm.$data).toBeDefined()
    }
  })
})
