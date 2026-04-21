/**
 * useRenderer
 * ==================================================================
 * Composable that handles Mermaid initialization, SVG rendering, and
 * adapter selection for DiagramPresenter.
 *
 * Responsibilities:
 *   - Build Mermaid themeVariables for light/dark modes.
 *   - Call mermaid.render() and inject the resulting SVG.
 *   - Pick and run the correct diagram adapter via pickAdapter().
 *   - Emit Vue events: 'ready', and surface errors as inline pre blocks.
 */

import mermaid from 'mermaid'
import { nextTick, type Ref } from 'vue'
import { pickAdapter, type Adapter, type PreparedData } from './diagram-adapters.ts'

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

export function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c)
}

/**
 * Build Mermaid `themeVariables` for the given color scheme.
 *
 * Mermaid's color parser only accepts concrete hex/rgb values — CSS custom
 * properties and `currentColor` are not supported, so we supply explicit hex.
 */
export function getMermaidTheme(dark: boolean): Record<string, string> {
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
  // Read the brand color at runtime so Mermaid stays in sync with the VitePress
  // theme (style.css may override --vp-c-brand-1). Mermaid's color parser only
  // accepts concrete hex/rgb values — CSS custom properties are not supported.
  const accent =
    typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--vp-c-brand-1').trim() ||
        '#7c3aed'
      : '#7c3aed'
  return {
    fontFamily: 'Inter, system-ui, sans-serif',
    primaryColor: '#f5f3ff',
    primaryTextColor: '#1e1b4b',
    primaryBorderColor: accent,
    lineColor: accent,
    secondaryColor: '#ede9fe',
    tertiaryColor: '#f5f3ff',
    background: '#ffffff',
    mainBkg: '#f5f3ff',
    nodeBorder: accent,
    clusterBkg: '#f5f3ff',
    titleColor: '#1e1b4b',
    edgeLabelBackground: '#faf9ff',
    fontSize: '14px',
  }
}

/* ----------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------- */

interface RendererState {
  ready: Ref<boolean>
  adapterLabel: Ref<string>
}

interface RendererProps {
  code: string
  autoPlay: string
  highlight?: string[]
  [key: string]: unknown
}

interface UseRendererOptions {
  container: Ref<HTMLElement | null>
  modalContainer: Ref<HTMLElement | null>
  isDark: Ref<boolean>
  isMaximized: Ref<boolean>
  props: RendererProps
  state: RendererState
  onAdapterReady: (adapter: Adapter, prepared: PreparedData) => void
  onAutoPlay: (mode: string) => void
  emitReady: (payload: { adapter: string; nodes: number; edges: number; phases: number }) => void
  onError?: (message: string) => void
}

/* ----------------------------------------------------------------
 * Composable
 * ---------------------------------------------------------------- */

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
}: UseRendererOptions) {
  async function render(): Promise<void> {
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

      const svgEl = container.value.querySelector('svg') as SVGSVGElement | null
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

      if (isMaximized.value) {
        await nextTick()
        const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
        const newSvg = container.value?.querySelector('svg')
        if (canvas && newSvg) canvas.appendChild(newSvg)
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err)
      container.value.innerHTML = `<pre class="dp-error">${escapeHtml(msg)}</pre>`
      console.error('[DiagramPresenter]', err)
      onError?.(msg)
    }
  }

  return { render }
}
