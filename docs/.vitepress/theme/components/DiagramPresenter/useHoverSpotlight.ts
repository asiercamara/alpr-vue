/**
 * useHoverSpotlight
 * ==================================================================
 * Composable that dims unrelated nodes and edges when hovering over
 * a connected node in the diagram. Only works when the adapter
 * provides a `connectivity` map (flowchart, state); silently no-ops
 * for sequence and fallback adapters.
 *
 * Event delegation is used (not per-node listeners) because the SVG
 * re-renders from scratch on each render() call, invalidating any
 * previously attached listeners.
 *
 * On touch devices, a tap on a node toggles the spotlight; a tap
 * outside clears it.
 */

import { gsap } from 'gsap'
import type { Ref } from 'vue'
import type { PreparedData } from './diagram-adapters.ts'

interface UseHoverSpotlightOptions {
  container: Ref<HTMLElement | null>
  getIsPlaying: () => boolean
}

export function useHoverSpotlight({ container, getIsPlaying }: UseHoverSpotlightOptions) {
  let prepared: PreparedData | null = null
  let tweens: gsap.core.Tween[] = []
  let activeNode: Element | null = null

  function setPrepared(p: PreparedData): void {
    killSpotlight()
    prepared = p
    activeNode = null
  }

  function killSpotlight(): void {
    tweens.forEach((t) => t.kill())
    tweens = []
  }

  function clearSpotlight(): void {
    const all = container.value
      ? [
          ...container.value.querySelectorAll(
            'g.node, .edgePath path, path.flowchart-link, path.transition',
          ),
        ]
      : []
    gsap.to(all, { opacity: 1, duration: 0.2, clearProps: 'opacity' })
    killSpotlight()
    activeNode = null
  }

  function onNodeEnter(gNode: Element): void {
    if (getIsPlaying() || !prepared?.connectivity) return
    if (gNode === activeNode) return

    const key = (gNode as HTMLElement).dataset?.dpKey
    const conn = key ? prepared.connectivity.get(key) : undefined
    if (!conn) return

    killSpotlight()
    activeNode = gNode

    const allNodes = [...(container.value?.querySelectorAll('g.node') ?? [])]
    const allPaths = [
      ...(container.value?.querySelectorAll(
        '.edgePath path, path.flowchart-link, path.transition',
      ) ?? []),
    ]
    const connPaths = [...conn.outPaths, ...conn.inPaths]

    const dimNodes = allNodes.filter((n) => {
      const nKey = (n as HTMLElement).dataset?.dpKey
      return n !== gNode && !conn.neighbors.has(nKey ?? '')
    })
    const dimPaths = allPaths.filter((p) => !connPaths.includes(p as SVGPathElement))

    if (dimNodes.length) tweens.push(gsap.to(dimNodes, { opacity: 0.12, duration: 0.18 }))
    if (dimPaths.length) tweens.push(gsap.to(dimPaths, { opacity: 0.12, duration: 0.18 }))
  }

  function onNodeLeave(): void {
    clearSpotlight()
  }

  return { setPrepared, onNodeEnter, onNodeLeave, killSpotlight }
}
