/**
 * usePlayback
 * ==================================================================
 * Composable that owns all GSAP-driven animation logic for
 * DiagramPresenter: visual state helpers, timeline primitives,
 * playback actions (playAll / playNodes / playEdges), timeline
 * orchestration, and the post-animation highlight/pulse effect.
 *
 * Design notes:
 *   - All functions that touch the SVG operate on `container` (the
 *     reactive ref) so they work regardless of whether the SVG is in
 *     the inline stage or has been moved into the modal canvas.
 *   - `prepared` and `adapter` are plain mutable variables; they are
 *     set externally via `setPrepared()` after each render cycle.
 *   - Speed multipliers and timing defaults live here so callers only
 *     need to call the public playback actions.
 */

import { ref, shallowRef, computed, type Ref, type ComputedRef, type ShallowRef } from 'vue'
import { gsap } from 'gsap'
import { isReducedMotion, getNodeSvgOrigin, resolveAccentColor } from './dp-utils.ts'
import type { PreparedData } from './diagram-adapters.ts'

/* ================================================================
 * Types
 * ================================================================ */

export type Speed = 'slow' | 'normal' | 'fast'
export type HighlightMode = 'pulse' | 'glow'
export type AutoPlayMode = 'none' | 'nodes' | 'edges' | 'all' | 'intersect'

export interface TimingConfig {
  nodeDuration: number
  nodeStagger: number
  edgeDuration: number
  edgeStagger: number
  levelGap: number
}

interface PlaybackProps {
  timing: TimingConfig
  speed: Speed
  loop: boolean
  highlight: string[]
  highlightMode: HighlightMode
}

interface UsePlaybackOptions {
  container: Ref<HTMLElement | null>
  props: PlaybackProps
  resolvedPreset: ComputedRef<string>
  emitPlayStart: () => void
  emitPlayComplete: () => void
}

/* ================================================================
 * Constants
 * ================================================================ */

const SPEED_CYCLE: Speed[] = ['slow', 'normal', 'fast']
const SPEED_LABELS: Record<Speed, string> = { slow: '½×', normal: '1×', fast: '2×' }
const SPEED_FACTORS: Record<Speed, number> = { slow: 2.2, normal: 1, fast: 0.35 }

/* ================================================================
 * Composable
 * ================================================================ */

