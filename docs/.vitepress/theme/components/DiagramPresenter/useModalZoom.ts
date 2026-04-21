/**
 * useModalZoom
 * ==================================================================
 * Composable that manages the fullscreen modal overlay for
 * DiagramPresenter: open/close lifecycle, pointer-based pan, and
 * scroll-wheel zoom centered on the cursor position.
 *
 * The SVG DOM node is physically moved from the inline container into
 * the modal canvas div when the modal opens, and moved back on close,
 * so GSAP animation references remain valid throughout.
 */

import { ref, nextTick, type Ref } from 'vue'
import { gsap } from 'gsap'

interface UseModalZoomOptions {
  container: Ref<HTMLElement | null>
  modalContainer: Ref<HTMLElement | null>
}

interface ModalKeyHandlers {
  onTogglePause?: () => void
  onSeekForward?: () => void
  onSeekBack?: () => void
  onSpeed?: (s: string) => void
  onReset?: () => void
}

export function useModalZoom({ container, modalContainer }: UseModalZoomOptions) {
  const isMaximized = ref(false)
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const isDragging = ref(false)
  const isPinching = ref(false)
  const fitZoom = ref(1)
  const svgWidth = ref(0)
  const svgHeight = ref(0)
  const stageWidth = ref(0)
  const stageHeight = ref(0)
  const svgElement: Ref<SVGSVGElement | null> = ref(null)
  let fitPanX = 0
  let fitPanY = 0

  let keyHandlers: ModalKeyHandlers = {}

  // ── Drag state ────────────────────────────────────────────────────
  let dragPointerId = -1
  let dragStartX = 0
  let dragStartY = 0
  let dragStartPanX = 0
  let dragStartPanY = 0

  // ── Pinch state ───────────────────────────────────────────────────
  const activePointers = new Map<number, { x: number; y: number }>()
  let pinchInitDist = 1
  let pinchInitZoom = 1
  let pinchInitPanX = 0
  let pinchInitPanY = 0
  let pinchInitMidX = 0
  let pinchInitMidY = 0
  let pinchStageRect: DOMRect | null = null

  let savedSvgWidth = ''
  let savedSvgHeight = ''

  /**
   * Open the fullscreen modal.
   *
   * Uses a "Smart Zoom" strategy:
   *   1. Compute true fit-zoom for both axes.
   *   2. Clamp to [ZOOM_MIN, ZOOM_MAX].
   *   3. If clamped zoom fits → center (pan = 0).
   *   4. If ZOOM_MIN prevents full fit → anchor to logical reading start.
   *
   * Double rAF ensures the browser has finished layout before reading
   * stage dimensions (single rAF can return stale values on mobile).
   */
  function openMaximized(handlers: ModalKeyHandlers = {}): void {
    keyHandlers = handlers
    isMaximized.value = true
    panX.value = 0
    panY.value = 0
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleModalKey)
    nextTick(() => {
      const stageEl = modalContainer.value
      const canvas = stageEl?.querySelector('.dp-modal-canvas')
      const svgEl = container.value?.querySelector('svg') as SVGSVGElement | null
      if (!canvas || !svgEl) return

      savedSvgWidth = svgEl.getAttribute('width') ?? ''
      savedSvgHeight = svgEl.getAttribute('height') ?? ''

      const vb = svgEl.viewBox?.baseVal
      if (vb?.width > 0 && vb?.height > 0) {
        svgEl.setAttribute('width', String(vb.width))
        svgEl.setAttribute('height', String(vb.height))
      }

      canvas.appendChild(svgEl)

      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!(vb?.width > 0) || !(vb?.height > 0) || !stageEl) {
            fitZoom.value = 1
            zoom.value = 1
            return
          }

          const stageW = stageEl.offsetWidth || window.innerWidth
          const stageH = stageEl.offsetHeight || window.innerHeight

          svgWidth.value = vb.width
          svgHeight.value = vb.height
          stageWidth.value = stageW
          stageHeight.value = stageH
          svgElement.value = svgEl

          const isMobile = stageW < 768
          const PADDING = isMobile ? 12 : 32
          const ZOOM_MIN = isMobile ? 0.5 : 0.6
          const ZOOM_MAX = 2.5

          const fitW = (stageW - PADDING * 2) / vb.width
          const fitH = (stageH - PADDING * 2) / vb.height
          const fitZoomCalc = Math.min(fitW, fitH)

          const fit = Math.min(Math.max(fitZoomCalc, ZOOM_MIN), ZOOM_MAX)
          fitZoom.value = fit
          zoom.value = fit

          const scaledW = vb.width * fit
          const scaledH = vb.height * fit
          const isVertical = vb.height > vb.width

          if (fit <= fitZoomCalc) {
            fitPanX = 0
            fitPanY = 0
          } else {
            if (isVertical) {
              fitPanX = 0
              fitPanY = PADDING + (scaledH - stageH) / 2
            } else {
              fitPanX = PADDING + (scaledW - stageW) / 2
              fitPanY = 0
            }
          }
          panX.value = fitPanX
          panY.value = fitPanY
        }),
      )
    })
  }

  function closeMaximized(): void {
    const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
    const svgEl = canvas?.querySelector('svg') as SVGSVGElement | null
    if (svgEl) {
      if (savedSvgWidth) svgEl.setAttribute('width', savedSvgWidth)
      else svgEl.removeAttribute('width')
      if (savedSvgHeight) svgEl.setAttribute('height', savedSvgHeight)
      else svgEl.removeAttribute('height')
      if (container.value) container.value.appendChild(svgEl)
    }
    activePointers.clear()
    isDragging.value = false
    isPinching.value = false
    dragPointerId = -1
    isMaximized.value = false
    svgWidth.value = 0
    svgHeight.value = 0
    stageWidth.value = 0
    stageHeight.value = 0
    svgElement.value = null
    document.body.style.overflow = ''
    document.removeEventListener('keydown', handleModalKey)
  }

  function handleModalKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      closeMaximized()
      return
    }
    if (e.key === ' ') {
      e.preventDefault()
      keyHandlers.onTogglePause?.()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      keyHandlers.onSeekForward?.()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      keyHandlers.onSeekBack?.()
    } else if (e.key === '1') {
      keyHandlers.onSpeed?.('slow')
    } else if (e.key === '2') {
      keyHandlers.onSpeed?.('normal')
    } else if (e.key === '3') {
      keyHandlers.onSpeed?.('fast')
    } else if (e.key === 'r' || e.key === 'R') {
      keyHandlers.onReset?.()
    } else if (e.key === 'f' || e.key === 'F') {
      resetZoom()
    }
  }

  function resetZoom(): void {
    zoom.value = fitZoom.value
    panX.value = fitPanX
    panY.value = fitPanY
  }

  /** Scroll-wheel zoom handler centered on the cursor position. */
  function onModalWheel(e: WheelEvent): void {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const factor = Math.exp(delta * 2.5)
    const next = Math.min(Math.max(zoom.value * factor, 0.25), 8)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const ox = e.clientX - rect.left - rect.width / 2
    const oy = e.clientY - rect.top - rect.height / 2
    panX.value = ox + (panX.value - ox) * (next / zoom.value)
    panY.value = oy + (panY.value - oy) * (next / zoom.value)
    zoom.value = next
  }

  function onStagePointerDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.size === 1) {
      isDragging.value = true
      dragPointerId = e.pointerId
      dragStartX = e.clientX
      dragStartY = e.clientY
      dragStartPanX = panX.value
      dragStartPanY = panY.value
    } else if (activePointers.size === 2) {
      isDragging.value = false
      isPinching.value = true
      const pts = [...activePointers.values()]
      pinchInitDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1
      pinchInitZoom = zoom.value
      pinchInitPanX = panX.value
      pinchInitPanY = panY.value
      pinchInitMidX = (pts[0].x + pts[1].x) / 2
      pinchInitMidY = (pts[0].y + pts[1].y) / 2
      pinchStageRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    }
  }

  function onStagePointerMove(e: PointerEvent): void {
    if (!activePointers.has(e.pointerId)) return
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (isPinching.value && activePointers.size >= 2) {
      const pts = [...activePointers.values()]
      const currentDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1
      const currentMidX = (pts[0].x + pts[1].x) / 2
      const currentMidY = (pts[0].y + pts[1].y) / 2

      const scaleFactor = currentDist / pinchInitDist
      const next = Math.min(Math.max(pinchInitZoom * scaleFactor, 0.25), 8)

      const stageW = pinchStageRect!.width
      const stageH = pinchStageRect!.height
      const initOx = pinchInitMidX - pinchStageRect!.left - stageW / 2
      const initOy = pinchInitMidY - pinchStageRect!.top - stageH / 2
      const curOx = currentMidX - pinchStageRect!.left - stageW / 2
      const curOy = currentMidY - pinchStageRect!.top - stageH / 2

      panX.value = initOx + (pinchInitPanX - initOx) * (next / pinchInitZoom) + (curOx - initOx)
      panY.value = initOy + (pinchInitPanY - initOy) * (next / pinchInitZoom) + (curOy - initOy)
      zoom.value = next
    } else if (isDragging.value && e.pointerId === dragPointerId) {
      panX.value = dragStartPanX + (e.clientX - dragStartX)
      panY.value = dragStartPanY + (e.clientY - dragStartY)
    }
  }

  function onStagePointerUp(e: PointerEvent): void {
    activePointers.delete(e.pointerId)

    if (activePointers.size === 0) {
      isDragging.value = false
      isPinching.value = false
      dragPointerId = -1
    } else if (activePointers.size === 1) {
      isPinching.value = false
      const [remainId, remainPos] = [...activePointers.entries()][0]
      isDragging.value = true
      dragPointerId = remainId
      dragStartX = remainPos.x
      dragStartY = remainPos.y
      dragStartPanX = panX.value
      dragStartPanY = panY.value
    }
  }

  /**
   * Animated pan+zoom to center a specific SVG node element in the modal stage.
   * Double-clicking empty space calls resetZoom for an intuitive toggle.
   */
  function zoomToElement(nodeEl: Element, stageEl: Element): void {
    if (!nodeEl || !stageEl) return
    const stageRect = stageEl.getBoundingClientRect()
    const nodeRect = nodeEl.getBoundingClientRect()
    const offsetX = nodeRect.left + nodeRect.width / 2 - (stageRect.left + stageRect.width / 2)
    const offsetY = nodeRect.top + nodeRect.height / 2 - (stageRect.top + stageRect.height / 2)
    const targetZoom = Math.max(2.5, zoom.value)
    const zoomRatio = targetZoom / zoom.value
    const state = { x: panX.value, y: panY.value, z: zoom.value }
    gsap.to(state, {
      x: panX.value - offsetX * zoomRatio,
      y: panY.value - offsetY * zoomRatio,
      z: targetZoom,
      duration: 0.65,
      ease: 'power3.inOut',
      onUpdate() {
        panX.value = state.x
        panY.value = state.y
        zoom.value = state.z
      },
    })
  }

  return {
    isMaximized,
    zoom,
    panX,
    panY,
    isDragging,
    isPinching,
    fitZoom,
    svgWidth,
    svgHeight,
    stageWidth,
    stageHeight,
    svgElement,
    openMaximized,
    closeMaximized,
    resetZoom,
    zoomToElement,
    onModalWheel,
    onStagePointerDown,
    onStagePointerMove,
    onStagePointerUp,
    cleanupListeners: () => {
      activePointers.clear()
      isDragging.value = false
      isPinching.value = false
    },
  }
}
