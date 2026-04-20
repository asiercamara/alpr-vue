import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import {
  escapeHtml,
  getMermaidTheme,
  useRenderer,
} from '@docs-theme/components/DiagramPresenter/useRenderer.js'
import { mermaidInitializeSpy, mermaidRenderSpy } from '@docs-tests/mocks/runtime'

describe('useRenderer', () => {
  it('escapes html error content safely', () => {
    expect(escapeHtml('<bad & worse>')).toBe('&lt;bad &amp; worse&gt;')
  })

  it('builds Mermaid theme variables for dark and light mode', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => (prop === '--vp-c-brand-1' ? '#7c3aed' : ''),
    } as CSSStyleDeclaration)

    expect(getMermaidTheme(true).background).toBe('#0f172a')
    expect(getMermaidTheme(false).primaryBorderColor).toBe('#7c3aed')
  })

  it('renders a diagram, prepares the adapter and emits ready payload', async () => {
    const container = ref(document.createElement('div'))
    const modalContainer = ref(document.createElement('div'))
    const state = {
      ready: ref(false),
      adapterLabel: ref(''),
    }
    const onAdapterReady = vi.fn()
    const onAutoPlay = vi.fn()
    const emitReady = vi.fn()

    const { render } = useRenderer({
      container,
      modalContainer,
      isDark: ref(false),
      isMaximized: ref(false),
      props: {
        code: 'flowchart TD\nA-->B',
        autoPlay: 'all',
      },
      state,
      onAdapterReady,
      onAutoPlay,
      emitReady,
    })

    await render()
    await nextTick()

    expect(mermaidInitializeSpy).toHaveBeenCalledTimes(1)
    expect(mermaidRenderSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^dp-/),
      'flowchart TD\nA-->B',
    )
    expect(container.value.querySelector('svg')).not.toBeNull()
    expect(state.ready.value).toBe(true)
    expect(state.adapterLabel.value).toBe('Flowchart')
    expect(onAdapterReady).toHaveBeenCalledTimes(1)
    expect(emitReady).toHaveBeenCalledWith({
      adapter: 'flowchart',
      nodes: 1,
      edges: 1,
      phases: 2,
    })
    expect(onAutoPlay).toHaveBeenCalledWith('all')
  })

  it('renders error output and forwards error details when Mermaid fails', async () => {
    mermaidRenderSpy.mockRejectedValueOnce(new Error('<boom & fail>'))

    const container = ref(document.createElement('div'))
    const onError = vi.fn()
    const { render } = useRenderer({
      container,
      modalContainer: ref(document.createElement('div')),
      isDark: ref(false),
      isMaximized: ref(false),
      props: {
        code: 'broken',
        autoPlay: 'none',
      },
      state: {
        ready: ref(false),
        adapterLabel: ref(''),
      },
      onAdapterReady: vi.fn(),
      onAutoPlay: vi.fn(),
      emitReady: vi.fn(),
      onError,
    })

    await render()

    expect(container.value.innerHTML).toContain('&lt;boom &amp; fail&gt;')
    expect(onError).toHaveBeenCalledWith('<boom & fail>')
  })
})
