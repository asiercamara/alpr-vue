/**
 * Diagram adapters for DiagramPresenter.
 * ------------------------------------------------------------------
 * Each adapter knows how to read a particular Mermaid-rendered SVG
 * and produce a normalized structure the component can animate:
 *
 *   adapter.prepare(svg) => PreparedData
 *
 * Add a new adapter in three steps:
 *   1. Export a new adapter object satisfying the Adapter interface
 *   2. Register it in `adapters` below (before fallbackAdapter)
 *   3. Done — the component picks it up automatically via pickAdapter()
 */

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */

export interface Phase {
  kind: 'nodes' | 'edges'
  elements: Element[]
}

export interface EdgeEntry {
  path: SVGPathElement
  from?: string
  to?: string
}

export interface ConnectivityEntry {
  outPaths: SVGPathElement[]
  inPaths: SVGPathElement[]
  neighbors: Set<string>
}

export interface PreparedData {
  nodes: Element[]
  edges: EdgeEntry[]
  phases: Phase[]
  connectivity?: Map<string, ConnectivityEntry>
  kind: string
}

export interface Adapter {
  name: string
  label: string
  match(svg: SVGSVGElement): boolean
  prepare(svg: SVGSVGElement): PreparedData
}

/* ------------------------------------------------------------------
 * Shared helpers
 * ------------------------------------------------------------------ */

/** BFS topological levelling tolerant to cycles. Returns Array<Array<key>>. */
function bfsLevels(
  nodesByKey: Map<string, Element>,
  edges: EdgeEntry[],
  inDegree: Map<string, number>,
): string[][] {
  const visited = new Set<string>()
  const levels: string[][] = []
  let frontier = [...inDegree.entries()].filter(([, d]) => d === 0).map(([k]) => k)

  if (!frontier.length && nodesByKey.size) {
    frontier = [nodesByKey.keys().next().value as string]
  }

  let safety = 0
  while (frontier.length && safety++ < 500) {
    levels.push(frontier)
    frontier.forEach((k) => visited.add(k))

    const candidates = new Set<string>()
    edges.forEach(({ from, to }) => {
      if (from && to && visited.has(from) && !visited.has(to)) candidates.add(to)
    })
    const ready = [...candidates].filter((to) =>
      edges.filter((e) => e.to === to).every((e) => e.from !== undefined && visited.has(e.from)),
    )
    frontier = ready.length ? ready : [...candidates]
  }

  const orphans = [...nodesByKey.keys()].filter((k) => !visited.has(k))
  if (orphans.length) levels.push(orphans)
  return levels
}

/** Build an alternating [nodes, edges, nodes, edges, …] phase list from BFS levels. */
function buildLevelPhases(
  levels: string[][],
  edgesByFromKey: Map<string, EdgeEntry[]>,
  nodesByKey: Map<string, Element>,
): Phase[] {
  const phases: Phase[] = []
  levels.forEach((level) => {
    const levelNodes = level
      .map((k) => nodesByKey.get(k))
      .filter((n): n is Element => n !== undefined)
    if (levelNodes.length) phases.push({ kind: 'nodes', elements: levelNodes })
    const leaving = level.flatMap((k) => edgesByFromKey.get(k) ?? [])
    if (leaving.length) phases.push({ kind: 'edges', elements: leaving.map((e) => e.path) })
  })
  return phases
}

/** Extract LS-/LE- source/target encoded by Mermaid on edge containers. */
function extractLsLe(path: Element): { from?: string; to?: string } {
  const ancestor = path.closest('g.edgePath, g.edge, g.transition, g.flowchart-link')
  const pool = [path.getAttribute('class'), ancestor?.getAttribute('class'), path.id, ancestor?.id]
    .filter(Boolean)
    .join(' ')

  const ls = pool.match(/LS-([A-Za-z0-9_]+)/)
  const le = pool.match(/LE-([A-Za-z0-9_]+)/)
  return { from: ls?.[1], to: le?.[1] }
}

/**
 * Robust node-id → semantic key extraction.
 * Handles Mermaid v9/v10/v11 id formats.
 */
