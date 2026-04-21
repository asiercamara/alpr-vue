import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { usePhaseNav } from '@docs-theme/components/DiagramPresenter/usePhaseNav.ts'
import { gsapSetSpy } from '@docs-tests/mocks/runtime'

describe('usePhaseNav', () => {
  it('plays phases forward by hiding initial state and tweening nodes then edges', () => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const playbackAPI = {
      hideNodes: vi.fn(),
      hideEdges: vi.fn(),
      tweenNodes: vi.fn(),
      tweenEdges: vi.fn(),
      restoreMarker: vi.fn(),
      isPlaying: ref(false),
      killTimeline: vi.fn(),
    }

    const nav = usePhaseNav({ playbackAPI })
    nav.setPrepared({
      phases: [
        { kind: 'nodes', elements: [node] },
        { kind: 'edges', elements: [path] },
      ],
    })

    nav.playNextPhase()
    nav.playNextPhase()

    expect(playbackAPI.hideNodes).toHaveBeenCalledTimes(1)
    expect(playbackAPI.hideEdges).toHaveBeenCalledTimes(1)
    expect(playbackAPI.tweenNodes).toHaveBeenCalledWith(expect.any(Object), [node], 0)
    expect(playbackAPI.tweenEdges).toHaveBeenCalledWith(expect.any(Object), [path], 0)
    expect(nav.currentPhaseIndex.value).toBe(1)
    expect(nav.totalPhases).toBe(2)
  })

  it('restores previous phases when stepping backwards', () => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const playbackAPI = {
      hideNodes: vi.fn(),
      hideEdges: vi.fn(),
      tweenNodes: vi.fn(),
      tweenEdges: vi.fn(),
      restoreMarker: vi.fn(),
      isPlaying: ref(false),
      killTimeline: vi.fn(),
    }

    const nav = usePhaseNav({ playbackAPI })
    nav.setPrepared({
      phases: [
        { kind: 'nodes', elements: [node] },
        { kind: 'edges', elements: [path] },
      ],
    })

    nav.playNextPhase()
    nav.playNextPhase()
    nav.playPrevPhase()

    expect(playbackAPI.hideNodes).toHaveBeenCalledTimes(2)
    expect(playbackAPI.hideEdges).toHaveBeenCalledTimes(2)
    expect(gsapSetSpy).toHaveBeenCalledWith([node], { opacity: 1 })
    expect(nav.currentPhaseIndex.value).toBe(0)
  })
})
