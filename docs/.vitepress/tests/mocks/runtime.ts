import { ref } from 'vue'
import { vi } from 'vitest'

export const vitepressData = {
  isDark: ref(false),
  frontmatter: ref<Record<string, unknown>>({}),
  page: ref({ relativePath: 'index.md' }),
  site: ref({ title: 'ALPR Vue' }),
  theme: ref<Record<string, unknown>>({}),
  title: ref('ALPR Vue'),
}

export const defaultTheme = {
  Layout: {
    name: 'MockDefaultThemeLayout',
    template: '<div class="mock-default-theme-layout"><slot name="doc-before" /></div>',
  },
}

export const mermaidToolbarSpy = vi.fn()
export const mermaidRendererInstances: Array<{ setToolbar: typeof mermaidToolbarSpy }> = []
export const createMermaidRendererSpy = vi.fn(() => {
  const instance = {
    setToolbar: vi.fn(),
  }
  mermaidRendererInstances.push(instance)
  mermaidToolbarSpy.mockImplementation(instance.setToolbar)
  return instance
})

export const mermaidInitializeSpy = vi.fn()
export const mermaidRenderSpy = vi.fn(async () => ({
  svg: `
    <svg class="flowchart" viewBox="0 0 100 80">
      <g class="node" id="flowchart-A-1" data-id="A"><rect width="40" height="20" /></g>
      <g class="edgePath LS-A LE-B"><path class="flowchart-link" /></g>
    </svg>
  `,
}))

export const gsapSetSpy = vi.fn()
export const gsapFromSpy = vi.fn((target, vars = {}) => {
  vars.onComplete?.()
  return { kill: vi.fn(), target, vars }
})
export const gsapToSpy = vi.fn((target, vars = {}) => {
  vars.onComplete?.()
  return { kill: vi.fn(), target, vars }
})
export const gsapFromToSpy = vi.fn((target, fromVars = {}, toVars = {}) => {
  toVars.onComplete?.()
  return { kill: vi.fn(), target, fromVars, toVars }
})
export const gsapTimelineSpy = vi.fn((options = {}) => {
  const timeline = {
    to: vi.fn().mockReturnThis(),
    fromTo: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    kill: vi.fn(),
    pause: vi.fn().mockReturnThis(),
    resume: vi.fn().mockReturnThis(),
    play: vi.fn().mockReturnThis(),
    restart: vi.fn().mockReturnThis(),
    progress: vi.fn().mockReturnValue(0),
    seek: vi.fn().mockReturnThis(),
    eventCallback: vi.fn().mockReturnThis(),
  }
  options.onComplete?.()
  return timeline
})

export const mutationObserverInstances: MockMutationObserver[] = []
export const intersectionObserverInstances: MockIntersectionObserver[] = []
export const resizeObserverInstances: MockResizeObserver[] = []

export class MockMutationObserver {
  callback: MutationCallback

  constructor(callback: MutationCallback) {
    this.callback = callback
    mutationObserverInstances.push(this)
  }

  observe = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])

  trigger(mutations: MutationRecord[]) {
    this.callback(mutations, this as unknown as MutationObserver)
  }
}

export class MockIntersectionObserver {
  callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    intersectionObserverInstances.push(this)
  }

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])

  trigger(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this as unknown as IntersectionObserver)
  }
}

export class MockResizeObserver {
  callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    resizeObserverInstances.push(this)
  }

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

export function resetDocsMocks() {
  vitepressData.isDark.value = false
  vitepressData.frontmatter.value = {}
  vitepressData.page.value = { relativePath: 'index.md' }
  vitepressData.site.value = { title: 'ALPR Vue' }
  vitepressData.theme.value = {}
  vitepressData.title.value = 'ALPR Vue'
  mermaidToolbarSpy.mockReset()
  createMermaidRendererSpy.mockClear()
  mermaidRendererInstances.length = 0
  mermaidInitializeSpy.mockClear()
  mermaidRenderSpy.mockClear()
  gsapSetSpy.mockClear()
  gsapFromSpy.mockClear()
  gsapToSpy.mockClear()
  gsapFromToSpy.mockClear()
  gsapTimelineSpy.mockClear()
  mutationObserverInstances.length = 0
  intersectionObserverInstances.length = 0
  resizeObserverInstances.length = 0
}
