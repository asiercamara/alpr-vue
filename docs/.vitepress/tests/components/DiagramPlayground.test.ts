import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import DiagramPlayground from '@docs-theme/components/DiagramPlayground.vue'

const DiagramPresenterStub = defineComponent({
  name: 'DiagramPresenter',
  props: {
    caption: { type: String, default: '' },
  },
  setup(props, { expose }) {
    expose({
      play: () => undefined,
      reset: () => undefined,
      exportDiagram: () => undefined,
    })

    return () => h('div', { class: 'diagram-presenter-stub' }, props.caption || 'DiagramPresenter')
  },
})

describe('DiagramPlayground', () => {
  it('mounts with the default preset and renders preview sections', async () => {
    const wrapper = mount(DiagramPlayground, {
      attachTo: document.body,
      global: {
        components: {
          DiagramPresenter: DiagramPresenterStub,
        },
      },
    })

    await nextTick()
    await nextTick()

    expect(wrapper.find('.preview-title').text()).toBe('Interactive preview')
    expect(wrapper.findAllComponents({ name: 'DiagramPresenter' }).length).toBeGreaterThan(0)
    expect(wrapper.find('.preset-btn.active').text()).toContain('Balanced')
  })

  it('applies the phase-nav preset and disables autoplay controls', async () => {
    const wrapper = mount(DiagramPlayground, {
      attachTo: document.body,
      global: {
        components: {
          DiagramPresenter: DiagramPresenterStub,
        },
      },
    })

    await wrapper.findAll('.preset-btn')[1].trigger('click')
    await nextTick()

    const autoPlaySelect = wrapper.find('select.field-select:disabled')

    expect(wrapper.find('.preset-btn.active').text()).toContain('Phase nav')
    expect(autoPlaySelect.exists()).toBe(true)
    expect(wrapper.text()).toContain('phaseNav uses manual step controls')
  })
})
