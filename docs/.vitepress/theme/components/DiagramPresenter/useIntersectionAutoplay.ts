/**
 * useIntersectionAutoplay
 * ==================================================================
 * Composable that triggers a one-shot callback when a given element
 * scrolls into view past a 30% intersection threshold.
 *
 * Used by DiagramPresenter for `autoPlay="intersect"` — the diagram
 * animates automatically the first time it becomes visible, then the
 * observer is torn down so it never fires again.
 */

import type { Ref } from 'vue'

export function useIntersectionAutoplay() {
  let intersectionObserver: IntersectionObserver | null = null

  /**
   * Attach a one-shot IntersectionObserver to the closest `.dp-root` ancestor
   * of `container` (or to `container` itself as fallback).
   * Fires at ≥30% visibility, then immediately disconnects.
   * No-op when `IntersectionObserver` is not available (SSR / old browsers).
   */
  function setupIntersectionObserver(container: Ref<HTMLElement | null>, onFire: () => void): void {
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
          setTimeout(() => onFire(), 100)
        }
      },
      { threshold: 0.3 },
    )

    const root = container.value?.closest('.dp-root') ?? container.value
    if (root) intersectionObserver.observe(root)
  }

  function teardownIntersectionObserver(): void {
    intersectionObserver?.disconnect()
    intersectionObserver = null
  }

  return { setupIntersectionObserver, teardownIntersectionObserver }
}
