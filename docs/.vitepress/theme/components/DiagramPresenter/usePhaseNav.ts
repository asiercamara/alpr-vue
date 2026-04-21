/**
 * usePhaseNav
 * ==================================================================
 * Composable for step-by-step phase navigation (Prev / Next) in
 * DiagramPresenter. Intended as an alternative to continuous playback
 * — do not use alongside the scrubber or loop mode.
 *
 * "Go back" strategy: rather than reversing animation, we instantly
 * restore all phases up to the target via gsap.set, then animate
 * only the target phase. This avoids timeline reversal complexity.
 */

import { ref, type Ref } from 'vue'
import { gsap } from 'gsap'
import type { PreparedData } from './diagram-adapters.ts'

interface PlaybackAPI {
  hideNodes: () => void
  hideEdges: () => void
  tweenNodes: (
    tl: gsap.core.Timeline,
    elements: Element[],
    position: number | string,
  ) => gsap.core.Timeline
  tweenEdges: (
    tl: gsap.core.Timeline,
    paths: SVGPathElement[],
    position: number | string,
  ) => gsap.core.Timeline
  restoreMarker: (path: SVGPathElement) => void
  isPlaying: Ref<boolean>
  killTimeline: () => void
}

interface UsePhaseNavOptions {
  playbackAPI: PlaybackAPI
}

export function usePhaseNav({ playbackAPI }: UsePhaseNavOptions) {
  const currentPhaseIndex = ref(-1)
  let prepared: PreparedData | null = null

  function setPrepared(p: PreparedData): void {
    prepared = p
    currentPhaseIndex.value = -1
  }

  /**
   * Instantly reveal all phases up to (but not including) `targetIdx`
   * via gsap.set, then animate the target phase.
   */
  function restoreUpTo(targetIdx: number): void {
    if (!prepared) return
    prepared.phases.slice(0, targetIdx).forEach((phase) => {
      if (phase.kind === 'nodes') {
        gsap.set(phase.elements, { opacity: 1 })
      } else {
        phase.elements.forEach((path) => {
          const p = path as SVGPathElement
          p.style.strokeDashoffset = '0'
          p.style.strokeDasharray = 'none'
          playbackAPI.restoreMarker(p)
        })
      }
    })
  }

  function playNextPhase(): void {
    if (!prepared || playbackAPI.isPlaying.value) return
    const next = currentPhaseIndex.value + 1
    if (next >= prepared.phases.length) return

    if (next === 0) {
      playbackAPI.hideNodes()
      playbackAPI.hideEdges()
    }

    const phase = prepared.phases[next]
    const tl = gsap.timeline({
      onComplete: () => {
        currentPhaseIndex.value = next
      },
    })

    if (phase.kind === 'nodes') {
      playbackAPI.tweenNodes(tl, phase.elements, 0)
    } else {
      playbackAPI.tweenEdges(tl, phase.elements as SVGPathElement[], 0)
    }
  }

  function playPrevPhase(): void {
    if (!prepared || currentPhaseIndex.value < 0) return
    const target = currentPhaseIndex.value - 1

    playbackAPI.hideNodes()
    playbackAPI.hideEdges()

    if (target >= 0) restoreUpTo(target + 1)
    currentPhaseIndex.value = target
  }

  return {
    currentPhaseIndex,
    get totalPhases() {
      return prepared?.phases.length ?? 0
    },
    setPrepared,
    playNextPhase,
    playPrevPhase,
  }
}
