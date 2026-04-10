import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { usePlateStore } from '@/stores/plateStore'
import BottomDrawer from '@/components/ui/BottomDrawer.vue'
import type { PlateTextResult } from '@/types/detection'

function makePlate(id: string, text: string, confidence = 0.9) {
  return {
    id,
    text,
    confidence,
    plateText: { text, confidence: Array(6).fill(confidence) } as PlateTextResult,
    timestamp: new Date(),
    croppedImage: null,
    boundingBox: null,
  }
}

describe('BottomDrawer', () => {
  let plateStore: ReturnType<typeof usePlateStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    plateStore = usePlateStore()
    vi.stubGlobal('innerWidth', 375)
    vi.stubGlobal('innerHeight', 812)
  })

  const mountDrawer = () =>
    mount(BottomDrawer, {
      slots: { default: '<div data-test="content">PlateList content</div>' },
      global: { stubs: { Transition: { template: '<div><slot/></div>' } } },
    })

  it('renders the drag handle', () => {
    const wrapper = mountDrawer()
    expect(wrapper.find('.rounded-full').exists()).toBe(true)
  })

  it('starts collapsed with 80px height', () => {
    const wrapper = mountDrawer()
    const style = wrapper.find('[style]').attributes('style')
    expect(style).toContain('height: 80px')
  })

  it('shows "Sin detecciones" when no plates', () => {
    const wrapper = mountDrawer()
    expect(wrapper.text()).toContain('Sin detecciones')
  })

  it('shows plate count when plates exist', () => {
    plateStore.addPlate(makePlate('1', 'ABC123'))
    plateStore.addPlate(makePlate('2', 'XYZ789'))
    const wrapper = mountDrawer()
    expect(wrapper.text()).toContain('2 matrículas')
  })

  it('shows singular form for one plate', () => {
    plateStore.addPlate(makePlate('1', 'ABC123'))
    const wrapper = mountDrawer()
    expect(wrapper.text()).toContain('1 matrícula')
    expect(wrapper.text()).not.toContain('matrículas')
  })

  it('shows last 2 plate chips when collapsed', () => {
    plateStore.addPlate(makePlate('1', 'AAA111'))
    plateStore.addPlate(makePlate('2', 'BBB222'))
    plateStore.addPlate(makePlate('3', 'CCC333'))
    const wrapper = mountDrawer()
    // lastPlates = first 2 of bestDetections
    const chips = wrapper.findAll('.plate-text')
    expect(chips.length).toBeLessThanOrEqual(2)
  })

  it('snaps to half when handle is clicked while collapsed', async () => {
    const wrapper = mountDrawer()
    await wrapper.find('.cursor-grab').trigger('click')
    const style = wrapper.find('[style]').attributes('style')
    expect(style).toContain(`height: ${Math.round(812 * 0.5)}px`)
  })

  it('snaps back to collapsed when handle clicked while expanded', async () => {
    const wrapper = mountDrawer()
    await wrapper.find('.cursor-grab').trigger('click')
    await wrapper.find('.cursor-grab').trigger('click')
    const style = wrapper.find('[style]').attributes('style')
    expect(style).toContain('height: 80px')
  })

  it('snaps to half via "Ver todas" button', async () => {
    plateStore.addPlate(makePlate('1', 'ABC123'))
    const wrapper = mountDrawer()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Ver todas'))
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    const style = wrapper.find('[style]').attributes('style')
    expect(style).toContain(`height: ${Math.round(812 * 0.5)}px`)
  })

  it('renders slot content', () => {
    const wrapper = mountDrawer()
    expect(wrapper.find('[data-test="content"]').exists()).toBe(true)
  })

  it('snaps to nearest point on touchend near collapsed', async () => {
    const wrapper = mountDrawer()
    const root = wrapper.find('[style]')

    // Drag down from half-height snap to near collapsed
    await wrapper.find('.cursor-grab').trigger('click') // expand to half first
    await root.trigger('touchstart', { touches: [{ clientY: 100 }] })
    await root.trigger('touchmove', { touches: [{ clientY: 500 }] }) // drag down 400px
    await root.trigger('touchend')

    // liveH = half(406) - 400 = ~6px → snaps to collapsed (80px)
    const style = root.attributes('style')
    expect(style).toContain('height: 80px')
  })
})
