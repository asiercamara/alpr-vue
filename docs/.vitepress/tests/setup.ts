import { afterEach, beforeEach, vi } from 'vitest'
import {
  MockIntersectionObserver,
  MockMutationObserver,
  MockResizeObserver,
  createMermaidRendererSpy,
  defaultTheme,
  gsapFromSpy,
  gsapFromToSpy,
  gsapSetSpy,
  gsapTimelineSpy,
  gsapToSpy,
  mermaidInitializeSpy,
  mermaidRenderSpy,
  resetDocsMocks,
  vitepressData,
} from './mocks/runtime'

vi.mock('vitepress', () => ({
  useData: () => vitepressData,
}))

vi.mock('vitepress/theme', () => ({
  default: defaultTheme,
}))

vi.mock('vitepress-mermaid-renderer', () => ({
  createMermaidRenderer: createMermaidRendererSpy,
}))

vi.mock('mermaid', () => ({
  default: {
    initialize: mermaidInitializeSpy,
    render: mermaidRenderSpy,
  },
}))

vi.mock('gsap', () => ({
  gsap: {
    set: gsapSetSpy,
    from: gsapFromSpy,
    to: gsapToSpy,
    fromTo: gsapFromToSpy,
    timeline: gsapTimelineSpy,
  },
}))

beforeEach(() => {
  resetDocsMocks()
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn((callback: FrameRequestCallback) => {
    callback(0)
    return 1
  }),
})

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn(),
})

Object.defineProperty(window, 'MutationObserver', {
  writable: true,
  value: MockMutationObserver,
})

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
})

Object.defineProperty(globalThis, 'MutationObserver', {
  writable: true,
  value: MockMutationObserver,
})

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
})

Object.defineProperty(globalThis.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'blob:docs-test'),
})

Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
})

Object.defineProperty(SVGElement.prototype, 'getBBox', {
  writable: true,
  value: vi.fn(() => ({ x: 10, y: 20, width: 40, height: 30 })),
})

if (typeof SVGPathElement !== 'undefined') {
  Object.defineProperty(SVGPathElement.prototype, 'getTotalLength', {
    writable: true,
    value: vi.fn(() => 120),
  })
}

Object.defineProperty(Element.prototype, 'requestFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
})

Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
})
