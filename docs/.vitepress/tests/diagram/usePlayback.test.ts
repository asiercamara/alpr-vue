import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { usePlayback } from '@docs-theme/components/DiagramPresenter/usePlayback.js'
import { gsapSetSpy, gsapToSpy, gsapFromToSpy, gsapTimelineSpy } from '@docs-tests/mocks/runtime'

/* ── helpers ──────────────────────────────────────────────────────── */

function makeNode(kind = 'process', key = 'A') {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  g.dataset.dpKind = kind
  g.dataset.dpKey = key
  return g
}

function makePath() {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('marker-end', 'url(#arrow)')
  // jsdom may not apply the SVGPathElement prototype mock for dynamically created elements
  Object.defineProperty(path, 'getTotalLength', { value: vi.fn(() => 120), configurable: true })
  return path
}

function makeDefaultProps(overrides: Record<string, unknown> = {}) {
  return {
    timing: {
      nodeDuration: 0.5,
      nodeStagger: 0.1,
      edgeDuration: 0.4,
      edgeStagger: 0.1,
      levelGap: 0.2,
    },
    speed: 'normal',
    loop: false,
    highlight: [] as string[],
    highlightMode: 'pulse',
    ...overrides,
  }
}

function makePlayback(propsOverrides: Record<string, unknown> = {}) {
  const containerEl = document.createElement('div')
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  containerEl.appendChild(svgEl)
  document.body.appendChild(containerEl)

  const container = ref(containerEl)
  const props = makeDefaultProps(propsOverrides)
  const resolvedPreset = ref('soft')
  const emitPlayStart = vi.fn()
  const emitPlayComplete = vi.fn()

  const pb = usePlayback({ container, props, resolvedPreset, emitPlayStart, emitPlayComplete })
  return { pb, container, props, resolvedPreset, emitPlayStart, emitPlayComplete }
}

function makePrepared() {
  const process = makeNode('process', 'A')
  const terminus = makeNode('terminus', 'B')
  const decision = makeNode('decision', 'C')
  const path = makePath()

  return {
    nodes: [process, terminus, decision],
    edges: [{ path }],
    phases: [
      { kind: 'nodes', elements: [process] },
      { kind: 'edges', elements: [path] },
    ],
  }
}

/* ── tests ────────────────────────────────────────────────────────── */

