import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { usePlateStore } from '@/stores/plateStore'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import type { PlateTextResult } from '@/types/detection'

vi.useFakeTimers()

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

describe('ToastNotification', () => {
  let plateStore: ReturnType<typeof usePlateStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    plateStore = usePlateStore()
    vi.clearAllTimers()
  })

  const mountToast = () =>
    mount(ToastNotification, {
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
        },
      },
    })

  it('is not visible initially', () => {
    const wrapper = mountToast()
    // v-if="visible" starts as false
    expect(wrapper.text()).toBe('')
  })

  it('shows plate text when a new plate is detected', async () => {
    const wrapper = mountToast()
    plateStore.addPlate(makePlate('1', 'ABC123'))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('ABC123')
    expect(wrapper.text()).toContain('detectada')
  })

  it('hides automatically after 2500ms', async () => {
    const wrapper = mountToast()
    plateStore.addPlate(makePlate('1', 'XYZ789'))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('XYZ789')

    vi.advanceTimersByTime(2500)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('')
  })

  it('resets timer when a new plate is detected while toast is visible', async () => {
    const wrapper = mountToast()
    plateStore.addPlate(makePlate('1', 'AAA111'))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('AAA111')

    // Advance partially, then detect a second plate
    vi.advanceTimersByTime(1500)
    plateStore.addPlate(makePlate('2', 'BBB222'))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('BBB222')

    // After only 2500ms from the second detection it should still be visible at 1000ms past
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('BBB222')

    // Now 2500ms have passed since second detection
    vi.advanceTimersByTime(1500)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('')
  })

  it('does not show when plates are cleared (count decreases)', async () => {
    const wrapper = mountToast()
    plateStore.addPlate(makePlate('1', 'AAA111'))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(2500)
    await wrapper.vm.$nextTick()

    // Clearing should not trigger the toast
    plateStore.clearPlates()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('')
  })
})