function extractNodeKey(n: Element): string {
  const el = n as HTMLElement & SVGElement
  if (el.dataset?.id && el.dataset.id !== 'undefined') {
    return el.dataset.id
  }

  const id = el.id || ''
  const stripped = id.replace(/^[a-z]+-[a-z0-9]+-/, '')
  const workId = stripped || id

  const m = workId.match(/^(?:flowchart|state)-(.+?)(?:-\d+)?$/)
  if (m) return m[1]

  return workId
}

/* ------------------------------------------------------------------
 * 1. Flowchart adapter
 * ------------------------------------------------------------------ */

export const flowchartAdapter: Adapter = {
  name: 'flowchart',
  label: 'Flowchart',

  match(svg) {
    return (
      svg.classList.contains('flowchart') ||
      svg.classList.contains('flowchart-v2') ||
      !!svg.querySelector('g.node[id^="flowchart-"]') ||
      !!svg.querySelector('g.node[class*="flowchart"]')
    )
  },

  prepare(svg) {
    const rawNodes = [...svg.querySelectorAll('g.node')]
    const nodes: Element[] = []
    const nodesByKey = new Map<string, Element>()
    const inDeg = new Map<string, number>()

    rawNodes.forEach((n) => {
      const el = n as HTMLElement & SVGElement
      const polygon = n.querySelector('polygon')
      const rect = n.querySelector('rect')
      const round = n.querySelector('circle, ellipse')
      const isStadium = rect && parseFloat(rect.getAttribute('rx') ?? '0') > 15

      let kind = 'process'
      if (polygon) kind = 'decision'
      else if (round || isStadium) kind = 'terminus'
      n.setAttribute('data-dp-kind', kind)

      const key = extractNodeKey(n)
      el.dataset.dpKey = key

      nodes.push(n)
      nodesByKey.set(key, n)
      inDeg.set(key, 0)
    })

    const edges: EdgeEntry[] = []
    svg.querySelectorAll('.edgePath, path.flowchart-link').forEach((el) => {
      const path = el.tagName === 'path' ? el : el.querySelector('path')
      if (!path || edges.some((e) => e.path === path)) return
      const { from, to } = extractLsLe(path)
      edges.push({ path: path as SVGPathElement, from, to })
      if (to && inDeg.has(to)) inDeg.set(to, (inDeg.get(to) ?? 0) + 1)
    })

    const levelKeys = bfsLevels(nodesByKey, edges, inDeg)

    const edgesByFromKey = new Map<string, EdgeEntry[]>()
    edges.forEach((e) => {
      if (!e.from) return
      if (!edgesByFromKey.has(e.from)) edgesByFromKey.set(e.from, [])
      edgesByFromKey.get(e.from)!.push(e)
    })

    const phases = buildLevelPhases(levelKeys, edgesByFromKey, nodesByKey)

    const phasedPaths = new Set(phases.filter((p) => p.kind === 'edges').flatMap((p) => p.elements))
    const orphans = edges.filter((e) => !phasedPaths.has(e.path))
    if (orphans.length) phases.push({ kind: 'edges', elements: orphans.map((e) => e.path) })

    const connectivity = new Map<string, ConnectivityEntry>()
    edges.forEach(({ path, from, to }) => {
      if (!from || !to) return
      ;[from, to].forEach((k) => {
        if (!connectivity.has(k))
          connectivity.set(k, { outPaths: [], inPaths: [], neighbors: new Set() })
      })
      connectivity.get(from)!.outPaths.push(path)
      connectivity.get(to)!.inPaths.push(path)
      connectivity.get(from)!.neighbors.add(to)
      connectivity.get(to)!.neighbors.add(from)
    })

    return { nodes, edges, phases, connectivity, kind: this.name }
  },
}

/* ------------------------------------------------------------------
 * 2. State diagram adapter (stateDiagram-v2)
 * ------------------------------------------------------------------ */

