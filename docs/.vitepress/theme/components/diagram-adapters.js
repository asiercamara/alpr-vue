/**
 * Diagram adapters for DiagramPresenter.
 * ------------------------------------------------------------------
 * Each adapter knows how to read a particular Mermaid-rendered SVG
 * and produce a normalized structure the component can animate:
 *
 *   adapter.prepare(svg) => {
 *     nodes:  Element[],                // all animatable "nodes"
 *     edges:  { path, from?, to? }[],   // all animatable "connections"
 *     phases: Phase[],                  // ordered playlist for "playAll"
 *     kind:   string                    // adapter name
 *   }
 *
 *   Phase = { kind: 'nodes' | 'edges', elements: Element[] }
 *
 * Add a new adapter in three steps:
 *   1. Export a new adapter object with { name, label, match, prepare }
 *   2. Import and register it in `adapters` below (before fallbackAdapter)
 *   3. Done — the component picks it up automatically via pickAdapter()
 */

/* ------------------------------------------------------------------
 * Shared helpers
 * ------------------------------------------------------------------ */

/**
 * BFS topological levelling tolerant to cycles.
 * Returns Array<Array<key>> where each inner array is a level.
 */
function bfsLevels (nodesByKey, edges, inDegree) {
  const visited = new Set()
  const levels = []
  let frontier = [...inDegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([k]) => k)

  // No root? pick any node — tolerates fully cyclic graphs.
  if (!frontier.length && nodesByKey.size) {
    frontier = [nodesByKey.keys().next().value]
  }

  let safety = 0
  while (frontier.length && safety++ < 500) {
    levels.push(frontier)
    frontier.forEach(k => visited.add(k))

    const candidates = new Set()
    edges.forEach(({ from, to }) => {
      if (visited.has(from) && !visited.has(to)) candidates.add(to)
    })
    const ready = [...candidates].filter(to =>
      edges.filter(e => e.to === to).every(e => visited.has(e.from))
    )
    frontier = ready.length ? ready : [...candidates]
  }

  const orphans = [...nodesByKey.keys()].filter(k => !visited.has(k))
  if (orphans.length) levels.push(orphans)
  return levels
}

/**
 * Build an alternating [nodes, edges, nodes, edges, ...] phase list
 * from BFS levels + "edges leaving level" groups.
 */
function buildLevelPhases (levels, edgesByFromKey, nodesByKey) {
  const phases = []
  levels.forEach(level => {
    const levelNodes = level.map(k => nodesByKey.get(k)).filter(Boolean)
    if (levelNodes.length) phases.push({ kind: 'nodes', elements: levelNodes })
    const leaving = level.flatMap(k => edgesByFromKey.get(k) || [])
    if (leaving.length) phases.push({ kind: 'edges', elements: leaving.map(e => e.path) })
  })
  return phases
}

/**
 * Extract LS-/LE- source/target encoded by Mermaid on edge containers.
 * Tries several combinations of ancestors and ids to be defensive
 * across Mermaid versions.
 */
function extractLsLe (path) {
  const ancestor = path.closest('g.edgePath, g.edge, g.transition, g.flowchart-link')
  const pool = [
    path.getAttribute('class'),
    ancestor?.getAttribute('class'),
    path.id,
    ancestor?.id
  ].filter(Boolean).join(' ')

  const ls = pool.match(/LS-([A-Za-z0-9_]+)/)
  const le = pool.match(/LE-([A-Za-z0-9_]+)/)
  return { from: ls?.[1], to: le?.[1] }
}

/* ------------------------------------------------------------------
 * extractNodeKey — robust node-id → semantic key extraction
 *
 * Actual Mermaid v11 format (verified by DOM inspection):
 *   "{renderId}-state-{StateName}-{num}"
 *   e.g. "dp-zwiz7ezx-state-Confirmed-6"
 *        "dp-zwiz7ezx-flowchart-A-4"
 *
 * So the renderId prefix must be stripped first, then the legacy
 * "state-…-N" / "flowchart-…-N" pattern applied.
 * ------------------------------------------------------------------ */
