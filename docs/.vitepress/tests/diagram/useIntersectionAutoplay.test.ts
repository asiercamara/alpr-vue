import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useIntersectionAutoplay } from '@docs-theme/components/DiagramPresenter/useIntersectionAutoplay.ts'
import { intersectionObserverInstances } from '@docs-tests/mocks/runtime'

describe('useIntersectionAutoplay', () => {
  it('observes the closest dp-root and fires once after crossing the threshold', () => {
    vi.useFakeTimers()

    const root = document.createElement('figure')
    root.className = 'dp-root'
    const container = document.createElement('div')
    root.appendChild(container)
    document.body.appendChild(root)

    const fireSpy = vi.fn()
    const { setupIntersectionObserver } = useIntersectionAutoplay()

    setupIntersectionObserver(ref(container), fireSpy)

    expect(intersectionObserverInstances).toHaveLength(1)
    expect(intersectionObserverInstances[0].observe).toHaveBeenCalledWith(root)

    intersectionObserverInstances[0].trigger([
      {
        isIntersecting: true,
        intersectionRatio: 0.5,
      } as IntersectionObserverEntry,
    ])
    vi.advanceTimersByTime(100)

    expect(fireSpy).toHaveBeenCalledTimes(1)
    expect(intersectionObserverInstances[0].disconnect).toHaveBeenCalledTimes(1)

    intersectionObserverInstances[0].trigger([
      {
        isIntersecting: true,
        intersectionRatio: 0.8,
      } as IntersectionObserverEntry,
    ])
    vi.advanceTimersByTime(100)

    expect(fireSpy).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('tears down an existing observer before creating a new one', () => {
    const container = document.createElement('div')
    const { setupIntersectionObserver } = useIntersectionAutoplay()

    setupIntersectionObserver(ref(container), vi.fn())
    const firstObserver = intersectionObserverInstances[0]
    setupIntersectionObserver(ref(container), vi.fn())

    expect(firstObserver.disconnect).toHaveBeenCalledTimes(1)
    expect(intersectionObserverInstances).toHaveLength(2)
  })
})
