import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import DiagramPresenter from '@docs-theme/components/DiagramPresenter/DiagramPresenter.vue'

describe('DiagramPresenter', () => {
  it('renders a diagram, emits ready and shows caption/badge', async () => {
    const wrapper = mount(DiagramPresenter, {
      attachTo: document.body,
      props: {
        code: 'flowchart TD\nA-->B',
        caption: 'Preview diagram',
        controls: true,
      },
    })

    await nextTick()
    await nextTick()

    expect(wrapper.find('.dp-stage-canvas svg').exists()).toBe(true)
    expect(wrapper.find('.dp-caption').text()).toBe('Preview diagram')
    expect(wrapper.emitted('ready')).toBeTruthy()
  })
})
