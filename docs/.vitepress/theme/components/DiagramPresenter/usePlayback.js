/**
 * usePlayback.js
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
 *
 * @module usePlayback
 */

import { ref, shallowRef, computed } from 'vue'
import { gsap } from 'gsap'

/* ================================================================
 * Constants
 * ================================================================ */

const SPEED_CYCLE = ['slow', 'normal', 'fast']
const SPEED_LABELS = { slow: '½×', normal: '1×', fast: '2×' }
const SPEED_FACTORS = { slow: 2.2, normal: 1, fast: 0.35 }

/* ================================================================
 * Composable
 * ================================================================ */

/**
 * Provides GSAP-based animation state and playback actions for a
 * DiagramPresenter instance.
 *
 * @param {object} options
 * @param {import('vue').Ref<HTMLElement|null>} options.container - The active stage element (inline or modal).
 * @param {object} options.props - Component props: `timing`, `speed`, `loop`, `highlight`, `highlightMode`.
 * @param {Function} options.emitPlayStart - Forwards `emit('play-start')`.
 * @param {Function} options.emitPlayComplete - Forwards `emit('play-complete')`.
 * @returns {{
 *   currentSpeed: import('vue').Ref<string>,
 *   speedLabel: import('vue').ComputedRef<string>,
 *   isLooping: import('vue').Ref<boolean>,
 *   isPlaying: import('vue').Ref<boolean>,
 *   isPaused: import('vue').Ref<boolean>,
 *   progress: import('vue').Ref<number>,
 *   timeline: import('vue').ShallowRef,
 *   cycleSpeed: () => void,
 *   setPrepared: (prepared: object, ready: import('vue').Ref<boolean>) => void,
 *   playAll: () => void,
 *   playNodes: () => void,
 *   playEdges: () => void,
 *   togglePause: () => void,
 *   seek: (t: number) => void,
 *   killTimeline: () => void,
 *   killHighlightTweens: () => void,
 *   pulseHighlighted: () => void,
 * }}
 */
