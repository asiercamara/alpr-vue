import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import {
  createMermaidRendererSpy,
  mermaidRendererInstances,
  mutationObserverInstances,
  vitepressData,
} from '@docs-tests/mocks/runtime'

describe('docs theme bootstrap', () => {
  async function loadTheme() {
    vi.resetModules()
    return (await import('@docs-theme/index.ts')).default
  }

  it('registers all global theme components', async () => {
    const theme = await loadTheme()
    const app = {
      component: vi.fn(),
    }

    theme.enhanceApp({ app } as never)

    expect(app.component).toHaveBeenCalledTimes(15)
    expect(app.component).toHaveBeenCalledWith('CardGroup', expect.anything())
    expect(app.component).toHaveBeenCalledWith('DiagramPresenter', expect.anything())
    expect(app.component).toHaveBeenCalledWith('DiagramPlayground', expect.anything())
  })

  it('initializes Mermaid renderer and reacts to dark mode changes', async () => {
    const theme = await loadTheme()
    const LayoutHarness = defineComponent({
      setup() {
        return () => theme.Layout()
      },
    })

    mount(LayoutHarness)
    await nextTick()
    await nextTick()

    expect(createMermaidRendererSpy).toHaveBeenCalledTimes(1)
    expect(createMermaidRendererSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ theme: 'default' }),
    )
    expect(mermaidRendererInstances[0].setToolbar).toHaveBeenCalledTimes(1)

    vitepressData.isDark.value = true
    await nextTick()
    await nextTick()

    expect(createMermaidRendererSpy).toHaveBeenCalledTimes(2)
    expect(createMermaidRendererSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ theme: 'dark' }),
    )
  })

  it('autofits fullscreen mermaid dialogs by clicking reset view once', async () => {
    const theme = await loadTheme()
    const LayoutHarness = defineComponent({
      setup() {
        return () => theme.Layout()
      },
    })

    mount(LayoutHarness, { attachTo: document.body })
    await nextTick()
    await nextTick()

    const container = document.createElement('div')
    container.className = 'mermaid-container dialog-fullscreen-active'
    const resetButton = document.createElement('button')
    resetButton.title = 'Reset View'
    const clickSpy = vi.spyOn(resetButton, 'click')
    const desktopControls = document.createElement('div')
    desktopControls.className = 'desktop-controls'
    desktopControls.appendChild(resetButton)
    container.appendChild(desktopControls)
    document.body.appendChild(container)

    mutationObserverInstances[0].trigger([
      {
        type: 'attributes',
        target: container,
      } as MutationRecord,
    ])

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(container.dataset.autofitApplied).toBe('true')

    mutationObserverInstances[0].trigger([
      {
        type: 'attributes',
        target: container,
      } as MutationRecord,
    ])

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})
