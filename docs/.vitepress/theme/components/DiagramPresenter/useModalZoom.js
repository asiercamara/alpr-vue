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

import { ref } from 'vue'
import { nextTick } from 'vue'

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

  let dragStartX = 0
  let dragStartY = 0
  let dragStartPanX = 0
  let dragStartPanY = 0

  /**
   * Open the fullscreen modal.
   *
   * Resets zoom/pan, locks body scroll, attaches the Escape key listener,
   * then moves the SVG element into the modal canvas on the next tick.
   *
   * @returns {void}
   */
  function openMaximized() {
    isMaximized.value = true
    zoom.value = 1
    panX.value = 0
    panY.value = 0
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleModalKey)
    nextTick(() => {
      const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
      const svgEl = container.value?.querySelector('svg')
      if (canvas && svgEl) canvas.appendChild(svgEl)
    })
  }

  /**
   * Close the fullscreen modal.
   *
   * Moves the SVG back to the inline container, restores body scroll,
   * and detaches the Escape key listener.
   *
   * @returns {void}
   */
  function closeMaximized() {
    const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
    const svgEl = canvas?.querySelector('svg')
    if (svgEl && container.value) container.value.appendChild(svgEl)
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
   * Reset zoom level and pan offsets to their default values (1× / 0,0).
   *
   * @returns {void}
   */
  function resetZoom() {
    zoom.value = 1
    panX.value = 0
    panY.value = 0
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
