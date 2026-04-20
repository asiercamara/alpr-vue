/**
 * useHoverSpotlight.js
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
 *
 * @module useHoverSpotlight
 */

import { gsap } from 'gsap'

/**
 * @param {object} options
 * @param {import('vue').Ref<HTMLElement|null>} options.container - Inline stage container ref.
 * @param {() => boolean} options.getIsPlaying - Returns true while animation is running.
 * @returns {{
 *   setPrepared: (p: object) => void,
 *   onNodeEnter: (gNode: Element) => void,
 *   onNodeLeave: () => void,
 *   killSpotlight: () => void,
 * }}
 */
export function useHoverSpotlight({ container, getIsPlaying }) {
  let prepared = null
  let tweens = []
  let activeNode = null

  /**
   * Update the prepared data after each render cycle.
   *
   * @param {object} p - Prepared adapter data (may contain `connectivity` Map).
   */
  function setPrepared(p) {
    killSpotlight()
    prepared = p
    activeNode = null
  }

  /**
   * Kill all active spotlight tweens without restoring opacity.
   */
  function killSpotlight() {
    tweens.forEach(t => t.kill())
    tweens = []
  }

  /**
   * Restore all elements to full opacity, clearing spotlight state.
   */
  function clearSpotlight() {
    const all = container.value
      ? [...container.value.querySelectorAll('g.node, .edgePath path, path.flowchart-link, path.transition')]
      : []
    gsap.to(all, { opacity: 1, duration: 0.2, clearProps: 'opacity' })
    killSpotlight()
    activeNode = null
  }

  /**
   * Dim all nodes/edges not connected to `gNode`.
   *
   * @param {Element} gNode - The hovered/tapped <g.node> element.
   */
  function onNodeEnter(gNode) {
    if (getIsPlaying() || !prepared?.connectivity) return
    if (gNode === activeNode) return

    const conn = prepared.connectivity.get(gNode.dataset?.dpKey)
    if (!conn) return

    killSpotlight()
    activeNode = gNode

    const allNodes = [...(container.value?.querySelectorAll('g.node') || [])]
    const allPaths = [...(container.value?.querySelectorAll(
      '.edgePath path, path.flowchart-link, path.transition',
    ) || [])]
    const connPaths = [...conn.outPaths, ...conn.inPaths]

    const dimNodes = allNodes.filter(n => n !== gNode && !conn.neighbors.has(n.dataset?.dpKey))
    const dimPaths = allPaths.filter(p => !connPaths.includes(p))

    if (dimNodes.length) tweens.push(gsap.to(dimNodes, { opacity: 0.12, duration: 0.18 }))
    if (dimPaths.length) tweens.push(gsap.to(dimPaths, { opacity: 0.12, duration: 0.18 }))
  }

  /**
   * Called when the pointer leaves a node (hover) or taps outside (touch).
   */
  function onNodeLeave() {
    clearSpotlight()
  }

  return { setPrepared, onNodeEnter, onNodeLeave, killSpotlight }
}