export const stateAdapter: Adapter = {
  name: 'state',
  label: 'State',

  match(svg) {
    return (
      svg.classList.contains('statediagram') ||
      !!svg.querySelector('.statediagram-state') ||
      !!svg.querySelector('g.node[id^="state-"]') ||
      !!svg.querySelector('g.node[class*="stateDiagram"]') ||
      !!svg.querySelector('g.node[class*="statediagram"]')
    )
  },

  prepare(svg) {
    const rawNodes = [...svg.querySelectorAll('g.node')]
    const nodes: Element[] = []
    const nodesByKey = new Map<string, Element>()
    const inDeg = new Map<string, number>()

    rawNodes.forEach((n) => {
      const el = n as HTMLElement & SVGElement
      const hasLabel = !!n.querySelector('.nodeLabel, foreignObject, .label')
      const hasCircle = !!n.querySelector('circle')
      const hasRect = !!n.querySelector('rect')
      const idLower = (el.id || '').toLowerCase()
      const isMarker =
        (hasCircle && !hasRect && !hasLabel) ||
        idLower.includes('_start') ||
        idLower.includes('_end') ||
        idLower.includes('-start') ||
        idLower.includes('-end')
      const isChoice =
        n.classList.contains('statediagram-cluster') ||
        n.classList.contains('statediagram-state--fork') ||
        !!n.querySelector('polygon')

      let kind = 'process'
      if (isMarker) kind = 'terminus'
      else if (isChoice) kind = 'decision'
      n.setAttribute('data-dp-kind', kind)

      const key = extractNodeKey(n)
      el.dataset.dpKey = key

      nodes.push(n)
      nodesByKey.set(key, n)
      inDeg.set(key, 0)
    })

    const pathSet = new Set<SVGPathElement>()
    ;[
      'path.transition',
      '.edgePaths path',
      '.edgePath path',
      'g.transition path',
      'path.flowchart-link',
    ].forEach((sel) => svg.querySelectorAll<SVGPathElement>(sel).forEach((p) => pathSet.add(p)))

    const edges: EdgeEntry[] = []
    pathSet.forEach((path) => {
      if (edges.some((e) => e.path === path)) return
      const { from, to } = extractLsLe(path)
      edges.push({ path, from, to })
      if (to && inDeg.has(to)) inDeg.set(to, (inDeg.get(to) ?? 0) + 1)
    })

    let phases: Phase[]
    const connected = edges.filter(
      (e) => e.from && e.to && nodesByKey.has(e.from) && nodesByKey.has(e.to),
    )

    if (connected.length > 0 && nodesByKey.size > 1) {
      const levelKeys = bfsLevels(nodesByKey, connected, inDeg)
      const edgesByFromKey = new Map<string, EdgeEntry[]>()
      edges.forEach((e) => {
        if (!e.from) return
        if (!edgesByFromKey.has(e.from)) edgesByFromKey.set(e.from, [])
        edgesByFromKey.get(e.from)!.push(e)
      })
      phases = buildLevelPhases(levelKeys, edgesByFromKey, nodesByKey)

      const phasedPaths = new Set(
        phases.filter((p) => p.kind === 'edges').flatMap((p) => p.elements),
      )
      const orphans = edges.filter((e) => !phasedPaths.has(e.path))
      if (orphans.length) phases.push({ kind: 'edges', elements: orphans.map((e) => e.path) })
    } else {
      phases = []
      if (nodes.length) phases.push({ kind: 'nodes', elements: nodes })
      if (edges.length) phases.push({ kind: 'edges', elements: edges.map((e) => e.path) })
    }

    const connectivity = new Map<string, ConnectivityEntry>()
    edges.forEach(({ path, from, to }) => {
      if (!from || !to) return
      ;[from, to].forEach((k) => {
        if (!connectivity.has(k))
          connectivity.set(k, { outPaths: [], inPaths: [], neighbors: new Set() })
      })
      connectivity.get(from)!.outPaths.push(path)
      connectivity.get(to)!.inPaths.push(path)
      connectivity.get(from)!.neighbors.add(to)
      connectivity.get(to)!.neighbors.add(from)
    })

    return { nodes, edges, phases, connectivity, kind: this.name }
  },
}

/* ------------------------------------------------------------------
 * 3. Sequence diagram adapter
 * ------------------------------------------------------------------ */

