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

  it.each([
    [1, 'high'],
    [0.9, 'high'],
    [0.89, 'good'],
    [0.75, 'good'],
    [0.74, 'mid'],
    [0.6, 'mid'],
    [0.59, 'low'],
    [0.45, 'low'],
    [0.44, 'poor'],
    [0, 'poor'],
  ])('colours a value of %s as %s confidence', (value, level) => {
    const wrapper = mount(ConfidenceRing, { props: { value } })
    const arc = wrapper.findAll('circle').find((c) => c.attributes('stroke-dasharray'))

    expect(arc!.attributes('stroke')).toBe(`var(--color-conf-${level})`)
    expect(wrapper.get('span').attributes('style')).toContain(`var(--color-conf-${level})`)
    expect(wrapper.text()).toBe(String(Math.round(value * 100)))
  })

  it('updates when value prop changes', async () => {
    const wrapper = mount(ConfidenceRing, { props: { value: 0.5 } })
    expect(wrapper.text()).toContain('50')
    await wrapper.setProps({ value: 0.9 })
    expect(wrapper.text()).toContain('90')
  })
})
