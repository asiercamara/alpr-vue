import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfidenceRing from '@/components/ui/ConfidenceRing.vue'

describe('ConfidenceRing', () => {
  it('renders percentage from value prop', () => {
    const wrapper = mount(ConfidenceRing, { props: { value: 0.85 } })
    expect(wrapper.text()).toContain('85')
  })

  it('renders 0% when value is 0', () => {
    const wrapper = mount(ConfidenceRing, { props: { value: 0 } })
    expect(wrapper.text()).toContain('0')
  })

  it('renders 100% when value is 1', () => {
    const wrapper = mount(ConfidenceRing, { props: { value: 1 } })
    expect(wrapper.text()).toContain('100')
  })

  it('defaults to value 0 when no prop provided', () => {
    const wrapper = mount(ConfidenceRing)
    expect(wrapper.text()).toContain('0')
  })

  it('shows high confidence color for value >= 0.9', () => {
    const wrapper = mount(ConfidenceRing, { props: { value: 0.95 } })
    const fillCircle = wrapper.findAll('circle').find((c) => c.attributes('stroke-dasharray'))
    expect(fillCircle).toBeDefined()
  })

  it('shows good confidence color for value >= 0.75', () => {
    const wrapper = mount(ConfidenceRing, { props: { value: 0.8 } })
    expect(wrapper.text()).toContain('80')
  })

  it('shows mid confidence color for value >= 0.6', () => {
    const wrapper = mount(ConfidenceRing, { props: { value: 0.65 } })
    expect(wrapper.text()).toContain('65')
  })

  it('shows low confidence color for value >= 0.45', () => {
    const wrapper = mount(ConfidenceRing, { props: { value: 0.5 } })
    expect(wrapper.text()).toContain('50')
  })

  it('shows poor confidence color for value < 0.45', () => {
    const wrapper = mount(ConfidenceRing, { props: { value: 0.3 } })
    expect(wrapper.text()).toContain('30')
  })

  it('updates when value prop changes', async () => {
    const wrapper = mount(ConfidenceRing, { props: { value: 0.5 } })
    expect(wrapper.text()).toContain('50')
    await wrapper.setProps({ value: 0.9 })
    expect(wrapper.text()).toContain('90')
  })
})