export const sequenceAdapter: Adapter = {
  name: 'sequence',
  label: 'Sequence',

  match(svg) {
    return (
      svg.classList.contains('sequence') ||
      !!svg.querySelector('.actor') ||
      !!svg.querySelector('.messageLine0, .messageLine1')
    )
  },

  prepare(svg) {
    const actorEls = [...svg.querySelectorAll('.actor')]
    const seenX = new Set<number | string>()
    const actors = actorEls.filter((el) => {
      const rect = el.getBoundingClientRect?.()
      const x = rect ? Math.round(rect.left) : el.getAttribute('x')
      if (x !== null && seenX.has(x)) return false
      if (x !== null) seenX.add(x)
      return true
    })
    actors.forEach((a) => a.setAttribute('data-dp-kind', 'actor'))

    const lifelines = [
      ...svg.querySelectorAll<SVGPathElement>('.actor-line, line.actor-line, line[class*="actor"]'),
    ]

    const messageCandidates = [
      ...svg.querySelectorAll(
        [
          '.messageLine0',
          '.messageLine1',
          '.activation',
          '.note rect',
          '.noteText',
          '.messageText',
          '.labelBox',
          '.labelText',
          'text.sequenceNumber',
        ].join(', '),
      ),
    ]

    const getY = (el: Element): number => {
      const y = el.getAttribute('y') || el.getAttribute('y1')
      if (y != null) return parseFloat(y)
      try {
        return el.getBoundingClientRect().top
      } catch {
        return 0
      }
    }
    messageCandidates.sort((a, b) => getY(a) - getY(b))

    const edgePaths = [...svg.querySelectorAll<SVGPathElement>('.messageLine0, .messageLine1')]
    const edges: EdgeEntry[] = edgePaths.map((path) => ({ path }))

    const isLine = (el: Element) =>
      el.classList.contains('messageLine0') || el.classList.contains('messageLine1')

    const phases: Phase[] = []
    if (actors.length) phases.push({ kind: 'nodes', elements: actors })
    if (lifelines.length) phases.push({ kind: 'edges', elements: lifelines })
    if (messageCandidates.length) {
      const batchSize = 3
      for (let i = 0; i < messageCandidates.length; i += batchSize) {
        const batch = messageCandidates.slice(i, i + batchSize)
        const lines = batch.filter((el) => isLine(el))
        const labels = batch.filter((el) => !isLine(el))
        if (lines.length) phases.push({ kind: 'edges', elements: lines })
        if (labels.length) phases.push({ kind: 'nodes', elements: labels })
      }
    }

    return { nodes: actors, edges, phases, kind: this.name }
  },
}

/* ------------------------------------------------------------------
 * 4. Generic fallback adapter
 * ------------------------------------------------------------------ */

export const fallbackAdapter: Adapter = {
  name: 'generic',
  label: 'Generic',

  match() {
    return true
  },

  prepare(svg) {
    const nodes = [...svg.querySelectorAll('g.node')]
    nodes.forEach((n) => n.setAttribute('data-dp-kind', 'process'))

    const pathSet = new Set<SVGPathElement>()
    ;['.edgePath path', 'path.flowchart-link', 'path.transition', 'path[marker-end]'].forEach(
      (sel) => svg.querySelectorAll<SVGPathElement>(sel).forEach((p) => pathSet.add(p)),
    )
    const edges: EdgeEntry[] = [...pathSet].map((path) => ({ path }))

    const phases: Phase[] = []
    if (nodes.length) phases.push({ kind: 'nodes', elements: nodes })
    if (edges.length) phases.push({ kind: 'edges', elements: edges.map((e) => e.path) })

    return { nodes, edges, phases, kind: this.name }
  },
}

/* ------------------------------------------------------------------
 * Registry — order matters: specific matchers before fallback
 * ------------------------------------------------------------------ */

export const adapters: Adapter[] = [
  flowchartAdapter,
  stateAdapter,
  sequenceAdapter,
  fallbackAdapter,
]

export function pickAdapter(svg: SVGSVGElement): Adapter {
  return adapters.find((a) => a.match(svg)) ?? fallbackAdapter
}
