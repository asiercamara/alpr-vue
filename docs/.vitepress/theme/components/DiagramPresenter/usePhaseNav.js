/**
 * usePhaseNav.js
 * ==================================================================
 * Composable for step-by-step phase navigation (Prev / Next) in
 * DiagramPresenter. Intended as an alternative to continuous playback
 * — do not use alongside the scrubber or loop mode.
 *
 * "Go back" strategy: rather than reversing animation, we instantly
 * restore all phases up to the target via gsap.set, then animate
 * only the target phase. This avoids timeline reversal complexity.
 *
 * @module usePhaseNav
 */

import { ref } from 'vue'
import { gsap } from 'gsap'

/**
 * @param {object} options
 * @param {object} options.playbackAPI - The object returned by usePlayback, exposing:
 *   hideNodes, hideEdges, tweenNodes, tweenEdges, restoreMarker,
 *   isPlaying, killTimeline.
 * @returns {{
 *   currentPhaseIndex: import('vue').Ref<number>,
 *   totalPhases: import('vue').ComputedRef<number>,
 *   setPrepared: (p: object) => void,
 *   playNextPhase: () => void,
 *   playPrevPhase: () => void,
 * }}
 */
export function usePhaseNav({ playbackAPI }) {
  const currentPhaseIndex = ref(-1)
  let prepared = null

  /**
   * Update prepared data after each render cycle.
   *
   * @param {object} p
   */
  function setPrepared(p) {
    prepared = p
    currentPhaseIndex.value = -1
  }

  /**
   * Instantly reveal all phases up to (but not including) `targetIdx`
   * via gsap.set, then animate the target phase.
   *
   * @param {number} targetIdx
   */
  function restoreUpTo(targetIdx) {
    if (!prepared) return
    prepared.phases.slice(0, targetIdx).forEach(phase => {
      if (phase.kind === 'nodes') {
        gsap.set(phase.elements, { opacity: 1 })
      } else {
        phase.elements.forEach(path => {
          path.style.strokeDashoffset = '0'
          path.style.strokeDasharray = 'none'
          playbackAPI.restoreMarker(path)
        })
      }
    })
  }

  /**
   * Advance to the next phase and animate it.
   */
  function playNextPhase() {
    if (!prepared || playbackAPI.isPlaying.value) return
    const next = currentPhaseIndex.value + 1
    if (next >= prepared.phases.length) return

    if (next === 0) {
      playbackAPI.hideNodes()
      playbackAPI.hideEdges()
    }

    const phase = prepared.phases[next]
    const tl = gsap.timeline({
      onComplete: () => { currentPhaseIndex.value = next },
    })

    if (phase.kind === 'nodes') {
      playbackAPI.tweenNodes(tl, phase.elements, 0)
    } else {
      playbackAPI.tweenEdges(tl, phase.elements, 0)
    }
  }

  /**
   * Go back one phase by instantly restoring phases up to target,
   * hiding everything beyond it.
   */
  function playPrevPhase() {
    if (!prepared || currentPhaseIndex.value < 0) return
    const target = currentPhaseIndex.value - 1

    playbackAPI.hideNodes()
    playbackAPI.hideEdges()

    if (target >= 0) restoreUpTo(target + 1)
    currentPhaseIndex.value = target
  }

  return {
    currentPhaseIndex,
    get totalPhases() { return prepared?.phases.length ?? 0 },
    setPrepared,
    playNextPhase,
    playPrevPhase,
  }
}
