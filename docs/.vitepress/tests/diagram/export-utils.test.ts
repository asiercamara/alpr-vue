import { describe, expect, it, vi } from 'vitest'

import {
  exportSvgToPng,
  inlineStylesForExport,
  triggerDownload,
} from '@docs-theme/components/DiagramPresenter/export-utils.js'

describe('export-utils', () => {
  it('clones SVG and inlines computed styles on relevant descendants', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    svg.appendChild(rect)

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === 'fill') return 'rgb(1, 2, 3)'
        if (prop === 'stroke') return 'rgb(4, 5, 6)'
        return ''
      },
    } as CSSStyleDeclaration)

    const clone = inlineStylesForExport(svg)
    const clonedRect = clone.querySelector('rect')

    expect(clone).not.toBe(svg)
    expect(clonedRect?.style.getPropertyValue('fill')).toBe('rgb(1, 2, 3)')
    expect(clonedRect?.style.getPropertyValue('stroke')).toBe('rgb(4, 5, 6)')
  })

  it('creates a temporary download link for blobs', () => {
    const clickSpy = vi.fn()
    const anchor = document.createElement('a')
    vi.spyOn(anchor, 'click').mockImplementation(clickSpy)
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    vi.useFakeTimers()

    triggerDownload(new Blob(['content']), 'diagram.svg')

    expect(anchor.download).toBe('diagram.svg')
    expect(anchor.href).toBe('blob:docs-test')
    expect(clickSpy).toHaveBeenCalled()

    vi.runAllTimers()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:docs-test')
    vi.useRealTimers()
  })

  it('exports svg to png and invokes success callback with blob', () => {
    const drawImage = vi.fn()
    const canvas = document.createElement('canvas')
    Object.defineProperty(canvas, 'getContext', {
      writable: true,
      value: vi.fn(() => ({ drawImage })),
    })
    Object.defineProperty(canvas, 'toBlob', {
      writable: true,
      value: vi.fn((callback: BlobCallback) => {
        callback?.(new Blob(['x'.repeat(256)], { type: 'image/png' }))
      }),
    })
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') return canvas
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as never
    })

    const successSpy = vi.fn()
    const fallbackSpy = vi.fn()
    class MockImage {
      onload: undefined | (() => void)
      onerror: undefined | (() => void)

      set src(_value: string) {
        this.onload?.()
      }
    }
    vi.stubGlobal('Image', MockImage)

    exportSvgToPng('<svg />', 200, 120, successSpy, fallbackSpy)

    expect(drawImage).toHaveBeenCalled()
    expect(successSpy).toHaveBeenCalledTimes(1)
    expect(fallbackSpy).not.toHaveBeenCalled()
  })

  it('falls back when png blob is null or too small', () => {
    const canvas = document.createElement('canvas')
    Object.defineProperty(canvas, 'getContext', {
      writable: true,
      value: vi.fn(() => ({ drawImage: vi.fn() })),
    })
    Object.defineProperty(canvas, 'toBlob', {
      writable: true,
      value: vi.fn((callback: BlobCallback) => {
        callback?.(new Blob(['x'], { type: 'image/png' }))
      }),
    })
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') return canvas
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as never
    })

    const successSpy = vi.fn()
    const fallbackSpy = vi.fn()
    class MockImage {
      onload: undefined | (() => void)
      onerror: undefined | (() => void)

      set src(_value: string) {
        this.onload?.()
      }
    }
    vi.stubGlobal('Image', MockImage)

    exportSvgToPng('<svg />', 200, 120, successSpy, fallbackSpy)

    expect(successSpy).not.toHaveBeenCalled()
    expect(fallbackSpy).toHaveBeenCalledTimes(1)
  })
})
