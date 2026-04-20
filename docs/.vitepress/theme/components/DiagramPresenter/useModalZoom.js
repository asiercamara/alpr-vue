/**
 * useModalZoom.js
 * ==================================================================
 * Composable that manages the fullscreen modal overlay for
 * DiagramPresenter: open/close lifecycle, pointer-based pan, and
 * scroll-wheel zoom centered on the cursor position.
 *
 * The SVG DOM node is physically moved from the inline container into
 * the modal canvas div when the modal opens, and moved back on close,
 * so GSAP animation references remain valid throughout.
 *
 * @module useModalZoom
 */

import { ref, nextTick } from 'vue'
import { gsap } from 'gsap'

/**
 * Provides modal open/close state and zoom/pan interaction handlers.
 *
 * @param {object} options
 * @param {import('vue').Ref<HTMLElement|null>} options.container - Inline stage div ref.
 * @param {import('vue').Ref<HTMLElement|null>} options.modalContainer - Modal stage div ref.
 * @returns {{
 *   isMaximized: import('vue').Ref<boolean>,
 *   zoom: import('vue').Ref<number>,
 *   panX: import('vue').Ref<number>,
 *   panY: import('vue').Ref<number>,
 *   isDragging: import('vue').Ref<boolean>,
 *   isPinching: import('vue').Ref<boolean>,
 *   fitZoom: import('vue').Ref<number>,
 *   svgWidth: import('vue').Ref<number>,
 *   svgHeight: import('vue').Ref<number>,
 *   stageWidth: import('vue').Ref<number>,
 *   stageHeight: import('vue').Ref<number>,
 *   openMaximized: (handlers?: object) => void,
 *   closeMaximized: () => void,
 *   resetZoom: () => void,
 *   zoomToElement: (nodeEl: Element, stageEl: Element) => void,
 *   onModalWheel: (e: WheelEvent) => void,
 *   onStagePointerDown: (e: PointerEvent) => void,
 *   onStagePointerMove: (e: PointerEvent) => void,
 *   onStagePointerUp: (e: PointerEvent) => void,
 *   cleanupListeners: () => void,
 * }}
 */
