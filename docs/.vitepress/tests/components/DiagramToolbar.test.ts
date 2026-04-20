import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramToolbar from '@docs-theme/components/DiagramPresenter/DiagramToolbar.vue'

const baseProps = {
  canStart: true,
  isPlaying: false,
  isPaused: false,
  speedLabel: '1×',
  currentSpeed: 'normal',
  isLooping: false,
  ready: true,
}

describe('DiagramToolbar', () => {
  it('emits standard toolbar actions in inline mode', async () => {
    const wrapper = mount(DiagramToolbar, {
      props: {
        ...baseProps,
        showBadge: true,
        adapterLabel: 'Flowchart',
      },
    })

    expect(wrapper.find('.dp-badge').text()).toBe('Flowchart')

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    await buttons[3].trigger('click')
    await buttons[4].trigger('click')

    expect(wrapper.emitted('play')).toHaveLength(1)
    expect(wrapper.emitted('cycleSpeed')).toHaveLength(1)
    expect(wrapper.emitted('toggleLoop')).toHaveLength(1)
    expect(wrapper.emitted('reset')).toHaveLength(1)
    expect(wrapper.emitted('maximize')).toHaveLength(1)
  })

  it('shows phase navigation controls instead of play button', async () => {
    const wrapper = mount(DiagramToolbar, {
      props: {
        ...baseProps,
        phaseNav: true,
        canPrev: true,
        canNext: false,
      },
    })

    const phaseButtons = wrapper.findAll('.dp-controls button')
    expect(phaseButtons).toHaveLength(2)
    expect(wrapper.find('[aria-label="Reproducir"]').exists()).toBe(false)
    expect(phaseButtons[1].attributes('disabled')).toBeDefined()

    await phaseButtons[0].trigger('click')

    expect(wrapper.emitted('prevPhase')).toHaveLength(1)
  })

  it('shows modal-only controls and pause toggle while playing', async () => {
    const wrapper = mount(DiagramToolbar, {
      props: {
        ...baseProps,
        isModal: true,
        isPlaying: true,
        isPaused: true,
      },
    })

    expect(wrapper.find('[title="Exportar SVG"]').exists()).toBe(true)
    expect(wrapper.find('[title="Restablecer zoom"]').exists()).toBe(true)
    expect(wrapper.find('[title="Cerrar (Esc)"]').exists()).toBe(true)

    await wrapper.find('[title="Reanudar"]').trigger('click')
    await wrapper.find('[title="Exportar SVG"]').trigger('click')
    await wrapper.find('[title="Restablecer zoom"]').trigger('click')
    await wrapper.find('[title="Cerrar (Esc)"]').trigger('click')

    expect(wrapper.emitted('togglePause')).toHaveLength(1)
    expect(wrapper.emitted('export')).toHaveLength(1)
    expect(wrapper.emitted('resetZoom')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
