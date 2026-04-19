/**
 * useIntersectionAutoplay.js
 * ==================================================================
 * Composable that triggers a one-shot callback when a given element
 * scrolls into view past a 30 % intersection threshold.
 *
 * Used by DiagramPresenter for `autoPlay="intersect"` — the diagram
 * animates automatically the first time it becomes visible, then the
 * observer is torn down so it never fires again.
 *
 * @module useIntersectionAutoplay
 */

/**
 * Manages a one-shot IntersectionObserver for autoPlay="intersect".
 *
 * @returns {{
 *   setupIntersectionObserver: (container: import('vue').Ref<HTMLElement|null>, onFire: () => void) => void,
 *   teardownIntersectionObserver: () => void
 * }}
 */
export function useIntersectionAutoplay() {
  /** @type {IntersectionObserver|null} */
  let intersectionObserver = null

  /**
   * Attach an IntersectionObserver to the closest `.dp-root` ancestor of
   * `container` (or to `container` itself as fallback).
   *
   * The observer fires at most once: when at least 30 % of the element
   * is visible, `onFire` is called after a 100 ms settling delay, and the
   * observer is immediately disconnected.
   *
   * No-op when `IntersectionObserver` is not available (SSR / old browsers).
   *
   * @param {import('vue').Ref<HTMLElement|null>} container - The stage element ref.
   * @param {() => void} onFire - Callback to invoke when the element enters the viewport.
   * @returns {void}
   */
  function setupIntersectionObserver(container, onFire) {
    teardownIntersectionObserver()
    if (typeof IntersectionObserver === 'undefined') return

    let fired = false
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (fired) return
        const entry = entries[0]
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          fired = true
          teardownIntersectionObserver()
          // Short delay so the diagram is visually settled before animating
          setTimeout(() => onFire(), 100)
        }
      },
      { threshold: 0.3 },
    )

    // Observe the figure root for a larger intersection surface
    const root = container.value?.closest('.dp-root') ?? container.value
    if (root) intersectionObserver.observe(root)
  }

  /**
   * Disconnect and discard the current IntersectionObserver, if any.
   *
   * @returns {void}
   */
  function teardownIntersectionObserver() {
    intersectionObserver?.disconnect()
    intersectionObserver = null
  }

  return { setupIntersectionObserver, teardownIntersectionObserver }
}
