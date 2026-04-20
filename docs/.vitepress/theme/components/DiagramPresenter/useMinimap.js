/**
 * useMinimap.js
 * ==================================================================
 * Derives the visible viewport rectangle from the current pan/zoom
 * state of the fullscreen modal in DiagramPresenter.
 *
 * The modal stage flex-centers the canvas div (which wraps the SVG)
 * and applies:
 *
 *   transform: translate(panX, panY) scale(zoom)
 *   transformOrigin: 50% 50%
 *
 * Coordinate derivation
 * ---------------------
 * With the canvas initially centered in the stage, the top-left of
 * the scaled canvas in stage-space is:
 *
 *   canvasLeft = stageW/2 + panX – (svgW × zoom) / 2
 *   canvasTop  = stageH/2 + panY – (svgH × zoom) / 2
 *
 * The visible portion of the SVG in its own coordinate space is then:
 *
 *   visX = (0 – canvasLeft) / zoom  =  svgW/2 – (stageW/2 + panX) / zoom
 *   visY = (0 – canvasTop)  / zoom  =  svgH/2 – (stageH/2 + panY) / zoom
 *   visW = stageW / zoom
 *   visH = stageH / zoom
 *
 * These are normalised to 0..1 relative to the SVG dimensions for the
 * component to lay out the viewport rectangle as CSS percentages.
 *
 * @module useMinimap
 */

import { computed } from 'vue'

/** Minimum zoom ratio above fitZoom before the minimap is shown. */
const SHOW_THRESHOLD = 1.08

/**
 * Computes the normalized viewport rectangle for the minimap overlay.
 *
 * @param {object} opts
 * @param {import('vue').Ref<number>}  opts.zoom        Current zoom level.
 * @param {import('vue').Ref<number>}  opts.panX        Horizontal pan offset in px.
 * @param {import('vue').Ref<number>}  opts.panY        Vertical pan offset in px.
 * @param {import('vue').Ref<number>}  opts.fitZoom     Zoom that fits the full diagram on open.
 * @param {import('vue').Ref<number>}  opts.svgWidth    SVG natural width from its viewBox (px).
 * @param {import('vue').Ref<number>}  opts.svgHeight   SVG natural height from its viewBox (px).
 * @param {import('vue').Ref<number>}  opts.stageWidth  Modal stage width in px.
 * @param {import('vue').Ref<number>}  opts.stageHeight Modal stage height in px.
 * @param {import('vue').Ref<boolean>} opts.isMaximized Whether the fullscreen modal is open.
 * @returns {{
 *   showMinimap: import('vue').ComputedRef<boolean>,
 *   viewportNorm: import('vue').ComputedRef<{nx:number, ny:number, nw:number, nh:number}>,
 * }}
 */
export function useMinimap({ zoom, panX, panY, fitZoom, svgWidth, svgHeight, stageWidth, stageHeight, isMaximized }) {
  /**
   * The minimap is visible only when maximized and the user has zoomed in
   * beyond the initial fit level, meaning part of the diagram is off-screen.
   */
  const showMinimap = computed(() =>
    isMaximized.value &&
    svgWidth.value > 0 &&
    svgHeight.value > 0 &&
    zoom.value > fitZoom.value * SHOW_THRESHOLD,
  )

  /**
   * The visible viewport as a rectangle normalised to 0..1 within the SVG
   * coordinate space. Used by DiagramViewportMap to position the viewport rect
   * as CSS percentages over the minimap frame.
   *
   * @type {import('vue').ComputedRef<{nx:number, ny:number, nw:number, nh:number}>}
   */
  const viewportNorm = computed(() => {
    const W  = svgWidth.value
    const H  = svgHeight.value
    const sw = stageWidth.value
    const sh = stageHeight.value
    const z  = zoom.value
    const px = panX.value
    const py = panY.value

    if (W <= 0 || H <= 0 || sw <= 0 || sh <= 0 || z <= 0) {
      return { nx: 0, ny: 0, nw: 1, nh: 1 }
    }

    const visX = W / 2 - (sw / 2 + px) / z
    const visY = H / 2 - (sh / 2 + py) / z
    const visW = sw / z
    const visH = sh / z

    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)

    const nx = clamp(visX / W, 0, 1)
    const ny = clamp(visY / H, 0, 1)
    const nw = clamp(visW / W, 0, 1 - nx)
    const nh = clamp(visH / H, 0, 1 - ny)

    return { nx, ny, nw, nh }
  })

  return { showMinimap, viewportNorm }
}