export function useModalZoom({ container, modalContainer }) {
  const isMaximized = ref(false)
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const isDragging = ref(false)
  const isPinching = ref(false)
  /** Last computed fit-to-stage zoom level; used by resetZoom and the minimap threshold. */
  const fitZoom = ref(1)
  /** SVG natural dimensions from its viewBox; set on modal open, reset on close. */
  const svgWidth = ref(0)
  const svgHeight = ref(0)
  /** Modal stage pixel dimensions at the time the modal opened. */
  const stageWidth = ref(0)
  const stageHeight = ref(0)
  /** The SVG DOM element currently hosted in the modal canvas; used by the minimap to clone a thumbnail. */
  const svgElement = ref(null)
  /** Initial pan offsets computed on open (align diagram to top-left corner). */
  let fitPanX = 0
  let fitPanY = 0

  /** Playback callbacks injected by DiagramPresenter when opening the modal. */
  let keyHandlers = {}

  // ── Drag state (single pointer) ──────────────────────────────────────────
  let dragPointerId = -1
  let dragStartX = 0
  let dragStartY = 0
  let dragStartPanX = 0
  let dragStartPanY = 0

  // ── Pinch state (two pointers) ────────────────────────────────────────────
  /** All active pointers keyed by pointerId → {x, y}. */
  const activePointers = new Map()
  let pinchInitDist = 1
  let pinchInitZoom = 1
  let pinchInitPanX = 0
  let pinchInitPanY = 0
  let pinchInitMidX = 0
  let pinchInitMidY = 0
  /** Bounding rect of the stage element at pinch start, for coord conversion. */
  let pinchStageRect = null

  /** Original SVG attribute values saved before overriding for modal display. */
  let savedSvgWidth = ''
  let savedSvgHeight = ''

  /**
   * Open the fullscreen modal.
   *
   * Sets explicit pixel dimensions on the SVG (from its viewBox) before moving
   * it into the modal canvas. This avoids the `width="100%"` ambiguity that
   * causes Chromium to not render the SVG when it's in a flex container without
   * an explicit width.
   *
   * Zoom/pan uses a "Smart Zoom" strategy:
   *   1. Compute the true fit-zoom that makes the entire diagram visible (both axes).
   *   2. Clamp to [ZOOM_MIN, ZOOM_MAX] so small diagrams aren't microscopic and
   *      very large ones aren't too tiny.
   *   3. If the clamped zoom still fits the diagram → center it (pan = 0, the stage
   *      flex layout already centers the canvas).
   *   4. If ZOOM_MIN prevents full fit (diagram overflows) → anchor the camera to the
   *      logical reading start: top for TD diagrams, left for LR diagrams.
   *
   * The canvas uses `transformOrigin: 50% 50%` and the stage flex-centers it, so
   * pan = 0 on both axes yields a perfectly centered diagram. The anchor formulas
   * derived from `stageCenter - scaledSize/2 + pan = PADDING` account for this.
   *
   * A double `requestAnimationFrame` is used instead of a single one to ensure the
   * browser has completed at least one full layout pass before reading stage
   * dimensions — single rAF can still return stale values on some mobile browsers.
   *
   * @param {object} [handlers] - Optional playback callbacks:
   *   `{ onTogglePause, onSeekForward, onSeekBack, onSpeed, onReset }`.
   *   All are optional — missing keys are simply ignored.
   * @returns {void}
   */
  function openMaximized(handlers = {}) {
    keyHandlers = handlers
    isMaximized.value = true
    panX.value = 0
    panY.value = 0
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleModalKey)
    nextTick(() => {
      const stageEl = modalContainer.value   // the ref IS the stage element
      const canvas = stageEl?.querySelector('.dp-modal-canvas')
      const svgEl = container.value?.querySelector('svg')
      if (!canvas || !svgEl) return

      // Save original attributes so we can restore them on close
      savedSvgWidth = svgEl.getAttribute('width') ?? ''
      savedSvgHeight = svgEl.getAttribute('height') ?? ''

      // Set explicit pixel dimensions so the browser resolves the SVG size
      // correctly regardless of the "width=100%" Mermaid attribute.
      const vb = svgEl.viewBox?.baseVal
      if (vb?.width > 0 && vb?.height > 0) {
        svgEl.setAttribute('width', String(vb.width))
        svgEl.setAttribute('height', String(vb.height))
      }

      canvas.appendChild(svgEl)

      // Double rAF ensures the browser has finished layout before we read
      // offsetWidth/offsetHeight — a single rAF can still return stale values
      // on some mobile browsers right after the DOM mutation above.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!(vb?.width > 0) || !(vb?.height > 0) || !stageEl) {
          fitZoom.value = 1
          zoom.value = 1
          return
        }

        // Read actual stage dimensions directly — more reliable than computing
        // window.innerHeight minus toolbar/hint heights, since the stage's
        // flex:1 already accounts for all sibling elements (toolbar, progress
        // bar, hint) without us needing to query each one individually.
        const stageW = stageEl.offsetWidth || window.innerWidth
        const stageH = stageEl.offsetHeight || window.innerHeight

        // Expose stage and SVG dimensions for the minimap composable.
        svgWidth.value = vb.width
        svgHeight.value = vb.height
        stageWidth.value = stageW
        stageHeight.value = stageH
        svgElement.value = svgEl

        // Responsive constants: tighter margins and lower min-zoom on mobile
        // to maximise the available screen area.
        const isMobile = stageW < 768
        const PADDING = isMobile ? 12 : 32
        const ZOOM_MIN = isMobile ? 0.5 : 0.6
        const ZOOM_MAX = 2.5

        // Step 1 — True fit zoom: the scale that makes both axes fully visible.
        const fitW = (stageW - PADDING * 2) / vb.width
        const fitH = (stageH - PADDING * 2) / vb.height
        const fitZoomCalc = Math.min(fitW, fitH)

        // Step 2 — Clamp for legibility.
        const fit = Math.min(Math.max(fitZoomCalc, ZOOM_MIN), ZOOM_MAX)
        fitZoom.value = fit
        zoom.value = fit

        const scaledW = vb.width * fit
        const scaledH = vb.height * fit
        const isVertical = vb.height > vb.width

        if (fit <= fitZoomCalc) {
          // Diagram fits entirely within the stage (or ZOOM_MAX reduced it further).
          // The stage flex + transformOrigin:50% 50% already centers the canvas,
          // so zero pan is perfect.
          fitPanX = 0
          fitPanY = 0
        } else {
          // ZOOM_MIN prevented a full fit — diagram overflows.
          // Anchor the camera to the logical reading start so the user immediately
          // sees the beginning of the flow; the other axis stays centered.
          if (isVertical) {
            // Top-Down diagram: anchor top edge, center horizontally.
            fitPanX = 0
            fitPanY = PADDING + (scaledH - stageH) / 2
          } else {
            // Left-Right diagram: anchor left edge, center vertically.
            fitPanX = PADDING + (scaledW - stageW) / 2
            fitPanY = 0
          }
        }
        panX.value = fitPanX
        panY.value = fitPanY
      }))
    })
  }

  /**
   * Close the fullscreen modal.
   *
   * Restores the SVG's original width/height attributes, moves it back to the
   * inline container, restores body scroll, and detaches the Escape key listener.
   *
   * @returns {void}
   */
  function closeMaximized() {
    const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
    const svgEl = canvas?.querySelector('svg')
    if (svgEl) {
      // Restore original width/height so the inline stage renders correctly
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

  /**
   * Keyboard handler: Escape closes the modal; other keys delegate to
   * the playback handlers injected via openMaximized({ … }).
   *
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  function handleModalKey(e) {
    if (e.key === 'Escape')           { closeMaximized(); return }
    if (e.key === ' ')                { e.preventDefault(); keyHandlers.onTogglePause?.() }
    else if (e.key === 'ArrowRight')  { e.preventDefault(); keyHandlers.onSeekForward?.() }
    else if (e.key === 'ArrowLeft')   { e.preventDefault(); keyHandlers.onSeekBack?.() }
    else if (e.key === '1')           { keyHandlers.onSpeed?.('slow') }
    else if (e.key === '2')           { keyHandlers.onSpeed?.('normal') }
    else if (e.key === '3')           { keyHandlers.onSpeed?.('fast') }
    else if (e.key === 'r' || e.key === 'R') { keyHandlers.onReset?.() }
    else if (e.key === 'f' || e.key === 'F') { resetZoom() }
  }

  /**
   * Reset zoom level and pan offsets back to the auto-fit zoom computed when
   * the modal was opened (not necessarily 1×).
   *
   * @returns {void}
   */
  function resetZoom() {
    zoom.value = fitZoom.value
    panX.value = fitPanX
    panY.value = fitPanY
  }

  /**
   * Scroll-wheel zoom handler centered on the cursor position.
   *
   * Adjusts pan offsets so the point under the cursor stays fixed during
   * zoom. Clamps zoom between 0.25× and 8×.
   *
   * @param {WheelEvent} e
   * @returns {void}
   */
  function onModalWheel(e) {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const factor = Math.exp(delta * 2.5)
    const next = Math.min(Math.max(zoom.value * factor, 0.25), 8)
    const rect = e.currentTarget.getBoundingClientRect()
    const ox = e.clientX - rect.left - rect.width / 2
    const oy = e.clientY - rect.top - rect.height / 2
    panX.value = ox + (panX.value - ox) * (next / zoom.value)
    panY.value = oy + (panY.value - oy) * (next / zoom.value)
    zoom.value = next
  }

  /**
   * Pointer-down handler on the stage element.
   *
   * Uses `setPointerCapture` so all subsequent events for that pointer are
   * routed here even if the finger moves outside the element. Supports both
   * single-finger drag and two-finger pinch-to-zoom.
   *
   * @param {PointerEvent} e
   * @returns {void}
   */
  function onStagePointerDown(e) {
    // Only track touch / primary-button mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.size === 1) {
      // Start drag
      isDragging.value = true
      dragPointerId = e.pointerId
      dragStartX = e.clientX
      dragStartY = e.clientY
      dragStartPanX = panX.value
      dragStartPanY = panY.value
    } else if (activePointers.size === 2) {
      // Second finger landed → switch to pinch
      isDragging.value = false
      isPinching.value = true
      const pts = [...activePointers.values()]
      pinchInitDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1
      pinchInitZoom = zoom.value
      pinchInitPanX = panX.value
      pinchInitPanY = panY.value
      pinchInitMidX = (pts[0].x + pts[1].x) / 2
      pinchInitMidY = (pts[0].y + pts[1].y) / 2
      pinchStageRect = e.currentTarget.getBoundingClientRect()
    }
  }

  /**
   * Pointer-move handler on the stage element.
   *
   * Handles both drag (1 pointer) and pinch (2 pointers).
   *
   * @param {PointerEvent} e
   * @returns {void}
   */
  function onStagePointerMove(e) {
    if (!activePointers.has(e.pointerId)) return
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (isPinching.value && activePointers.size >= 2) {
      const pts = [...activePointers.values()]
      const currentDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1
      const currentMidX = (pts[0].x + pts[1].x) / 2
      const currentMidY = (pts[0].y + pts[1].y) / 2

      const scaleFactor = currentDist / pinchInitDist
      const next = Math.min(Math.max(pinchInitZoom * scaleFactor, 0.25), 8)

      // Convert initial and current midpoints to stage-center-relative coords
      const stageW = pinchStageRect.width
      const stageH = pinchStageRect.height
      const initOx = pinchInitMidX - pinchStageRect.left - stageW / 2
      const initOy = pinchInitMidY - pinchStageRect.top - stageH / 2
      const curOx = currentMidX - pinchStageRect.left - stageW / 2
      const curOy = currentMidY - pinchStageRect.top - stageH / 2

      // Scale around the initial midpoint + translate by finger movement delta
      panX.value = initOx + (pinchInitPanX - initOx) * (next / pinchInitZoom) + (curOx - initOx)
      panY.value = initOy + (pinchInitPanY - initOy) * (next / pinchInitZoom) + (curOy - initOy)
      zoom.value = next
    } else if (isDragging.value && e.pointerId === dragPointerId) {
      panX.value = dragStartPanX + (e.clientX - dragStartX)
      panY.value = dragStartPanY + (e.clientY - dragStartY)
    }
  }

  /**
   * Pointer-up / cancel handler on the stage element.
   *
   * When one finger lifts during pinch, falls back to drag with the remaining
   * finger so the gesture feels continuous.
   *
   * @param {PointerEvent} e
   * @returns {void}
   */
  function onStagePointerUp(e) {
    activePointers.delete(e.pointerId)

    if (activePointers.size === 0) {
      isDragging.value = false
      isPinching.value = false
      dragPointerId = -1
    } else if (activePointers.size === 1) {
      // One finger lifted during pinch → switch back to drag
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
   *
   * GSAP cannot animate Vue refs directly, so we animate a plain state object
   * and sync the refs in onUpdate. Double-clicking empty space calls resetZoom
   * for an intuitive toggle.
   *
   * @param {Element} nodeEl - The <g.node> element to zoom to.
   * @param {Element} stageEl - The modal stage element (used for its bounding rect).
   * @returns {void}
   */
  function zoomToElement(nodeEl, stageEl) {
    if (!nodeEl || !stageEl) return
    const stageRect = stageEl.getBoundingClientRect()
    const nodeRect  = nodeEl.getBoundingClientRect()
    const offsetX = (nodeRect.left + nodeRect.width  / 2) - (stageRect.left + stageRect.width  / 2)
    const offsetY = (nodeRect.top  + nodeRect.height / 2) - (stageRect.top  + stageRect.height / 2)
    const targetZoom = Math.max(2.5, zoom.value)
    const zoomRatio  = targetZoom / zoom.value
    const state = { x: panX.value, y: panY.value, z: zoom.value }
    gsap.to(state, {
      x: panX.value - offsetX * zoomRatio,
      y: panY.value - offsetY * zoomRatio,
      z: targetZoom,
      duration: 0.65,
      ease: 'power3.inOut',
      onUpdate() { panX.value = state.x; panY.value = state.y; zoom.value = state.z },
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
    /** Clear any active pointer state (call in onBeforeUnmount). */
    cleanupListeners: () => { activePointers.clear(); isDragging.value = false; isPinching.value = false },
  }
}
