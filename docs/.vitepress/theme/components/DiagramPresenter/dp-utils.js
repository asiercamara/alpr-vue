/**
 * dp-utils.js
 * ==================================================================
 * Pure utility functions shared across DiagramPresenter composables.
 * No Vue or GSAP dependencies — safe to import from any context.
 *
 * @module dp-utils
 */

/**
 * Returns true when the user has requested reduced motion via OS/browser settings.
 * Returns false in SSR (window unavailable).
 *
 * @returns {boolean}
 */
export function isReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Return the SVG-coordinate center of a <g> element as a GSAP svgOrigin string.
 * Required for correct pivot when scaling/rotating SVG groups with GSAP
 * (transformOrigin does not work correctly on SVG elements).
 *
 * @param {SVGGElement} gEl
 * @returns {string|undefined} e.g. "120 80", or undefined if getBBox fails.
 */
export function getNodeSvgOrigin(gEl) {
  try {
    const bb = gEl.getBBox()
    return `${bb.x + bb.width / 2} ${bb.y + bb.height / 2}`
  } catch {
    return undefined
  }
}

/**
 * Resolve the --dp-accent CSS custom property to a concrete color string.
 * GSAP cannot interpolate var() references in filter values, so we must
 * read the computed value and fall back to a safe default.
 *
 * @param {HTMLElement|null} el - Element whose computed styles to read.
 * @returns {string} Resolved hex/rgb color string.
 */
export function resolveAccentColor(el) {
  if (!el) return '#7c3aed'
  const cs = getComputedStyle(el)
  let v = cs.getPropertyValue('--dp-accent').trim()
  if (v && !v.startsWith('var(')) return v
  v = cs.getPropertyValue('--vp-c-brand-1').trim()
  if (v && !v.startsWith('var(')) return v
  return '#7c3aed'
}