export function usePlayback({ container, props, emitPlayStart, emitPlayComplete }) {
  /* ----------------------------------------------------------------
   * Speed state
   * ---------------------------------------------------------------- */

  const currentSpeed = ref(props.speed)
  const isLooping = ref(props.loop)

  /**
   * Human-readable label for the current speed setting (e.g. `'1×'`).
   *
   * @type {import('vue').ComputedRef<string>}
   */
  const speedLabel = computed(() => SPEED_LABELS[currentSpeed.value] ?? '1×')

  /**
   * Advance to the next speed in the cycle: slow → normal → fast → slow.
   *
   * @returns {void}
   */
  function cycleSpeed() {
    const idx = SPEED_CYCLE.indexOf(currentSpeed.value)
    currentSpeed.value = SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length]
  }

  /**
   * Return timing durations scaled by the current speed factor.
   *
   * @returns {{ nodeDuration: number, nodeStagger: number, edgeDuration: number, edgeStagger: number, levelGap: number }}
   */
  function getEffectiveTiming() {
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
  const timeline = shallowRef(null)

  let loopTimer = null
  let highlightTweens = []

  /** Prepared adapter data — set via setPrepared() after each render. */
  let prepared = null
  let readyRef = null

  /**
   * Update the prepared adapter data after a render cycle.
   *
   * @param {object} newPrepared - The object returned by `adapter.prepare(svgEl)`.
   * @param {import('vue').Ref<boolean>} ready - The component's `ready` ref.
   * @returns {void}
   */
  function setPrepared(newPrepared, ready) {
    prepared = newPrepared
    readyRef = ready
    progress.value = 0
  }

  /* ----------------------------------------------------------------
   * Visual state helpers
   * ---------------------------------------------------------------- */

  /**
   * Hide all diagram nodes (opacity 0) as the starting state for animation.
   *
   * @returns {void}
   */
  function hideNodes() {
    if (!prepared) return
    gsap.set(prepared.nodes, { opacity: 0 })
  }

  /**
   * Reveal all diagram nodes instantly (used before edge-only animations).
   *
   * @returns {void}
   */
  function showAllNodes() {
    if (!prepared) return
    gsap.set(prepared.nodes, { opacity: 1 })
  }

  /**
   * Hide all diagram edges by setting `strokeDashoffset = length` and
   * temporarily removing arrowhead markers.
   *
   * @returns {void}
   */
  function hideEdges() {
    if (!prepared) return
    prepared.edges.forEach((e) => {
      const len = safeLength(e.path)
      if (!len) return
      e.path.style.strokeDasharray = len
      e.path.style.strokeDashoffset = len
      const me = e.path.getAttribute('marker-end')
      if (me && me !== 'none') {
        e.path.dataset.dpMarkerEnd = me
        e.path.setAttribute('marker-end', 'none')
      }
    })
    const labels = container.value?.querySelectorAll('svg .edgeLabel') || []
    gsap.set([...labels], { opacity: 0 })
  }

  /**
   * Reveal all diagram edges instantly (used before node-only animations).
   *
   * @returns {void}
   */
  function showAllEdges() {
    if (!prepared) return
    prepared.edges.forEach((e) => {
      e.path.style.strokeDasharray = 'none'
      e.path.style.strokeDashoffset = '0'
      restoreMarker(e.path)
    })
    const labels = container.value?.querySelectorAll('svg .edgeLabel') || []
    gsap.set([...labels], { opacity: 1 })
  }

  /**
   * Restore the `marker-end` attribute that was removed before edge animation.
   *
   * @param {SVGPathElement} path
   * @returns {void}
   */
  function restoreMarker(path) {
    if (path.dataset.dpMarkerEnd) {
      path.setAttribute('marker-end', path.dataset.dpMarkerEnd)
      delete path.dataset.dpMarkerEnd
    }
  }

  /**
   * Safely return the total length of an SVG path, or 0 on failure.
   *
   * @param {SVGPathElement} path
   * @returns {number}
   */
  function safeLength(path) {
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
   * Append a staggered node fade-in tween to the given timeline.
   *
   * @param {gsap.core.Timeline} tl
   * @param {Element[]} elements - Node elements to animate.
   * @param {string|number} position - GSAP timeline position label/offset.
   * @returns {gsap.core.Timeline}
   */
  function tweenNodes(tl, elements, position) {
    if (!elements.length) return tl
    const t = getEffectiveTiming()
    tl.to(
      elements,
      {
        opacity: 1,
        duration: t.nodeDuration,
        stagger: t.nodeStagger,
        ease: 'power2.out',
      },
      position,
    )
    return tl
  }

  /**
   * Append staggered edge draw-on tweens to the given timeline.
   *
   * Each edge animates `strokeDashoffset` from its path length to 0.
   * Arrowhead markers are restored in `onComplete`.
   *
   * @param {gsap.core.Timeline} tl
   * @param {SVGPathElement[]} paths - Edge path elements to animate.
   * @param {string|number} position - GSAP timeline position for the first edge.
   * @returns {gsap.core.Timeline}
   */
  function tweenEdges(tl, paths, position) {
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

  /**
   * Append a label fade-in tween to the given timeline.
   *
   * @param {gsap.core.Timeline} tl
   * @param {string|number} position - GSAP timeline position.
   * @returns {gsap.core.Timeline}
   */
  function tweenLabelsIn(tl, position) {
    const labels = [...(container.value?.querySelectorAll('svg .edgeLabel') || [])]
    if (!labels.length) return tl
    tl.to(labels, { opacity: 1, duration: 0.3, stagger: 0.04 }, position)
    return tl
  }

  /* ----------------------------------------------------------------
   * Timeline orchestration
   * ---------------------------------------------------------------- */

  /**
   * Wire up GSAP event callbacks on a timeline and start playback.
   *
   * Updates `isPlaying`, `isPaused`, and `progress` reactively.
   * Schedules loop restarts and triggers the highlight effect when done.
   *
   * @param {gsap.core.Timeline} tl - A fully built (not yet played) GSAP timeline.
   * @returns {void}
   */
  function startTimeline(tl) {
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

  /**
   * Stop and destroy the current GSAP timeline, cancelling any loop timer.
   *
   * @returns {void}
   */
  function killTimeline() {
    clearTimeout(loopTimer)
    loopTimer = null
    timeline.value?.kill()
    timeline.value = null
    isPlaying.value = false
    isPaused.value = false
  }

  /**
   * Toggle between paused and playing states.
   *
   * @returns {void}
   */
  function togglePause() {
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

  /**
   * Jump the timeline to a specific progress point.
   *
   * @param {number} t - Progress value between 0 and 1.
   * @returns {void}
   */
  function seek(t) {
    timeline.value?.progress(Math.max(0, Math.min(1, t)))
  }

  /* ----------------------------------------------------------------
   * Playback actions
   * ---------------------------------------------------------------- */

  /**
   * Animate only nodes (edges are shown immediately).
   *
   * @returns {void}
   */
  function playNodes() {
    if (!readyRef?.value || isPlaying.value) return
    killTimeline()
    hideNodes()
    showAllEdges()
    const tl = gsap.timeline()
    tweenNodes(tl, prepared.nodes, 0)
    startTimeline(tl)
  }

  /**
   * Animate only edges (nodes are shown immediately).
   *
   * @returns {void}
   */
  function playEdges() {
    if (!readyRef?.value || isPlaying.value) return
    killTimeline()
    showAllNodes()
    hideEdges()
    const tl = gsap.timeline()
    tweenEdges(
      tl,
      prepared.edges.map((e) => e.path),
      0,
    )
    tweenLabelsIn(tl, '>-0.2')
    startTimeline(tl)
  }

  /**
   * Animate nodes and edges in topological order (full "reveal" flow).
   *
   * Uses the `phases` array produced by the adapter to interleave nodes
   * and edges across levels.
   *
   * @returns {void}
   */
  function playAll() {
    if (!readyRef?.value || isPlaying.value) return
    killTimeline()
    hideNodes()
    hideEdges()
    const t = getEffectiveTiming()
    const tl = gsap.timeline()
    prepared.phases.forEach((phase, i) => {
      const pos = i === 0 ? 0 : `>-${t.levelGap}`
      if (phase.kind === 'nodes') tweenNodes(tl, phase.elements, pos)
      else if (phase.kind === 'edges') tweenEdges(tl, phase.elements, pos)
    })
    tweenLabelsIn(tl, '>-0.3')
    startTimeline(tl)
  }

  /* ----------------------------------------------------------------
   * Highlight / pulse
   * ---------------------------------------------------------------- */

  /**
   * Kill all active highlight tweens and restore the GSAP tween registry.
   *
   * @returns {void}
   */
  function killHighlightTweens() {
    highlightTweens.forEach((t) => t.kill())
    highlightTweens = []
  }

  /**
   * Apply a glowing pulse animation to the nodes listed in `props.highlight`.
   *
   * Resolves the `--dp-accent` CSS custom property to a concrete hex so GSAP
   * can interpolate it (GSAP does not support `var()` in filter strings).
   * Behaviour is controlled by `props.highlightMode`:
   *   - `'pulse'`  — 3 yoyo cycles, then stroke is restored.
   *   - `'glow'`   — infinite, persistent glow.
   *
   * @returns {void}
   */
  function pulseHighlighted() {
    if (!prepared) return
    const keys = new Set(props.highlight)
    const targets = prepared.nodes.filter((n) => keys.has(n.dataset.dpKey) || keys.has(n.id))
    if (!targets.length) return

    killHighlightTweens()

    // Resolve accent colour: CSS custom properties are not interpolatable by
    // GSAP, so we read the computed value and fall back to a safe default.
    const rootEl = container.value
    let accent = rootEl ? getComputedStyle(rootEl).getPropertyValue('--dp-accent').trim() : '#818cf8'
    if (!accent || accent.startsWith('var(')) {
      accent = rootEl ? getComputedStyle(rootEl).getPropertyValue('--vp-c-brand-1').trim() : ''
      if (!accent || accent.startsWith('var(')) accent = '#818cf8'
    }

    const infinite = props.highlightMode === 'glow'
    // pulse: 5 yoyo half-cycles ≈ 2.5 full cycles (~4 s), then restore
    const repeatCount = infinite ? -1 : 4

    targets.forEach((gNode, i) => {
      const shapes = [...gNode.querySelectorAll('rect, polygon, circle, ellipse')]
      shapes.forEach((shape) => {
        const origStroke = shape.style.stroke || shape.getAttribute('stroke') || 'none'
        const origWidth = parseFloat(
          shape.style.strokeWidth || shape.getAttribute('stroke-width') || '1',
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
  }
}
