import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import DiagramViewportMap from '@docs-theme/components/DiagramPresenter/DiagramViewportMap.vue'

describe('DiagramViewportMap', () => {
  it('renders the minimap frame, viewport and cloned svg when visible', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgEl.setAttribute('viewBox', '0 0 200 100')
    svgEl.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'rect'))

    const wrapper = mount(DiagramViewportMap, {
      props: {
        viewportNorm: { nx: 0.1, ny: 0.2, nw: 0.3, nh: 0.4 },
        svgW: 200,
        svgH: 100,
        svgEl,
        zoom: 1.5,
        visible: false,
      },
    })

    await wrapper.setProps({ visible: true })
    await nextTick()

    expect(wrapper.find('.dp-vmap').exists()).toBe(true)
    expect(wrapper.find('.dp-vmap-label').text()).toBe('1.5×')
    expect(wrapper.find('.dp-vmap-viewport').attributes('style')).toContain('left: 10%')
    expect(wrapper.find('.dp-vmap-viewport').attributes('style')).toContain('height: 40%')
    expect(wrapper.find('.dp-vmap-svg svg').exists()).toBe(true)
  })

  it('stays hidden when not visible or dimensions are invalid', () => {
    const wrapper = mount(DiagramViewportMap, {
      props: {
        viewportNorm: { nx: 0, ny: 0, nw: 1, nh: 1 },
        svgW: 0,
        svgH: 100,
        svgEl: null,
        zoom: 1,
        visible: false,
      },
    })

    expect(wrapper.find('.dp-vmap').exists()).toBe(false)
  })
})
