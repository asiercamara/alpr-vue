import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useMinimap } from '@docs-theme/components/DiagramPresenter/useMinimap.ts'

describe('useMinimap', () => {
  it('shows minimap only when maximized and zoomed beyond fit threshold', () => {
    const zoom = ref(1.2)
    const fitZoom = ref(1)
    const isMaximized = ref(true)
    const svgWidth = ref(400)
    const svgHeight = ref(200)
    const panX = ref(0)
    const panY = ref(0)
    const stageWidth = ref(200)
    const stageHeight = ref(100)

    const { showMinimap } = useMinimap({
      zoom,
      panX,
      panY,
      fitZoom,
      svgWidth,
      svgHeight,
      stageWidth,
      stageHeight,
      isMaximized,
    })

    expect(showMinimap.value).toBe(true)

    zoom.value = 1.05
    expect(showMinimap.value).toBe(false)
  })

  it('normalizes viewport rectangle and clamps it within bounds', () => {
    const { viewportNorm } = useMinimap({
      zoom: ref(2),
      panX: ref(-50),
      panY: ref(25),
      fitZoom: ref(1),
      svgWidth: ref(400),
      svgHeight: ref(200),
      stageWidth: ref(200),
      stageHeight: ref(100),
      isMaximized: ref(true),
    })

    expect(viewportNorm.value).toEqual({
      nx: 0.4375,
      ny: 0.3125,
      nw: 0.25,
      nh: 0.25,
    })
  })

  it('returns full viewport when dimensions are invalid', () => {
    const { viewportNorm } = useMinimap({
      zoom: ref(0),
      panX: ref(0),
      panY: ref(0),
      fitZoom: ref(1),
      svgWidth: ref(0),
      svgHeight: ref(0),
      stageWidth: ref(0),
      stageHeight: ref(0),
      isMaximized: ref(false),
    })

    expect(viewportNorm.value).toEqual({
      nx: 0,
      ny: 0,
      nw: 1,
      nh: 1,
    })
  })
})
