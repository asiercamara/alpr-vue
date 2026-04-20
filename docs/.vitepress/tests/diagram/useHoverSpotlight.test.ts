import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useHoverSpotlight } from '@docs-theme/components/DiagramPresenter/useHoverSpotlight.js'
import { gsapToSpy } from '@docs-tests/mocks/runtime'

describe('useHoverSpotlight', () => {
  it('dims unrelated nodes and restores all elements on leave', () => {
    const containerEl = document.createElement('div')
    const nodeA = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const nodeB = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const nodeC = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    nodeA.classList.add('node')
    nodeB.classList.add('node')
    nodeC.classList.add('node')
    nodeA.dataset.dpKey = 'A'
    nodeB.dataset.dpKey = 'B'
    nodeC.dataset.dpKey = 'C'

    const edgePath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    edgePath.classList.add('flowchart-link')

    containerEl.append(nodeA, nodeB, nodeC, edgePath)

    const spotlight = useHoverSpotlight({
      container: ref(containerEl),
      getIsPlaying: () => false,
    })

    spotlight.setPrepared({
      connectivity: new Map([
        [
          'A',
          {
            outPaths: [edgePath],
            inPaths: [],
            neighbors: new Set(['B']),
          },
        ],
      ]),
    })

    spotlight.onNodeEnter(nodeA)

    expect(gsapToSpy).toHaveBeenCalledWith([nodeC], { opacity: 0.12, duration: 0.18 })

    spotlight.onNodeLeave()

    expect(gsapToSpy).toHaveBeenCalledWith([nodeA, nodeB, nodeC, edgePath], {
      opacity: 1,
      duration: 0.2,
      clearProps: 'opacity',
    })
  })

  it('does nothing while playback is running or connectivity is unavailable', () => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    node.classList.add('node')
    node.dataset.dpKey = 'A'

    const spotlight = useHoverSpotlight({
      container: ref(document.createElement('div')),
      getIsPlaying: () => true,
    })

    spotlight.setPrepared({})
    spotlight.onNodeEnter(node)

    expect(gsapToSpy).not.toHaveBeenCalled()
  })
})