export function usePlayback({
  container,
  props,
  resolvedPreset,
  emitPlayStart,
  emitPlayComplete,
}: UsePlaybackOptions) {
  /* ----------------------------------------------------------------
   * Speed state
   * ---------------------------------------------------------------- */

  const currentSpeed = ref<Speed>(props.speed)
  const isLooping = ref(props.loop)
  const speedLabel: ComputedRef<string> = computed(() => SPEED_LABELS[currentSpeed.value] ?? '1×')

  function cycleSpeed(): void {
    const idx = SPEED_CYCLE.indexOf(currentSpeed.value)
    currentSpeed.value = SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length]
  }

  function getEffectiveTiming(): TimingConfig {
    const m = SPEED_FACTORS[currentSpeed.value] ?? 1
    const t = props.timing
    return {
      nodeDuration: t.nodeDuration * m,
      nodeStagger: t.nodeStagger * m,
      edgeDuration: t.edgeDuration * m,
      edgeStagger: t.edgeStagger * m,
      levelGap: t.levelGap * m,
    }
  }

  /* ----------------------------------------------------------------
   * Playback state
   * ---------------------------------------------------------------- */

  const isPlaying = ref(false)
  const isPaused = ref(false)
  const progress = ref(0)
  const timeline: ShallowRef<gsap.core.Timeline | null> = shallowRef(null)

  let loopTimer: ReturnType<typeof setTimeout> | null = null
  let highlightTweens: gsap.core.Tween[] = []

  let prepared: PreparedData | null = null
  let readyRef: Ref<boolean> | null = null

  function setPrepared(newPrepared: PreparedData, ready: Ref<boolean>): void {
    prepared = newPrepared
    readyRef = ready
    progress.value = 0
  }

  /* ----------------------------------------------------------------
   * Visual state helpers
   * ---------------------------------------------------------------- */

  function hideNodes(): void {
    if (!prepared) return
    gsap.set(prepared.nodes, { clearProps: 'filter' })
    gsap.set(prepared.nodes, { opacity: 0 })
  }

  function showAllNodes(): void {
    if (!prepared) return
    gsap.set(prepared.nodes, { opacity: 1 })
  }

  function hideEdges(): void {
    if (!prepared) return
    prepared.edges.forEach((e) => {
      const len = safeLength(e.path)
      if (!len) return
      e.path.style.strokeDasharray = String(len)
      e.path.style.strokeDashoffset = String(len)
      const me = e.path.getAttribute('marker-end')
      if (me && me !== 'none') {
        e.path.dataset.dpMarkerEnd = me
        e.path.setAttribute('marker-end', 'none')
      }
    })
    const labels = container.value?.querySelectorAll('svg .edgeLabel') ?? []
    gsap.set([...labels], { opacity: 0 })
  }

  function showAllEdges(): void {
    if (!prepared) return
    prepared.edges.forEach((e) => {
      e.path.style.strokeDasharray = 'none'
      e.path.style.strokeDashoffset = '0'
      restoreMarker(e.path)
    })
    const labels = container.value?.querySelectorAll('svg .edgeLabel') ?? []
    gsap.set([...labels], { opacity: 1 })
  }

  function restoreMarker(path: SVGPathElement): void {
    if (path.dataset.dpMarkerEnd) {
      path.setAttribute('marker-end', path.dataset.dpMarkerEnd)
      delete path.dataset.dpMarkerEnd
    }
  }

  function safeLength(path: SVGPathElement): number {
    try {
      return path.getTotalLength()
    } catch {
      return 0
    }
  }

  /* ----------------------------------------------------------------
   * Timeline primitives
   * ---------------------------------------------------------------- */

  /**
   * Append differentiated node entrance tweens to the given timeline.
   *
   * Animation varies by node kind (data-dp-kind attribute):
   *   - terminus / actor → elastic pop-in from scale 0
   *   - decision         → rotate-in from -90°
   *   - process (default) → slide in from above (y: -12 SVG units)
   */
  function tweenNodes(
    tl: gsap.core.Timeline,
    elements: Element[],
    position: number | string,
  ): gsap.core.Timeline {
    if (!elements.length) return tl
    const t = getEffectiveTiming()
    elements.forEach((el, i) => {
      const pos = i === 0 ? position : `<+${t.nodeStagger}`
      const kind = (el as HTMLElement).dataset?.dpKind ?? 'process'
      const dur = t.nodeDuration
      if (kind === 'terminus' || kind === 'actor') {
        const origin = getNodeSvgOrigin(el as SVGGElement)
        tl.fromTo(
          el,
          { opacity: 0, scale: 0, ...(origin ? { svgOrigin: origin } : {}) },
          { opacity: 1, scale: 1, duration: dur * 1.2, ease: 'elastic.out(0.8, 0.5)' },
          pos,
        )
      } else if (kind === 'decision') {
        const origin = getNodeSvgOrigin(el as SVGGElement)
        tl.fromTo(
          el,
          { opacity: 0, rotation: -90, ...(origin ? { svgOrigin: origin } : {}) },
          { opacity: 1, rotation: 0, duration: dur, ease: 'back.out(1.7)' },
          pos,
        )
      } else {
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur, ease: 'power2.out' }, pos)
      }
    })
    return tl
  }

  /** Append staggered edge draw-on tweens to the given timeline. */
  function tweenEdges(
    tl: gsap.core.Timeline,
    paths: SVGPathElement[],
    position: number | string,
  ): gsap.core.Timeline {
    const t = getEffectiveTiming()
    paths.forEach((path, i) => {
      const len = safeLength(path)
      if (!len) return
      tl.to(
        path,
        {
          strokeDashoffset: 0,
          duration: t.edgeDuration,
          ease: 'power2.inOut',
          onComplete: () => restoreMarker(path),
        },
        i === 0 ? position : `<+${t.edgeStagger}`,
      )
    })
    return tl
  }

  function tweenLabelsIn(tl: gsap.core.Timeline, position: number | string): gsap.core.Timeline {
    const labels = [...(container.value?.querySelectorAll('svg .edgeLabel') ?? [])]
    if (!labels.length) return tl
    tl.to(labels, { opacity: 1, duration: 0.3, stagger: 0.04 }, position)
    return tl
  }

  /* ----------------------------------------------------------------
   * Timeline orchestration
   * ---------------------------------------------------------------- */

  function startTimeline(tl: gsap.core.Timeline): void {
    tl.eventCallback('onUpdate', () => {
      progress.value = tl.progress()
    })
    tl.eventCallback('onStart', () => {
      emitPlayStart()
    })
    tl.eventCallback('onComplete', () => {
      isPlaying.value = false
      isPaused.value = false
      progress.value = 1
      emitPlayComplete()
      if (props.highlight?.length) pulseHighlighted()
      if (resolvedPreset?.value === 'neon') pulseEdgesGlow()
      if (isLooping.value) {
        loopTimer = setTimeout(() => {
          if (isLooping.value && readyRef?.value) playAll()
        }, 1500)
      }
    })
    timeline.value = tl
    isPlaying.value = true
    isPaused.value = false
  }

  function killTimeline(): void {
    if (loopTimer !== null) {
      clearTimeout(loopTimer)
      loopTimer = null
    }
    timeline.value?.kill()
    timeline.value = null
    isPlaying.value = false
    isPaused.value = false
  }

  function togglePause(): void {
    const tl = timeline.value
    if (!tl) return
    if (isPaused.value) {
      tl.play()
      isPaused.value = false
    } else {
      tl.pause()
      isPaused.value = true
    }
  }

  function seek(t: number): void {
    timeline.value?.progress(Math.max(0, Math.min(1, t)))
  }

  /* ----------------------------------------------------------------
   * Playback actions
   * ---------------------------------------------------------------- */

  function playNodes(): void {
    if (!readyRef?.value || isPlaying.value) return
    killTimeline()
    if (isReducedMotion()) {
      showAllNodes()
      showAllEdges()
      emitPlayStart()
      emitPlayComplete()
      if (props.highlight?.length) pulseHighlighted()
      return
    }
    hideNodes()
    showAllEdges()
    const tl = gsap.timeline()
    tweenNodes(tl, prepared!.nodes, 0)
    startTimeline(tl)
  }

  function playEdges(): void {
    if (!readyRef?.value || isPlaying.value) return
    killTimeline()
    if (isReducedMotion()) {
      showAllNodes()
      showAllEdges()
      emitPlayStart()
      emitPlayComplete()
      if (props.highlight?.length) pulseHighlighted()
      return
    }
    showAllNodes()
    hideEdges()
    const tl = gsap.timeline()
    tweenEdges(
      tl,
      prepared!.edges.map((e) => e.path),
      0,
    )
    tweenLabelsIn(tl, '>-0.2')
    startTimeline(tl)
  }

  function playAll(): void {
    if (!readyRef?.value || isPlaying.value) return
    killTimeline()
    if (isReducedMotion()) {
      showAllNodes()
      showAllEdges()
      emitPlayStart()
      emitPlayComplete()
      if (props.highlight?.length) pulseHighlighted()
      return
    }
    hideNodes()
    hideEdges()
    const t = getEffectiveTiming()
    const tl = gsap.timeline()
    prepared!.phases.forEach((phase, i) => {
      const pos = i === 0 ? 0 : `>-${t.levelGap}`
      if (phase.kind === 'nodes') tweenNodes(tl, phase.elements, pos)
      else if (phase.kind === 'edges') tweenEdges(tl, phase.elements as SVGPathElement[], pos)
    })
    tweenLabelsIn(tl, '>-0.3')
    startTimeline(tl)
  }

  /* ----------------------------------------------------------------
   * Highlight / pulse
   * ---------------------------------------------------------------- */

  function killHighlightTweens(): void {
    highlightTweens.forEach((t) => t.kill())
    highlightTweens = []
  }

  function pulseHighlighted(): void {
    if (!prepared) return
    const keys = new Set(props.highlight)
    const targets = prepared.nodes.filter(
      (n) => keys.has((n as HTMLElement).dataset.dpKey ?? '') || keys.has((n as Element).id),
    )
    if (!targets.length) return

    killHighlightTweens()

    const accent = resolveAccentColor(container.value)

    if (isReducedMotion()) {
      targets.forEach((gNode) => {
        gNode.querySelectorAll('rect, polygon, circle, ellipse').forEach((shape) => {
          gsap.set(shape, {
            attr: {
              stroke: accent,
              'stroke-width': parseFloat(shape.getAttribute('stroke-width') ?? '1') + 2,
            },
            filter: `drop-shadow(0 0 8px ${accent})`,
          })
        })
      })
      return
    }

    const infinite = props.highlightMode === 'glow'
    const repeatCount = infinite ? -1 : 4

    targets.forEach((gNode, i) => {
      const shapes = [...gNode.querySelectorAll('rect, polygon, circle, ellipse')]
      shapes.forEach((shape) => {
        const origStroke =
          (shape as HTMLElement).style.stroke || shape.getAttribute('stroke') || 'none'
        const origWidth = parseFloat(
          (shape as HTMLElement).style.strokeWidth || shape.getAttribute('stroke-width') || '1',
        )

        gsap.set(shape, {
          attr: { stroke: accent, 'stroke-width': Math.max(origWidth, 1.5) + 2 },
        })

        const tween = gsap.to(shape, {
          filter: `drop-shadow(0 0 14px ${accent})`,
          duration: 0.75,
          ease: 'sine.inOut',
          repeat: repeatCount,
          yoyo: true,
          delay: i * 0.09,
          onComplete: infinite
            ? undefined
            : () => {
                gsap.to(shape, {
                  filter: 'none',
                  attr: { stroke: origStroke, 'stroke-width': origWidth },
                  duration: 0.35,
                  ease: 'power2.in',
                })
              },
        })
        highlightTweens.push(tween)
      })
    })
  }

  /**
   * Pulse a glow effect on all edges — called automatically after playAll
   * completes when the resolved preset is 'neon'.
   *
   * Firefox may ignore filter on <path> elements; strokeOpacity provides a
   * visible fallback for those cases.
   */
  function pulseEdgesGlow(): void {
    if (!prepared || !container.value) return
    const color = resolveAccentColor(container.value)
    prepared.edges
      .map((e) => e.path)
      .filter(Boolean)
      .forEach((path, i) => {
        gsap.fromTo(
          path,
          { strokeOpacity: 1 },
          {
            strokeOpacity: 0.3,
            filter: `drop-shadow(0 0 6px ${color})`,
            duration: 0.55,
            repeat: 2,
            yoyo: true,
            ease: 'sine.inOut',
            delay: i * 0.04,
            onComplete: () => gsap.set(path, { clearProps: 'filter,strokeOpacity' }),
          },
        )
      })
  }

  return {
    currentSpeed,
    speedLabel,
    isLooping,
    isPlaying,
    isPaused,
    progress,
    timeline,
    cycleSpeed,
    setPrepared,
    playAll,
    playNodes,
    playEdges,
    togglePause,
    seek,
    killTimeline,
    killHighlightTweens,
    pulseHighlighted,
    hideNodes,
    hideEdges,
    showAllNodes,
    showAllEdges,
    tweenNodes,
    tweenEdges,
    restoreMarker,
  }
}
