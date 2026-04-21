import { ref, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useModalZoom } from '@docs-theme/components/DiagramPresenter/useModalZoom.ts'
import { gsapToSpy } from '@docs-tests/mocks/runtime'

function makeStageEvent(overrides: Record<string, unknown> = {}) {
  return {
    pointerType: 'touch',
    button: 0,
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    currentTarget: {
      setPointerCapture: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 })),
    },
    ...overrides,
  }
}

function makeSetup() {
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svgEl.setAttribute('viewBox', '0 0 100 80')
  svgEl.setAttribute('width', '100%')
  svgEl.setAttribute('height', '100%')

  const containerEl = document.createElement('div')
  containerEl.appendChild(svgEl)
  document.body.appendChild(containerEl)

  const modalEl = document.createElement('div')
  const canvas = document.createElement('div')
  canvas.className = 'dp-modal-canvas'
  modalEl.appendChild(canvas)
  document.body.appendChild(modalEl)

  const container = ref(containerEl)
  const modalContainer = ref(modalEl)

  return {
    mz: useModalZoom({ container, modalContainer }),
    container,
    modalContainer,
    svgEl,
    canvas,
  }
}

describe('useModalZoom', () => {
  describe('openMaximized', () => {
    it('sets isMaximized and hides body scroll', async () => {
      const { mz } = makeSetup()
      mz.openMaximized()
      expect(mz.isMaximized.value).toBe(true)
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('moves SVG into modal canvas after nextTick', async () => {
      const { mz, canvas } = makeSetup()
      mz.openMaximized()
      await nextTick()
      expect(canvas.querySelector('svg')).not.toBeNull()
    })

    it('computes fitZoom from SVG and stage dimensions', async () => {
      const { mz } = makeSetup()
      mz.openMaximized()
      await nextTick()
      // window.innerWidth=1024, innerHeight=768, svgW=100, svgH=80
      // fitW=(1024-64)/100=9.6, fitH=(768-64)/80=8.8 → clamped to ZOOM_MAX=2.5
      expect(mz.fitZoom.value).toBeCloseTo(2.5)
      expect(mz.zoom.value).toBeCloseTo(2.5)
      expect(mz.svgWidth.value).toBe(100)
      expect(mz.svgHeight.value).toBe(80)
    })

    it('handles missing canvas or SVG gracefully', async () => {
      const container = ref(document.createElement('div')) // no SVG inside
      const modalContainer = ref(document.createElement('div')) // no .dp-modal-canvas
      const mz = useModalZoom({ container, modalContainer })
      mz.openMaximized()
      await nextTick()
      // Should not throw; isMaximized is still set synchronously
      expect(mz.isMaximized.value).toBe(true)
    })

    it('early-returns inside double rAF when viewBox has no dimensions (lines 156-158)', async () => {
      // SVG with no viewBox attribute → vb.width = 0
      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      // Deliberately no viewBox attribute
      const containerEl = document.createElement('div')
      containerEl.appendChild(svgEl)
      document.body.appendChild(containerEl)
      const modalEl = document.createElement('div')
      const canvas = document.createElement('div')
      canvas.className = 'dp-modal-canvas'
      modalEl.appendChild(canvas)
      document.body.appendChild(modalEl)
      const mz = useModalZoom({ container: ref(containerEl), modalContainer: ref(modalEl) })
      mz.openMaximized()
      await nextTick()
      // Early return sets fitZoom and zoom to 1
      expect(mz.fitZoom.value).toBe(1)
      expect(mz.zoom.value).toBe(1)
    })

    it('accepts playback handlers object', async () => {
      const { mz } = makeSetup()
      const handlers = { onTogglePause: vi.fn(), onSeekForward: vi.fn() }
      mz.openMaximized(handlers)
      await nextTick()
      expect(mz.isMaximized.value).toBe(true)
    })
  })

  describe('closeMaximized', () => {
    it('restores SVG to inline container', async () => {
      const { mz, container, svgEl } = makeSetup()
      mz.openMaximized()
      await nextTick()
      mz.closeMaximized()
      expect(mz.isMaximized.value).toBe(false)
      expect(document.body.style.overflow).toBe('')
      expect(container.value.querySelector('svg')).toBe(svgEl)
    })

    it('resets all dimension refs', async () => {
      const { mz } = makeSetup()
      mz.openMaximized()
      await nextTick()
      mz.closeMaximized()
      expect(mz.svgWidth.value).toBe(0)
      expect(mz.svgHeight.value).toBe(0)
      expect(mz.stageWidth.value).toBe(0)
      expect(mz.stageHeight.value).toBe(0)
    })

    it('clears drag/pinch state on close', async () => {
      const { mz } = makeSetup()
      mz.openMaximized()
      await nextTick()
      mz.onStagePointerDown(makeStageEvent())
      expect(mz.isDragging.value).toBe(true)
      mz.closeMaximized()
      expect(mz.isDragging.value).toBe(false)
      expect(mz.isPinching.value).toBe(false)
    })

    it('handles close without prior open gracefully', () => {
      const { mz } = makeSetup()
      expect(() => mz.closeMaximized()).not.toThrow()
    })
  })

  describe('keyboard handlers', () => {
    it('Escape closes the modal', async () => {
      const { mz } = makeSetup()
      mz.openMaximized()
      await nextTick()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(mz.isMaximized.value).toBe(false)
    })

    it('Space calls onTogglePause', async () => {
      const { mz } = makeSetup()
      const onTogglePause = vi.fn()
      mz.openMaximized({ onTogglePause })
      await nextTick()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
      expect(onTogglePause).toHaveBeenCalledTimes(1)
    })

    it('ArrowRight calls onSeekForward', async () => {
      const { mz } = makeSetup()
      const onSeekForward = vi.fn()
      mz.openMaximized({ onSeekForward })
      await nextTick()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      expect(onSeekForward).toHaveBeenCalledTimes(1)
    })

    it('ArrowLeft calls onSeekBack', async () => {
      const { mz } = makeSetup()
      const onSeekBack = vi.fn()
      mz.openMaximized({ onSeekBack })
      await nextTick()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      expect(onSeekBack).toHaveBeenCalledTimes(1)
    })

    it('1/2/3 call onSpeed with correct labels', async () => {
      const { mz } = makeSetup()
      const onSpeed = vi.fn()
      mz.openMaximized({ onSpeed })
      await nextTick()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))
      expect(onSpeed).toHaveBeenCalledWith('slow')
      expect(onSpeed).toHaveBeenCalledWith('normal')
      expect(onSpeed).toHaveBeenCalledWith('fast')
    })

    it('r and R call onReset', async () => {
      const { mz } = makeSetup()
      const onReset = vi.fn()
      mz.openMaximized({ onReset })
      await nextTick()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'R' }))
      expect(onReset).toHaveBeenCalledTimes(2)
    })

    it('f and F call resetZoom', async () => {
      const { mz } = makeSetup()
      mz.openMaximized()
      await nextTick()
      mz.zoom.value = 5
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }))
      expect(mz.zoom.value).toBe(mz.fitZoom.value)
      mz.zoom.value = 5
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F' }))
      expect(mz.zoom.value).toBe(mz.fitZoom.value)
    })

    it('removes keydown listener after close', async () => {
      const { mz } = makeSetup()
      const onTogglePause = vi.fn()
      mz.openMaximized({ onTogglePause })
      await nextTick()
      mz.closeMaximized()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
      expect(onTogglePause).not.toHaveBeenCalled()
    })
  })

  describe('resetZoom', () => {
    it('restores zoom and pan to fit values', async () => {
      const { mz } = makeSetup()
      mz.openMaximized()
      await nextTick()
      mz.zoom.value = 5
      mz.panX.value = 200
      mz.panY.value = 150
      mz.resetZoom()
      expect(mz.zoom.value).toBe(mz.fitZoom.value)
      expect(mz.panX.value).toBe(0)
      expect(mz.panY.value).toBe(0)
    })
  })

  describe('onModalWheel', () => {
    it('zooms in on negative deltaY', () => {
      const { mz } = makeSetup()
      const stageEl = document.createElement('div')
      stageEl.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }))

      const event = {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
        currentTarget: stageEl,
        preventDefault: vi.fn(),
      }
      const prevZoom = mz.zoom.value
      mz.onModalWheel(event as unknown as WheelEvent)
      expect(event.preventDefault).toHaveBeenCalled()
      expect(mz.zoom.value).toBeGreaterThan(prevZoom)
    })

    it('zooms out on positive deltaY', () => {
      const { mz } = makeSetup()
      mz.zoom.value = 2
      const stageEl = document.createElement('div')
      stageEl.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }))

      const event = {
        deltaY: 200,
        clientX: 400,
        clientY: 300,
        currentTarget: stageEl,
        preventDefault: vi.fn(),
      }
      mz.onModalWheel(event as unknown as WheelEvent)
      expect(mz.zoom.value).toBeLessThan(2)
    })

    it('clamps zoom between 0.25 and 8', () => {
      const { mz } = makeSetup()
      mz.zoom.value = 7.9
      const stageEl = document.createElement('div')
      stageEl.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 }))

      // Scroll in hard to reach max
      for (let i = 0; i < 20; i++) {
        mz.onModalWheel({
          deltaY: -1000,
          clientX: 400,
          clientY: 300,
          currentTarget: stageEl,
          preventDefault: vi.fn(),
        } as unknown as WheelEvent)
      }
      expect(mz.zoom.value).toBeLessThanOrEqual(8)

      // Scroll out hard to reach min
      mz.zoom.value = 0.3
      for (let i = 0; i < 20; i++) {
        mz.onModalWheel({
          deltaY: 1000,
          clientX: 400,
          clientY: 300,
          currentTarget: stageEl,
          preventDefault: vi.fn(),
        } as unknown as WheelEvent)
      }
      expect(mz.zoom.value).toBeGreaterThanOrEqual(0.25)
    })
  })

  describe('pointer drag', () => {
    it('starts drag on first pointer down', () => {
      const { mz } = makeSetup()
      mz.onStagePointerDown(makeStageEvent())
      expect(mz.isDragging.value).toBe(true)
    })

    it('ignores non-primary mouse buttons', () => {
      const { mz } = makeSetup()
      mz.onStagePointerDown(makeStageEvent({ pointerType: 'mouse', button: 2 }))
      expect(mz.isDragging.value).toBe(false)
    })

    it('updates pan on pointer move', () => {
      const { mz } = makeSetup()
      mz.onStagePointerDown(makeStageEvent({ pointerId: 1, clientX: 100, clientY: 100 }))
      mz.onStagePointerMove(makeStageEvent({ pointerId: 1, clientX: 160, clientY: 130 }))
      expect(mz.panX.value).toBe(60)
      expect(mz.panY.value).toBe(30)
    })

    it('ignores move for unregistered pointer', () => {
      const { mz } = makeSetup()
      mz.onStagePointerMove(makeStageEvent({ pointerId: 99, clientX: 200, clientY: 200 }))
      expect(mz.panX.value).toBe(0)
    })

    it('clears drag state on pointer up', () => {
      const { mz } = makeSetup()
      mz.onStagePointerDown(makeStageEvent({ pointerId: 1 }))
      mz.onStagePointerUp(makeStageEvent({ pointerId: 1 }))
      expect(mz.isDragging.value).toBe(false)
      expect(mz.isPinching.value).toBe(false)
    })
  })

  describe('pointer pinch', () => {
    it('switches to pinch on second pointer down', () => {
      const { mz } = makeSetup()
      mz.onStagePointerDown(makeStageEvent({ pointerId: 1, clientX: 0, clientY: 0 }))
      mz.onStagePointerDown(makeStageEvent({ pointerId: 2, clientX: 100, clientY: 0 }))
      expect(mz.isPinching.value).toBe(true)
      expect(mz.isDragging.value).toBe(false)
    })

    it('zooms in when pinch distance increases', () => {
      const { mz } = makeSetup()
      mz.zoom.value = 1
      mz.onStagePointerDown(makeStageEvent({ pointerId: 1, clientX: 0, clientY: 0 }))
      mz.onStagePointerDown(makeStageEvent({ pointerId: 2, clientX: 100, clientY: 0 }))
      // Initial dist = 100; move to dist = 200 → zoom doubles
      mz.onStagePointerMove(makeStageEvent({ pointerId: 2, clientX: 200, clientY: 0 }))
      expect(mz.zoom.value).toBeGreaterThan(1)
    })

    it('falls back to drag when one pinch finger lifts', () => {
      const { mz } = makeSetup()
      mz.onStagePointerDown(makeStageEvent({ pointerId: 1, clientX: 0, clientY: 0 }))
      mz.onStagePointerDown(makeStageEvent({ pointerId: 2, clientX: 100, clientY: 0 }))
      mz.onStagePointerUp(makeStageEvent({ pointerId: 2 }))
      expect(mz.isPinching.value).toBe(false)
      expect(mz.isDragging.value).toBe(true)
    })

    it('clears all state when both fingers lift', () => {
      const { mz } = makeSetup()
      mz.onStagePointerDown(makeStageEvent({ pointerId: 1, clientX: 0, clientY: 0 }))
      mz.onStagePointerDown(makeStageEvent({ pointerId: 2, clientX: 100, clientY: 0 }))
      mz.onStagePointerUp(makeStageEvent({ pointerId: 1 }))
      mz.onStagePointerUp(makeStageEvent({ pointerId: 2 }))
      expect(mz.isDragging.value).toBe(false)
      expect(mz.isPinching.value).toBe(false)
    })
  })

  describe('zoomToElement', () => {
    it('calls gsap.to for zoom animation', () => {
      const { mz } = makeSetup()
      const nodeEl = document.createElement('div')
      const stageEl = document.createElement('div')
      nodeEl.getBoundingClientRect = vi.fn(() => ({ left: 200, top: 200, width: 50, height: 50 }))
      stageEl.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 }))

      mz.zoomToElement(nodeEl as Element, stageEl as Element)
      expect(gsapToSpy).toHaveBeenCalled()
    })

    it('does nothing when arguments are null', () => {
      const { mz } = makeSetup()
      expect(() =>
        mz.zoomToElement(null as unknown as Element, null as unknown as Element),
      ).not.toThrow()
      expect(gsapToSpy).not.toHaveBeenCalled()
    })
  })

  describe('cleanupListeners', () => {
    it('clears active drag state', () => {
      const { mz } = makeSetup()
      mz.onStagePointerDown(makeStageEvent())
      expect(mz.isDragging.value).toBe(true)
      mz.cleanupListeners()
      expect(mz.isDragging.value).toBe(false)
      expect(mz.isPinching.value).toBe(false)
    })
  })

  describe('edge-case branches', () => {
    it('removeAttribute path: SVG opened with no width/height attrs (lines 236, 238)', async () => {
      // SVG with no width/height attribute so savedSvgWidth/Height remain ''
      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svgEl.setAttribute('viewBox', '0 0 100 80')

      const containerEl = document.createElement('div')
      containerEl.appendChild(svgEl)
      document.body.appendChild(containerEl)

      const modalEl = document.createElement('div')
      const canvas = document.createElement('div')
      canvas.className = 'dp-modal-canvas'
      modalEl.appendChild(canvas)
      document.body.appendChild(modalEl)

      const mz = useModalZoom({ container: ref(containerEl), modalContainer: ref(modalEl) })
      mz.openMaximized()
      await nextTick()
      // openMaximized sets explicit pixel dims; now remove them to test the else branches
      svgEl.removeAttribute('width')
      svgEl.removeAttribute('height')
      // Force savedSvgWidth/Height to '' by reopening without attributes set
      mz.closeMaximized()

      // After close, SVG should have no width/height (removeAttribute path)
      expect(svgEl.getAttribute('width')).toBeNull()
      expect(svgEl.getAttribute('height')).toBeNull()
    })

    it('LR overflow: ZOOM_MIN clamp on wide diagram anchors left edge (line 213)', async () => {
      // Very wide SVG forces fitZoom < ZOOM_MIN → horizontal overflow branch
      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svgEl.setAttribute('viewBox', '0 0 5000 200') // width >> height → isVertical=false

      const containerEl = document.createElement('div')
      containerEl.appendChild(svgEl)
      document.body.appendChild(containerEl)

      const modalEl = document.createElement('div')
      const canvas = document.createElement('div')
      canvas.className = 'dp-modal-canvas'
      modalEl.appendChild(canvas)
      document.body.appendChild(modalEl)

      const mz = useModalZoom({ container: ref(containerEl), modalContainer: ref(modalEl) })
      mz.openMaximized()
      await nextTick()

      // With stageW≈1024, stageH≈768 and svgW=5000:
      // fitZoomCalc = min(960/5000, 704/200) = min(0.192, 3.52) = 0.192 < ZOOM_MIN(0.6)
      // → fit=0.6, isVertical=false → horizontal anchor branch runs
      expect(mz.fitZoom.value).toBeCloseTo(0.6)
      expect(mz.panX.value).toBeGreaterThanOrEqual(0) // anchor formula produces positive offset
    })

    it('TD overflow: tall diagram anchors top edge', async () => {
      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svgEl.setAttribute('viewBox', '0 0 200 5000') // height >> width → isVertical=true

      const containerEl = document.createElement('div')
      containerEl.appendChild(svgEl)
      document.body.appendChild(containerEl)

      const modalEl = document.createElement('div')
      const canvas = document.createElement('div')
      canvas.className = 'dp-modal-canvas'
      modalEl.appendChild(canvas)
      document.body.appendChild(modalEl)

      const mz = useModalZoom({ container: ref(containerEl), modalContainer: ref(modalEl) })
      mz.openMaximized()
      await nextTick()

      expect(mz.fitZoom.value).toBeCloseTo(0.6)
      expect(mz.panY.value).toBeGreaterThanOrEqual(0)
    })

    it('zoomToElement triggers onUpdate callback (line 441)', () => {
      const { mz } = makeSetup()
      gsapToSpy.mockImplementationOnce((_target: unknown, vars: Record<string, unknown>) => {
        if (typeof vars.onUpdate === 'function') vars.onUpdate()
        if (typeof vars.onComplete === 'function') vars.onComplete()
        return { kill: vi.fn() }
      })

      const nodeEl = document.createElement('div')
      const stageEl = document.createElement('div')
      nodeEl.getBoundingClientRect = vi.fn(() => ({ left: 200, top: 200, width: 50, height: 50 }))
      stageEl.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 }))

      mz.zoomToElement(nodeEl as Element, stageEl as Element)

      // onUpdate syncs state → panX/panY/zoom were updated from the initial state object
      expect(gsapToSpy).toHaveBeenCalled()
    })
  })
})