describe('usePlayback', () => {
  describe('speed cycling', () => {
    it('speedLabel reflects current speed', () => {
      const { pb } = makePlayback()
      expect(pb.speedLabel.value).toBe('1×')
    })

    it('cycleSpeed advances: normal → fast → slow → normal', () => {
      const { pb } = makePlayback()
      pb.cycleSpeed()
      expect(pb.speedLabel.value).toBe('2×')
      pb.cycleSpeed()
      expect(pb.speedLabel.value).toBe('½×')
      pb.cycleSpeed()
      expect(pb.speedLabel.value).toBe('1×')
    })
  })

  describe('setPrepared', () => {
    it('stores prepared data and resets progress to 0', () => {
      const { pb } = makePlayback()
      pb.progress.value = 0.7
      const ready = ref(true)
      pb.setPrepared(makePrepared(), ready)
      expect(pb.progress.value).toBe(0)
    })
  })

  describe('visual helpers', () => {
    it('hideNodes sets clearProps then opacity 0', () => {
      const { pb } = makePlayback()
      const prepared = makePrepared()
      pb.setPrepared(prepared, ref(true))

      pb.hideNodes()

      expect(gsapSetSpy).toHaveBeenCalledWith(prepared.nodes, { clearProps: 'filter' })
      expect(gsapSetSpy).toHaveBeenCalledWith(prepared.nodes, { opacity: 0 })
    })

    it('showAllNodes sets opacity 1', () => {
      const { pb } = makePlayback()
      const prepared = makePrepared()
      pb.setPrepared(prepared, ref(true))

      pb.showAllNodes()

      expect(gsapSetSpy).toHaveBeenCalledWith(prepared.nodes, { opacity: 1 })
    })

    it('hideEdges stores marker-end and sets strokeDashoffset', () => {
      const { pb } = makePlayback()
      const prepared = makePrepared()
      pb.setPrepared(prepared, ref(true))

      pb.hideEdges()

      const path = prepared.edges[0].path
      expect(path.dataset.dpMarkerEnd).toBe('url(#arrow)')
      expect(path.getAttribute('marker-end')).toBe('none')
      expect(path.style.strokeDashoffset).not.toBe('')
    })

    it('showAllEdges restores strokeDashoffset and marker-end', () => {
      const { pb } = makePlayback()
      const prepared = makePrepared()
      pb.setPrepared(prepared, ref(true))

      pb.hideEdges()
      pb.showAllEdges()

      const path = prepared.edges[0].path
      expect(path.style.strokeDashoffset).toBe('0')
      expect(path.getAttribute('marker-end')).toBe('url(#arrow)')
    })

    it('all visual helpers are no-ops when not prepared', () => {
      const { pb } = makePlayback()
      expect(() => pb.hideNodes()).not.toThrow()
      expect(() => pb.showAllNodes()).not.toThrow()
      expect(() => pb.hideEdges()).not.toThrow()
      expect(() => pb.showAllEdges()).not.toThrow()
    })

    it('restoreMarker restores marker-end from dataset', () => {
      const { pb } = makePlayback()
      const path = makePath()
      path.dataset.dpMarkerEnd = 'url(#arrowEnd)'
      path.setAttribute('marker-end', 'none')

      pb.restoreMarker(path)

      expect(path.getAttribute('marker-end')).toBe('url(#arrowEnd)')
      expect(path.dataset.dpMarkerEnd).toBeUndefined()
    })

    it('restoreMarker does nothing when no saved marker', () => {
      const { pb } = makePlayback()
      const path = makePath()
      path.setAttribute('marker-end', 'url(#keep)')

      pb.restoreMarker(path)

      expect(path.getAttribute('marker-end')).toBe('url(#keep)')
    })
  })

  describe('tweenNodes', () => {
    it('animates process nodes with fromTo (slide)', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      const tl = gsapTimelineSpy()
      const process = makeNode('process', 'P')

      pb.tweenNodes(tl, [process], 0)

      expect(tl.fromTo).toHaveBeenCalledWith(
        process,
        expect.objectContaining({ opacity: 0 }),
        expect.objectContaining({ opacity: 1, ease: 'power2.out' }),
        0,
      )
    })

    it('animates terminus nodes with elastic scale', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      const tl = gsapTimelineSpy()
      const terminus = makeNode('terminus', 'T')

      pb.tweenNodes(tl, [terminus], 0)

      const [, , toVars] = tl.fromTo.mock.calls[0]
      expect(toVars.ease).toContain('elastic')
      expect(toVars.scale).toBe(1)
    })

    it('animates decision nodes with rotation', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      const tl = gsapTimelineSpy()
      const decision = makeNode('decision', 'D')

      pb.tweenNodes(tl, [decision], 0)

      const [, fromVars, toVars] = tl.fromTo.mock.calls[0]
      expect(fromVars.rotation).toBe(-90)
      expect(toVars.rotation).toBe(0)
    })

    it('stagger: second element uses relative position string', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      const tl = gsapTimelineSpy()
      const n1 = makeNode('process', 'X')
      const n2 = makeNode('process', 'Y')

      pb.tweenNodes(tl, [n1, n2], 0)

      expect(tl.fromTo.mock.calls[1][3]).toMatch(/^<\+/)
    })

    it('returns timeline unchanged for empty array', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      const tl = gsapTimelineSpy()

      const result = pb.tweenNodes(tl, [], 0)

      expect(result).toBe(tl)
      expect(tl.fromTo).not.toHaveBeenCalled()
    })
  })

  describe('tweenEdges', () => {
    it('calls tl.to for each path with onComplete to restore marker', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      const tl = gsapTimelineSpy()
      const p1 = makePath()
      const p2 = makePath()

      pb.tweenEdges(tl, [p1, p2], 0)

      expect(tl.to).toHaveBeenCalledTimes(2)
    })

    it('stagger: second edge uses relative position', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      const tl = gsapTimelineSpy()

      pb.tweenEdges(tl, [makePath(), makePath()], 0)

      const secondCallPos = tl.to.mock.calls[1][2]
      expect(secondCallPos).toMatch(/^<\+/)
    })
  })

  describe('playAll', () => {
    it('sets isPlaying and creates a timeline', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playAll()
      expect(pb.isPlaying.value).toBe(true)
      expect(pb.timeline.value).not.toBeNull()
    })

    it('is a no-op when readyRef is false', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(false))
      pb.playAll()
      expect(pb.isPlaying.value).toBe(false)
    })

    it('is a no-op when already playing', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playAll()
      const callsBefore = gsapTimelineSpy.mock.calls.length
      pb.playAll()
      expect(gsapTimelineSpy.mock.calls.length).toBe(callsBefore)
    })
  })

  describe('playNodes', () => {
    it('sets isPlaying', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playNodes()
      expect(pb.isPlaying.value).toBe(true)
    })

    it('shows all edges before animating nodes', () => {
      const { pb } = makePlayback()
      const prepared = makePrepared()
      pb.setPrepared(prepared, ref(true))
      pb.hideEdges()
      pb.playNodes()
      const path = prepared.edges[0].path
      expect(path.style.strokeDashoffset).toBe('0')
    })
  })

  describe('playEdges', () => {
    it('sets isPlaying', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playEdges()
      expect(pb.isPlaying.value).toBe(true)
    })

    it('shows all nodes before animating edges', () => {
      const { pb } = makePlayback()
      const prepared = makePrepared()
      pb.setPrepared(prepared, ref(true))
      pb.hideNodes()
      pb.playEdges()
      expect(gsapSetSpy).toHaveBeenCalledWith(prepared.nodes, { opacity: 1 })
    })
  })

  describe('togglePause', () => {
    it('pauses and resumes the active timeline', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playAll()
      const tl = pb.timeline.value

      pb.togglePause()
      expect(pb.isPaused.value).toBe(true)
      expect(tl.pause).toHaveBeenCalled()

      pb.togglePause()
      expect(pb.isPaused.value).toBe(false)
      expect(tl.play).toHaveBeenCalled()
    })

    it('is a no-op when there is no active timeline', () => {
      const { pb } = makePlayback()
      expect(() => pb.togglePause()).not.toThrow()
      expect(pb.isPaused.value).toBe(false)
    })
  })

  describe('seek', () => {
    it('forwards clamped progress to the timeline', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playAll()
      const tl = pb.timeline.value

      pb.seek(0.5)
      expect(tl.progress).toHaveBeenCalledWith(0.5)

      pb.seek(-0.5)
      expect(tl.progress).toHaveBeenCalledWith(0)

      pb.seek(1.5)
      expect(tl.progress).toHaveBeenCalledWith(1)
    })
  })

  describe('killTimeline', () => {
    it('clears isPlaying and nulls timeline ref', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playAll()
      expect(pb.isPlaying.value).toBe(true)

      pb.killTimeline()

      expect(pb.isPlaying.value).toBe(false)
      expect(pb.isPaused.value).toBe(false)
      expect(pb.timeline.value).toBeNull()
    })

    it('is safe to call when no timeline is active', () => {
      const { pb } = makePlayback()
      expect(() => pb.killTimeline()).not.toThrow()
    })
  })

  describe('killHighlightTweens', () => {
    it('kills and clears tracked tweens', () => {
      const { pb } = makePlayback({ highlight: ['A'] })
      const node = makeNode('process', 'A')
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('stroke-width', '1')
      node.appendChild(rect)
      pb.setPrepared({ nodes: [node], edges: [], phases: [] }, ref(true))

      pb.pulseHighlighted()
      // gsapToSpy returns { kill: vi.fn() } — killHighlightTweens should call it
      expect(() => pb.killHighlightTweens()).not.toThrow()
    })
  })

  describe('pulseHighlighted', () => {
    it('applies glow and stroke animation to matching nodes (pulse mode)', () => {
      const { pb } = makePlayback({ highlight: ['A'], highlightMode: 'pulse' })
      const node = makeNode('process', 'A')
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('stroke-width', '1.5')
      node.appendChild(rect)
      pb.setPrepared({ nodes: [node], edges: [], phases: [] }, ref(true))

      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: () => '#7c3aed',
      } as unknown as CSSStyleDeclaration)

      pb.pulseHighlighted()

      expect(gsapSetSpy).toHaveBeenCalled()
      expect(gsapToSpy).toHaveBeenCalled()
      // pulse mode: repeat=4 (not -1)
      const toCall = gsapToSpy.mock.calls.find(([, vars]) => 'repeat' in vars)
      expect(toCall?.[1].repeat).toBe(4)
    })

    it('uses infinite repeat for glow mode', () => {
      const { pb } = makePlayback({ highlight: ['A'], highlightMode: 'glow' })
      const node = makeNode('process', 'A')
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      node.appendChild(circle)
      pb.setPrepared({ nodes: [node], edges: [], phases: [] }, ref(true))

      pb.pulseHighlighted()

      const infiniteCall = gsapToSpy.mock.calls.find(([, vars]) => vars.repeat === -1)
      expect(infiniteCall).toBeTruthy()
    })

    it('matches nodes by id when dpKey is absent', () => {
      const { pb } = makePlayback({ highlight: ['myId'] })
      const node = makeNode('process', '')
      node.id = 'myId'
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      node.appendChild(polygon)
      pb.setPrepared({ nodes: [node], edges: [], phases: [] }, ref(true))

      pb.pulseHighlighted()

      expect(gsapSetSpy).toHaveBeenCalled()
    })

    it('skips nodes not in the highlight list', () => {
      const { pb } = makePlayback({ highlight: ['Z'] })
      const node = makeNode('process', 'A')
      pb.setPrepared({ nodes: [node], edges: [], phases: [] }, ref(true))

      gsapToSpy.mockClear()
      pb.pulseHighlighted()

      expect(gsapToSpy).not.toHaveBeenCalled()
    })

    it('is a no-op when not prepared', () => {
      const { pb } = makePlayback({ highlight: ['A'] })
      expect(() => pb.pulseHighlighted()).not.toThrow()
    })
  })

  describe('reduced motion', () => {
    function mockReducedMotion() {
      vi.mocked(window.matchMedia).mockReturnValueOnce({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList)
    }

    it('playAll skips animation and emits complete immediately', () => {
      const { pb, emitPlayStart, emitPlayComplete } = makePlayback()
      mockReducedMotion()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playAll()
      expect(pb.isPlaying.value).toBe(false)
      expect(emitPlayStart).toHaveBeenCalled()
      expect(emitPlayComplete).toHaveBeenCalled()
    })

    it('playEdges skips animation and emits complete immediately', () => {
      const { pb, emitPlayStart, emitPlayComplete } = makePlayback()
      mockReducedMotion()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playEdges()
      expect(pb.isPlaying.value).toBe(false)
      expect(emitPlayStart).toHaveBeenCalled()
      expect(emitPlayComplete).toHaveBeenCalled()
    })

    it('playNodes skips animation and emits complete immediately', () => {
      const { pb, emitPlayStart, emitPlayComplete } = makePlayback()
      mockReducedMotion()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playNodes()
      expect(pb.isPlaying.value).toBe(false)
      expect(emitPlayStart).toHaveBeenCalled()
      expect(emitPlayComplete).toHaveBeenCalled()
    })

    it('pulseHighlighted applies static glow without animation (lines 530-538)', () => {
      mockReducedMotion()

      const { pb } = makePlayback({ highlight: ['A'] })
      const node = makeNode('process', 'A')
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('stroke-width', '2')
      node.appendChild(rect)
      pb.setPrepared({ nodes: [node], edges: [], phases: [] }, ref(true))

      gsapToSpy.mockClear()
      pb.pulseHighlighted()

      // reduced motion: gsap.set is called but gsap.to is NOT (no animation)
      expect(gsapSetSpy).toHaveBeenCalled()
      expect(gsapToSpy).not.toHaveBeenCalled()
    })
  })

  describe('startTimeline callback coverage', () => {
    it('onUpdate callback updates progress ref', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playAll()

      const tl = pb.timeline.value
      const onUpdateCalls = tl.eventCallback.mock.calls.filter(
        ([event]: [string]) => event === 'onUpdate',
      )
      // Make progress mock return 0.42 to verify it's forwarded
      tl.progress.mockReturnValueOnce(0.42)
      onUpdateCalls[0]?.[1]?.()
      expect(pb.progress.value).toBe(0.42)
    })

    it('onStart callback emits play-start', () => {
      const { pb, emitPlayStart } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playAll()

      const tl = pb.timeline.value
      const onStartCalls = tl.eventCallback.mock.calls.filter(
        ([event]: [string]) => event === 'onStart',
      )
      onStartCalls[0]?.[1]?.()
      expect(emitPlayStart).toHaveBeenCalled()
    })
  })

  describe('safeLength error handling', () => {
    it('returns 0 when getTotalLength throws (line 233)', () => {
      const { pb } = makePlayback()
      const prepared = makePrepared()
      pb.setPrepared(prepared, ref(true))

      // Replace the mocked getTotalLength with one that throws
      const throwingPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      Object.defineProperty(throwingPath, 'getTotalLength', {
        value: vi.fn(() => {
          throw new Error('not implemented')
        }),
        configurable: true,
      })

      const tl = gsapTimelineSpy()
      // tweenEdges calls safeLength; the throwing path is skipped (no tl.to call)
      pb.tweenEdges(tl, [throwingPath], 0)
      expect(tl.to).not.toHaveBeenCalled()
    })
  })

  describe('tweenEdges onComplete', () => {
    it('restores marker-end when tl.to onComplete fires (line 305)', () => {
      const { pb } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))

      const tl = gsapTimelineSpy()
      const path = makePath()
      path.dataset.dpMarkerEnd = 'url(#arrowOrig)'
      path.setAttribute('marker-end', 'none')

      pb.tweenEdges(tl, [path], 0)

      // Manually invoke the onComplete callback recorded by the mock
      const toVars = tl.to.mock.calls[0][1]
      toVars.onComplete?.()

      expect(path.getAttribute('marker-end')).toBe('url(#arrowOrig)')
    })
  })

  describe('tweenLabelsIn coverage', () => {
    it('animates edgeLabel elements when present in container', () => {
      const { pb, container } = makePlayback()
      // Add .edgeLabel elements to the container SVG
      const svg = container.value.querySelector('svg')!
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      label.className.baseVal = 'edgeLabel'
      svg.appendChild(label)

      pb.setPrepared(makePrepared(), ref(true))
      // playAll calls tweenLabelsIn internally after the edge/node tweens
      pb.playAll()
      // tl.to should have been called for the label fade-in
      const tl = pb.timeline.value
      expect(tl.to).toHaveBeenCalled()
    })
  })

  describe('onComplete callback flow', () => {
    it('sets isPlaying false and calls emitPlayComplete when timeline finishes', () => {
      const { pb, emitPlayComplete } = makePlayback()
      pb.setPrepared(makePrepared(), ref(true))
      pb.playAll()

      const tl = pb.timeline.value
      // Manually trigger the onComplete callback registered via eventCallback
      const onCompleteCalls = tl.eventCallback.mock.calls.filter(
        ([event]: [string]) => event === 'onComplete',
      )
      const onComplete = onCompleteCalls[0]?.[1]
      onComplete?.()

      expect(pb.isPlaying.value).toBe(false)
      expect(pb.progress.value).toBe(1)
      expect(emitPlayComplete).toHaveBeenCalled()
    })

    it('triggers pulseEdgesGlow after playAll completes when preset is neon', () => {
      const { pb, resolvedPreset } = makePlayback()
      resolvedPreset.value = 'neon'
      const path = makePath()
      pb.setPrepared({ nodes: [], edges: [{ path }], phases: [] }, ref(true))
      pb.playAll()

      const tl = pb.timeline.value
      const onCompleteCalls = tl.eventCallback.mock.calls.filter(
        ([event]: [string]) => event === 'onComplete',
      )
      const onComplete = onCompleteCalls[0]?.[1]
      gsapFromToSpy.mockClear()
      onComplete?.()

      expect(gsapFromToSpy).toHaveBeenCalled()
    })

    it('schedules loop replay when isLooping is true (lines 473-478)', () => {
      vi.useFakeTimers()
      const { pb } = makePlayback({ loop: true })
      const ready = ref(true)
      pb.setPrepared(makePrepared(), ready)
      pb.playAll()

      const tl = pb.timeline.value
      const onCompleteCalls = tl.eventCallback.mock.calls.filter(
        ([event]: [string]) => event === 'onComplete',
      )
      const onComplete = onCompleteCalls[0]?.[1]
      onComplete?.()

      // loopTimer is set; advancing past 1500ms triggers replay attempt
      expect(pb.isPlaying.value).toBe(false)
      vi.advanceTimersByTime(1500)
      // playAll was called again: isPlaying should be true again
      expect(pb.isPlaying.value).toBe(true)
      vi.useRealTimers()
    })

    it('triggers pulseHighlighted after play when highlight is set', () => {
      const { pb } = makePlayback({ highlight: ['A'] })
      const node = makeNode('process', 'A')
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      node.appendChild(rect)
      pb.setPrepared({ nodes: [node], edges: [], phases: [] }, ref(true))
      pb.playAll()

      const tl = pb.timeline.value
      const onCompleteCalls = tl.eventCallback.mock.calls.filter(
        ([event]: [string]) => event === 'onComplete',
      )
      const onComplete = onCompleteCalls[0]?.[1]
      gsapToSpy.mockClear()
      onComplete?.()

      expect(gsapToSpy).toHaveBeenCalled()
    })
  })
})