function extractNodeKey (n) {
  // Some Mermaid v11 shape types set data-id to the plain node name
  if (n.dataset && n.dataset.id && n.dataset.id !== 'undefined') {
    return n.dataset.id
  }

  const id = n.id || ''

  // Strip the renderId prefix when present: "dp-abc12345-…" → "…"
  // renderId is all-lowercase letters + hyphen + lowercase alphanum (e.g. "dp-zwiz7ezx")
  const stripped = id.replace(/^[a-z]+-[a-z0-9]+-/, '')
  const workId   = stripped || id

  // "state-Confirmed-6" → "Confirmed"   |   "flowchart-A-4" → "A"
  const m = workId.match(/^(?:flowchart|state)-(.+?)(?:-\d+)?$/)
  if (m) return m[1]

  // Fallback: use whatever we have after stripping
  return workId
}



export const flowchartAdapter = {
  name: 'flowchart',
  label: 'Flowchart',

  match (svg) {
    return svg.classList.contains('flowchart') ||
           svg.classList.contains('flowchart-v2') ||
           !!svg.querySelector('g.node[id^="flowchart-"]') ||
           // Mermaid v11: SVG has class "flowchart" or nodes have class containing "flowchart"
           !!svg.querySelector('g.node[class*="flowchart"]')
  },

  prepare (svg) {
    const rawNodes = [...svg.querySelectorAll('g.node')]
    const nodes = []
    const nodesByKey = new Map()
    const inDeg = new Map()

    rawNodes.forEach(n => {
      // Classify by shape
      const polygon   = n.querySelector('polygon')
      const rect      = n.querySelector('rect')
      const round     = n.querySelector('circle, ellipse')
      const isStadium = rect && parseFloat(rect.getAttribute('rx') || 0) > 15

      let kind = 'process'
      if (polygon)                 kind = 'decision'
      else if (round || isStadium) kind = 'terminus'
      n.setAttribute('data-dp-kind', kind)

      // Key extraction — works across Mermaid v9/v10/v11 id formats
      const key = extractNodeKey(n)
      n.dataset.dpKey = key

      nodes.push(n)
      nodesByKey.set(key, n)
      inDeg.set(key, 0)
    })

    const edges = []
    svg.querySelectorAll('.edgePath, path.flowchart-link').forEach(el => {
      const path = el.tagName === 'path' ? el : el.querySelector('path')
      if (!path || edges.some(e => e.path === path)) return
      const { from, to } = extractLsLe(path)
      edges.push({ path, from, to })
      if (to && inDeg.has(to)) inDeg.set(to, inDeg.get(to) + 1)
    })

    const levelKeys = bfsLevels(nodesByKey, edges, inDeg)

    // Index edges by from-key for level phasing
    const edgesByFromKey = new Map()
    edges.forEach(e => {
      if (!e.from) return
      if (!edgesByFromKey.has(e.from)) edgesByFromKey.set(e.from, [])
      edgesByFromKey.get(e.from).push(e)
    })

    const phases = buildLevelPhases(levelKeys, edgesByFromKey, nodesByKey)

    // Orphan edges (no recognised source) — append at the end as one block
    const phasedPaths = new Set(
      phases.filter(p => p.kind === 'edges').flatMap(p => p.elements)
    )
    const orphans = edges.filter(e => !phasedPaths.has(e.path))
    if (orphans.length) phases.push({ kind: 'edges', elements: orphans.map(e => e.path) })

    return { nodes, edges, phases, kind: this.name }
  }
}

/* ------------------------------------------------------------------
 * 2. State diagram  (stateDiagram-v2)
 * ------------------------------------------------------------------ */

