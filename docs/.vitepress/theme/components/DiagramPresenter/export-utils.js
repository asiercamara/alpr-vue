/**
 * export-utils.js
 * ==================================================================
 * Pure DOM utilities for exporting DiagramPresenter SVG content to
 * SVG and PNG files. No Vue or GSAP dependencies — testable in isolation.
 *
 * @module export-utils
 */

/** Properties to inline on SVG descendants for faithful export. */
const INLINE_PROPS = ['fill', 'stroke', 'stroke-width', 'color', 'font-family', 'font-size']

/** Tag names on which we inline computed styles. */
const RELEVANT_TAGS = new Set([
  'rect', 'polygon', 'circle', 'ellipse', 'path', 'text', 'foreignobject', 'g',
])

/**
 * Clone an SVG element with computed styles inlined on all relevant descendants.
 *
 * SVG blobs rendered outside the document do not have access to the page's
 * CSS custom properties (--dp-*, --vp-c-*), so we must inline them before
 * serializing. We walk all descendants rather than just the root because
 * Mermaid sometimes leaves fill/stroke unset on child shapes.
 *
 * @param {SVGSVGElement} svgEl - Live SVG element from the document.
 * @returns {SVGSVGElement} Cloned SVG node with styles inlined.
 */
export function inlineStylesForExport(svgEl) {
  const clone = svgEl.cloneNode(true)
  const originals = [...svgEl.querySelectorAll('*')]
  const clones = [...clone.querySelectorAll('*')]
  originals.forEach((orig, i) => {
    if (!RELEVANT_TAGS.has(orig.tagName.toLowerCase())) return
    const cs = getComputedStyle(orig)
    INLINE_PROPS.forEach(p => {
      const v = cs.getPropertyValue(p)
      if (v) clones[i].style.setProperty(p, v)
    })
  })
  return clone
}

/**
 * Trigger a browser file download for the given Blob.
 *
 * @param {Blob} blob
 * @param {string} filename
 * @returns {void}
 */
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: filename }).click()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

/**
 * Render an SVG string to a PNG via canvas and deliver the result via callbacks.
 *
 * Falls back silently to SVG if canvas becomes tainted — this happens in
 * Chrome when the SVG contains <foreignObject> elements (security restriction).
 *
 * @param {string} svgStr - Serialized SVG markup.
 * @param {number} width - Canvas width in pixels (use 2× for HiDPI).
 * @param {number} height - Canvas height in pixels.
 * @param {(blob: Blob) => void} onSuccess - Called with the PNG Blob on success.
 * @param {() => void} onFallback - Called when PNG export fails; caller should fall back to SVG.
 * @returns {void}
 */
export function exportSvgToPng(svgStr, width, height, onSuccess, onFallback) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }))
  const img = new Image()
  img.onload = () => {
    canvas.getContext('2d').drawImage(img, 0, 0, width, height)
    URL.revokeObjectURL(url)
    canvas.toBlob(b => {
      // A tiny or null blob indicates a tainted canvas (foreignObject security restriction)
      if (!b || b.size < 200) { onFallback(); return }
      onSuccess(b)
    }, 'image/png')
  }
  img.onerror = () => { URL.revokeObjectURL(url); onFallback() }
  img.src = url
}
