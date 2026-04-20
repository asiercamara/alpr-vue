import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramPhaseIndicator from '@docs-theme/components/DiagramPresenter/DiagramPhaseIndicator.vue'
import { gsapToSpy } from '@docs-tests/mocks/runtime'

describe('DiagramPhaseIndicator', () => {
  it('renders one dot per phase and updates active state', async () => {
    const wrapper = mount(DiagramPhaseIndicator, {
      props: {
        total: 3,
        currentIndex: 0,
      },
    })

    expect(wrapper.findAll('.dp-phase-dot')).toHaveLength(3)
    expect(wrapper.findAll('.dp-phase-dot--active')).toHaveLength(1)

    await wrapper.setProps({ currentIndex: 1 })

    expect(wrapper.findAll('.dp-phase-dot--done')).toHaveLength(1)
    expect(wrapper.findAll('.dp-phase-dot--active')).toHaveLength(1)
    expect(gsapToSpy).toHaveBeenCalledTimes(2)
  })

  it('does not render anything when total is zero', () => {
    const wrapper = mount(DiagramPhaseIndicator, {
      props: {
        total: 0,
        currentIndex: -1,
      },
    })

    expect(wrapper.find('.dp-phase-indicator').exists()).toBe(false)
  })
})
