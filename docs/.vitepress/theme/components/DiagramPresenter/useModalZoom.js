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
 *   fitZoom: import('vue').Ref<number>,
 *   openMaximized: () => void,
 *   closeMaximized: () => void,
 *   resetZoom: () => void,
 *   onModalWheel: (e: WheelEvent) => void,
 *   onModalPointerDown: (e: PointerEvent) => void,
 *   onModalPointerUp: () => void,
 *   cleanupListeners: () => void,
 * }}
 */
export function useModalZoom({ container, modalContainer }) {
  const isMaximized = ref(false)
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const isDragging = ref(false)
  /** Last computed fit-to-stage zoom level; used by resetZoom. */
  const fitZoom = ref(1)
  /** Initial pan offsets computed on open (align diagram to top-left corner). */
  let fitPanX = 0
  let fitPanY = 0

  let dragStartX = 0
  let dragStartY = 0
  let dragStartPanX = 0
  let dragStartPanY = 0

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
   * @returns {void}
   */
  function openMaximized() {
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
    isMaximized.value = false
    document.body.style.overflow = ''
    document.removeEventListener('keydown', handleModalKey)
  }

  /**
   * Keyboard handler: closes the modal on Escape.
   *
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  function handleModalKey(e) {
    if (e.key === 'Escape') closeMaximized()
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
   * Pointer-down handler: starts a drag operation (primary button only).
   *
   * @param {PointerEvent} e
   * @returns {void}
   */
  function onModalPointerDown(e) {
    if (e.button !== 0) return
    isDragging.value = true
    dragStartX = e.clientX
    dragStartY = e.clientY
    dragStartPanX = panX.value
    dragStartPanY = panY.value
    window.addEventListener('pointermove', onModalPointerMove)
    window.addEventListener('pointerup', onModalPointerUp, { once: true })
  }

  /**
   * Pointer-move handler: updates pan offsets while dragging.
   *
   * @param {PointerEvent} e
   * @returns {void}
   */
  function onModalPointerMove(e) {
    if (!isDragging.value) return
    panX.value = dragStartPanX + (e.clientX - dragStartX)
    panY.value = dragStartPanY + (e.clientY - dragStartY)
  }

  /**
   * Pointer-up handler: ends the drag operation.
   *
   * @returns {void}
   */
  function onModalPointerUp() {
    isDragging.value = false
    window.removeEventListener('pointermove', onModalPointerMove)
  }

  return {
    isMaximized,
    zoom,
    panX,
    panY,
    isDragging,
    fitZoom,
    openMaximized,
    closeMaximized,
    resetZoom,
    onModalWheel,
    onModalPointerDown,
    onModalPointerUp,
    /** Remove any dangling pointermove listener (call in onBeforeUnmount). */
    cleanupListeners: () => window.removeEventListener('pointermove', onModalPointerMove),
  }
}
