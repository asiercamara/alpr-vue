import { describe, expect, it, vi } from 'vitest'

import {
  getNodeSvgOrigin,
  isReducedMotion,
  resolveAccentColor,
} from '@docs-theme/components/DiagramPresenter/dp-utils.ts'

describe('dp-utils', () => {
  it('reads reduced motion preference from matchMedia', () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    expect(isReducedMotion()).toBe(true)
  })

  it('derives svg origin from the element bounding box center', () => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    expect(getNodeSvgOrigin(node)).toBe('30 35')
  })

  it('returns undefined when getBBox fails', () => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    vi.spyOn(node, 'getBBox').mockImplementationOnce(() => {
      throw new Error('No bbox')
    })

    expect(getNodeSvgOrigin(node)).toBeUndefined()
  })

  it('resolves accent color from custom property fallback chain', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === '--dp-accent') return 'var(--vp-c-brand-1)'
        if (prop === '--vp-c-brand-1') return 'rgb(124, 58, 237)'
        return ''
      },
    } as CSSStyleDeclaration)

    expect(resolveAccentColor(el)).toBe('rgb(124, 58, 237)')
    expect(resolveAccentColor(null)).toBe('#7c3aed')
  })
})