export const stateAdapter = {
  name: 'state',
  label: 'State',

  match (svg) {
    return svg.classList.contains('statediagram') ||
           !!svg.querySelector('.statediagram-state') ||
           !!svg.querySelector('g.node[id^="state-"]') ||
           // Mermaid v11 uses the render id as prefix, no "state-" prefix
           !!svg.querySelector('g.node[class*="stateDiagram"]') ||
           !!svg.querySelector('g.node[class*="statediagram"]')
  },

  prepare (svg) {
    const rawNodes = [...svg.querySelectorAll('g.node')]
    const nodes = []
    const nodesByKey = new Map()
    const inDeg = new Map()

    rawNodes.forEach(n => {
      // Classify: state markers [*] render as a lone <circle> without label
      const hasLabel  = !!n.querySelector('.nodeLabel, foreignObject, .label')
      const hasCircle = !!n.querySelector('circle')
      const hasRect   = !!n.querySelector('rect')
      const idLower   = (n.id || '').toLowerCase()
      const isMarker  = (hasCircle && !hasRect && !hasLabel) ||
                        idLower.includes('_start') || idLower.includes('_end') ||
                        idLower.includes('-start') || idLower.includes('-end')
      // Composite/choice states use polygons or specific classes
      const isChoice  = n.classList.contains('statediagram-cluster') ||
                        n.classList.contains('statediagram-state--fork') ||
                        !!n.querySelector('polygon')

      let kind = 'process'
      if (isMarker)      kind = 'terminus'
      else if (isChoice) kind = 'decision'
      n.setAttribute('data-dp-kind', kind)

      // Key extraction — works across Mermaid v9/v10/v11 id formats
      const key = extractNodeKey(n)
      n.dataset.dpKey = key

      nodes.push(n)
      nodesByKey.set(key, n)
      inDeg.set(key, 0)
    })

    // State transitions — try multiple selectors (varies by Mermaid version)
    const pathSet = new Set()
    ;[
      'path.transition',
      '.edgePaths path',
      '.edgePath path',
      'g.transition path',
      'path.flowchart-link'
    ].forEach(sel => svg.querySelectorAll(sel).forEach(p => pathSet.add(p)))

    const edges = []
    pathSet.forEach(path => {
      if (edges.some(e => e.path === path)) return
      const { from, to } = extractLsLe(path)
      edges.push({ path, from, to })
      if (to && inDeg.has(to)) inDeg.set(to, inDeg.get(to) + 1)
    })

    // Build phases
    let phases
    const connected = edges.filter(e => e.from && e.to && nodesByKey.has(e.from) && nodesByKey.has(e.to))

    if (connected.length > 0 && nodesByKey.size > 1) {
      const levelKeys = bfsLevels(nodesByKey, connected, inDeg)
      const edgesByFromKey = new Map()
      edges.forEach(e => {
        if (!e.from) return
        if (!edgesByFromKey.has(e.from)) edgesByFromKey.set(e.from, [])
        edgesByFromKey.get(e.from).push(e)
      })
      phases = buildLevelPhases(levelKeys, edgesByFromKey, nodesByKey)

      const phasedPaths = new Set(
        phases.filter(p => p.kind === 'edges').flatMap(p => p.elements)
      )
      const orphans = edges.filter(e => !phasedPaths.has(e.path))
      if (orphans.length) phases.push({ kind: 'edges', elements: orphans.map(e => e.path) })
    } else {
      // Degraded fallback: couldn't recover connectivity from the SVG —
      // animate everything as two blocks. Still useful, just less sequential.
      phases = []
      if (nodes.length) phases.push({ kind: 'nodes', elements: nodes })
      if (edges.length) phases.push({ kind: 'edges', elements: edges.map(e => e.path) })
    }

    return { nodes, edges, phases, kind: this.name }
  }
}

/* ------------------------------------------------------------------
 * 3. Sequence diagram  (sequenceDiagram)
 * ------------------------------------------------------------------ */

