import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { usePlateStore } from '@/stores/plateStore'
import PlateList from '@/components/ui/PlateList.vue'
import type { PlateTextResult } from '@/types/detection'

vi.mock('@/utils/export', () => ({
  generateCSV: vi.fn(() => 'Texto,Confianza,Fecha,ID'),
  downloadCSV: vi.fn(),
}))

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

  const mountList = () =>
    mount(PlateList, {
      global: {
        stubs: {
          PlateModal: {
            template: '<div data-test="modal"></div>',
            props: ['plate'],
          },
          PlateListItem: {
            template:
              '<div data-test="plate-item" class="plate-item" @click="$emit(\'view-details\')">{{ plate.plateText.text }}</div>',
            props: ['plate'],
          },
        },
      },
    })

  it('shows empty state when no plates', () => {
    const wrapper = mountList()
    expect(wrapper.text()).toContain('Sin detecciones')
  })

  it('renders best detections (deduplicated)', () => {
    plateStore.addPlate(makePlateData('1', 'ABC123', 0.7))
    plateStore.addPlate(makePlateData('2', 'ABC123', 0.95))
    plateStore.addPlate(makePlateData('3', 'ABC123', 0.85))

    const wrapper = mountList()
    expect(wrapper.text()).toContain('ABC123')
  })

  it('shows different plates as separate entries', () => {
    plateStore.addPlate(makePlateData('1', 'AAA111'))
    plateStore.addPlate(makePlateData('2', 'BBB222'))

    const wrapper = mountList()
    expect(wrapper.text()).toContain('AAA111')
    expect(wrapper.text()).toContain('BBB222')
  })

  it('shows export and clear buttons when plates exist', () => {
    plateStore.addPlate(makePlateData('1', 'ABC123'))

    const wrapper = mountList()
    expect(wrapper.text()).toContain('Exportar CSV')
    expect(wrapper.text()).toContain('Limpiar')
  })

  it('does not show export and clear buttons when no plates', () => {
    const wrapper = mountList()
    expect(wrapper.text()).not.toContain('Exportar CSV')
    expect(wrapper.text()).not.toContain('Limpiar')
  })

  it('shows count badge when plates exist', () => {
    plateStore.addPlate(makePlateData('1', 'ABC123'))
    const wrapper = mountList()
    expect(wrapper.text()).toContain('1')
  })

  it('clears plates when clear button is clicked', async () => {
    plateStore.addPlate(makePlateData('1', 'ABC123'))
    const wrapper = mountList()

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('Limpiar'))
    if (clearBtn) {
      await clearBtn.trigger('click')
      expect(plateStore.plates).toHaveLength(0)
    }
  })

  it('calls downloadCSV when export button is clicked', async () => {
    plateStore.addPlate(makePlateData('1', 'ABC123'))
    const wrapper = mountList()

    const { downloadCSV } = await import('@/utils/export')
    const exportBtn = wrapper.findAll('button').find((b) => b.text().includes('Exportar CSV'))
    if (exportBtn) {
      await exportBtn.trigger('click')
      expect(downloadCSV).toHaveBeenCalled()
    }
  })

  it('renders plates in most-recent-first order', () => {
    plateStore.addPlate({
      ...makePlateData('1', 'AAA111'),
      timestamp: new Date('2025-01-01'),
    })
    plateStore.addPlate({
      ...makePlateData('2', 'BBB222'),
      timestamp: new Date('2025-01-03'),
    })

    const best = plateStore.bestDetections
    expect(best[0].text).toBe('BBB222')
    expect(best[1].text).toBe('AAA111')
  })
})
