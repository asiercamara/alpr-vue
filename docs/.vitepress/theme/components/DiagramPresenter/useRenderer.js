/**
 * useRenderer.js
 * ==================================================================
 * Composable that handles Mermaid initialization, SVG rendering, and
 * adapter selection for DiagramPresenter.
 *
 * Responsibilities:
 *   - Build Mermaid themeVariables for light/dark modes.
 *   - Call mermaid.render() and inject the resulting SVG.
 *   - Pick and run the correct diagram adapter via pickAdapter().
 *   - Emit Vue events: 'ready', and surface errors as inline pre blocks.
 *
 * @module useRenderer
 */

import mermaid from 'mermaid'
import { nextTick } from 'vue'
import { pickAdapter } from './diagram-adapters.js'

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

/**
 * Escape special HTML characters in a string.
 *
 * @param {string} s - Raw string that may contain `&`, `<`, or `>`.
 * @returns {string} HTML-safe string.
 */
export function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
}

/**
 * Build Mermaid `themeVariables` for the given color scheme.
 *
 * Mermaid's color parser only accepts concrete hex/rgb values — CSS custom
 * properties and `currentColor` are not supported, so we supply explicit hex.
 *
 * @param {boolean} dark - `true` to return dark-mode variables.
 * @returns {object} A plain object suitable for `mermaid.initialize({ themeVariables })`.
 */
export function getMermaidTheme(dark) {
  if (dark) {
    return {
      fontFamily: 'Inter, system-ui, sans-serif',
      primaryColor: '#1e293b',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#475569',
      lineColor: '#94a3b8',
      secondaryColor: '#0f172a',
      tertiaryColor: '#1e293b',
      background: '#0f172a',
      mainBkg: '#1e293b',
      nodeBorder: '#475569',
      clusterBkg: '#0f172a',
      titleColor: '#f1f5f9',
      edgeLabelBackground: '#1e293b',
      fontSize: '14px',
    }
  }
  return {
    fontFamily: 'Inter, system-ui, sans-serif',
    primaryColor: '#f1f5f9',
    primaryTextColor: '#1e293b',
    primaryBorderColor: '#94a3b8',
    lineColor: '#64748b',
    secondaryColor: '#e2e8f0',
    tertiaryColor: '#f8fafc',
    background: '#ffffff',
    mainBkg: '#f1f5f9',
    nodeBorder: '#94a3b8',
    clusterBkg: '#f8fafc',
    titleColor: '#0f172a',
    edgeLabelBackground: '#f8fafc',
    fontSize: '14px',
  }
}

/* ----------------------------------------------------------------
 * Composable
 * ---------------------------------------------------------------- */

/**
 * Provides the `render` function for a DiagramPresenter instance.
 *
 * @param {object} options
 * @param {import('vue').Ref<HTMLElement|null>} options.container - The inline stage div ref.
 * @param {import('vue').Ref<HTMLElement|null>} options.modalContainer - The modal stage div ref.
 * @param {import('vue').Ref<boolean>} options.isDark - VitePress dark-mode signal.
 * @param {import('vue').Ref<boolean>} options.isMaximized - Whether the modal is open.
 * @param {object} options.props - Component props (code, autoPlay, highlight, flowchart options…).
 * @param {object} options.state - Reactive state refs to update: `{ ready, adapterLabel }`.
 * @param {Function} options.onAdapterReady - Called with `(adapter, prepared)` after SVG is ready.
 * @param {Function} options.onAutoPlay - Called with the resolved autoPlay mode once ready.
 * @param {Function} options.emitReady - `emit('ready', payload)` forwarded from the component.
 * @param {Function} options.onError - Called when rendering fails; receives `(errorMessage)`.
 * @returns {{ render: () => Promise<void> }}
 */
export function useRenderer({
  container,
  modalContainer,
  isDark,
  isMaximized,
  props,
  state,
  onAdapterReady,
  onAutoPlay,
  emitReady,
  onError,
}) {
  /**
   * Render the Mermaid diagram into `container`.
   *
   * Initializes Mermaid with the current theme, renders the `props.code` source
   * to SVG, picks the right adapter, calls `adapter.prepare()`, updates reactive
   * state, and delegates autoPlay/highlight logic to `onAutoPlay`.
   *
   * @returns {Promise<void>}
   */
  async function render() {
    if (!container.value) return

    // If the SVG lives in the modal canvas, move it back before re-rendering
    if (isMaximized.value) {
      const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
      const svgEl = canvas?.querySelector('svg')
      if (svgEl) container.value.appendChild(svgEl)
    }

    state.ready.value = false

    const dark = isDark.value
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      flowchart: {
        curve: 'basis',
        htmlLabels: true,
        nodeSpacing: 70,
        rankSpacing: 90,
        wrappingWidth: 320,
      },
      stateDiagram: { useMaxWidth: false },
      sequence: { useMaxWidth: false, mirrorActors: false },
      themeVariables: getMermaidTheme(dark),
    })

    try {
      const id = 'dp-' + Math.random().toString(36).slice(2, 10)
      const { svg } = await mermaid.render(id, props.code.trim())
      container.value.innerHTML = svg
      await nextTick()

      const svgEl = container.value.querySelector('svg')
      if (!svgEl) return

      svgEl.removeAttribute('style')
      svgEl.style.maxWidth = '100%'
      svgEl.style.height = 'auto'

      const adapter = pickAdapter(svgEl)
      const prepared = adapter.prepare(svgEl)
      state.adapterLabel.value = adapter.label || adapter.name

      onAdapterReady(adapter, prepared)

      state.ready.value = true
      emitReady({
        adapter: adapter.name,
        nodes: prepared.nodes.length,
        edges: prepared.edges.length,
        phases: prepared.phases.length,
      })

      onAutoPlay(props.autoPlay)

      // If the modal was open during a re-render, put the new SVG back
      if (isMaximized.value) {
        await nextTick()
        const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
        const newSvg = container.value?.querySelector('svg')
        if (canvas && newSvg) canvas.appendChild(newSvg)
      }
    } catch (err) {
      container.value.innerHTML = `<pre class="dp-error">${escapeHtml(err?.message || String(err))}</pre>`
      console.error('[DiagramPresenter]', err)
      onError?.(err?.message || String(err))
    }
  }

  return { render }
}