export const sequenceAdapter = {
  name: 'sequence',
  label: 'Sequence',

  match (svg) {
    return svg.classList.contains('sequence') ||
           !!svg.querySelector('.actor') ||
           !!svg.querySelector('.messageLine0, .messageLine1')
  },

  prepare (svg) {
    // Actors (top and bottom copies — Mermaid duplicates them)
    const actorEls = [...svg.querySelectorAll('.actor')]
    // Deduplicate actors that share the same x position (top/bottom twins)
    const seenX = new Set()
    const actors = actorEls.filter(el => {
      const rect = el.getBoundingClientRect?.()
      const x = rect ? Math.round(rect.left) : el.getAttribute('x')
      if (seenX.has(x)) return false
      seenX.add(x)
      return true
    })
    actors.forEach(a => a.setAttribute('data-dp-kind', 'actor'))

    // Lifelines
    const lifelines = [...svg.querySelectorAll('.actor-line, line.actor-line, line[class*="actor"]')]

    // Message lines + arrowheads + labels — order by vertical position
    const messageCandidates = [
      ...svg.querySelectorAll([
        '.messageLine0',
        '.messageLine1',
        '.activation',
        '.note rect',
        '.noteText',
        '.messageText',
        '.labelBox',
        '.labelText',
        'text.sequenceNumber'
      ].join(', '))
    ]

    // Sort top-to-bottom by SVG y attribute or bounding box
    const getY = el => {
      const y = el.getAttribute('y') || el.getAttribute('y1')
      if (y != null) return parseFloat(y)
      try { return el.getBoundingClientRect().top } catch { return 0 }
    }
    messageCandidates.sort((a, b) => getY(a) - getY(b))

    // Edges = all message lines (for playEdges compat)
    const edgePaths = [
      ...svg.querySelectorAll('.messageLine0, .messageLine1')
    ]
    const edges = edgePaths.map(path => ({ path }))

    // Helper: is this element a drawable line (needs stroke-dash animation)?
    const isLine = el =>
      el.classList.contains('messageLine0') ||
      el.classList.contains('messageLine1')

    // Build phases: actors → lifelines → then messages interleaved (line draws + text fades)
    const phases = []
    if (actors.length)    phases.push({ kind: 'nodes', elements: actors })
    if (lifelines.length) phases.push({ kind: 'edges', elements: lifelines })
    if (messageCandidates.length) {
      // Process in small vertical batches; within each batch separate lines from labels
      // so lines get stroke-draw animation and labels get opacity-fade animation.
      const batchSize = 3
      for (let i = 0; i < messageCandidates.length; i += batchSize) {
        const batch = messageCandidates.slice(i, i + batchSize)
        const lines  = batch.filter(el => isLine(el))
        const labels = batch.filter(el => !isLine(el))
        if (lines.length)  phases.push({ kind: 'edges', elements: lines })
        if (labels.length) phases.push({ kind: 'nodes', elements: labels })
      }
    }

    return { nodes: actors, edges, phases, kind: this.name }
  }
}

/* ------------------------------------------------------------------
 * 4. Generic fallback
 * ------------------------------------------------------------------ */

export const fallbackAdapter = {
  name: 'generic',
  label: 'Generic',

  match () { return true },

  prepare (svg) {
    const nodes = [...svg.querySelectorAll('g.node')]
    nodes.forEach(n => n.setAttribute('data-dp-kind', 'process'))

    const pathSet = new Set()
    ;[
      '.edgePath path',
      'path.flowchart-link',
      'path.transition',
      'path[marker-end]'
    ].forEach(sel => svg.querySelectorAll(sel).forEach(p => pathSet.add(p)))
    const edges = [...pathSet].map(path => ({ path }))

    const phases = []
    if (nodes.length) phases.push({ kind: 'nodes', elements: nodes })
    if (edges.length) phases.push({ kind: 'edges', elements: edges.map(e => e.path) })

    return { nodes, edges, phases, kind: this.name }
  }
}

/* ------------------------------------------------------------------
 * Registry — order matters: specific matchers before fallback
 * ------------------------------------------------------------------ */

export const adapters = [flowchartAdapter, stateAdapter, sequenceAdapter, fallbackAdapter]

export function pickAdapter (svg) {
  return adapters.find(a => a.match(svg)) || fallbackAdapter
}
