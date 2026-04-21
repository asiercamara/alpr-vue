/**
 * useMinimap
 * ==================================================================
 * Derives the visible viewport rectangle from the current pan/zoom
 * state of the fullscreen modal in DiagramPresenter.
 *
 * The modal stage flex-centers the canvas div (which wraps the SVG)
 * and applies: transform: translate(panX, panY) scale(zoom) / transformOrigin: 50% 50%
 *
 * Coordinate derivation
 * ---------------------
 *   canvasLeft = stageW/2 + panX – (svgW × zoom) / 2
 *   canvasTop  = stageH/2 + panY – (svgH × zoom) / 2
 *
 *   visX = svgW/2 – (stageW/2 + panX) / zoom
 *   visY = svgH/2 – (stageH/2 + panY) / zoom
 *   visW = stageW / zoom
 *   visH = stageH / zoom
 *
 * These are normalised to 0..1 relative to the SVG dimensions for the
 * component to lay out the viewport rectangle as CSS percentages.
 */

import { computed, type Ref, type ComputedRef } from 'vue'

/** Minimum zoom ratio above fitZoom before the minimap is shown. */
const SHOW_THRESHOLD = 1.08

interface UseMinimapOptions {
  zoom: Ref<number>
  panX: Ref<number>
  panY: Ref<number>
  fitZoom: Ref<number>
  svgWidth: Ref<number>
  svgHeight: Ref<number>
  stageWidth: Ref<number>
  stageHeight: Ref<number>
  isMaximized: Ref<boolean>
}

interface ViewportNorm {
  nx: number
  ny: number
  nw: number
  nh: number
}

export function useMinimap({
  zoom,
  panX,
  panY,
  fitZoom,
  svgWidth,
  svgHeight,
  stageWidth,
  stageHeight,
  isMaximized,
}: UseMinimapOptions): {
  showMinimap: ComputedRef<boolean>
  viewportNorm: ComputedRef<ViewportNorm>
} {
  const showMinimap = computed(
    () =>
      isMaximized.value &&
      svgWidth.value > 0 &&
      svgHeight.value > 0 &&
      zoom.value > fitZoom.value * SHOW_THRESHOLD,
  )

  const viewportNorm = computed<ViewportNorm>(() => {
    const W = svgWidth.value
    const H = svgHeight.value
    const sw = stageWidth.value
    const sh = stageHeight.value
    const z = zoom.value
    const px = panX.value
    const py = panY.value

    if (W <= 0 || H <= 0 || sw <= 0 || sh <= 0 || z <= 0) {
      return { nx: 0, ny: 0, nw: 1, nh: 1 }
    }

    const visX = W / 2 - (sw / 2 + px) / z
    const visY = H / 2 - (sh / 2 + py) / z
    const visW = sw / z
    const visH = sh / z

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

    const nx = clamp(visX / W, 0, 1)
    const ny = clamp(visY / H, 0, 1)
    const nw = clamp(visW / W, 0, 1 - nx)
    const nh = clamp(visH / H, 0, 1 - ny)

    return { nx, ny, nw, nh }
  })

  return { showMinimap, viewportNorm }
}
