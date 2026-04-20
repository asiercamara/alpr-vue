import { describe, expect, it, vi } from 'vitest'

import {
  fallbackAdapter,
  flowchartAdapter,
  pickAdapter,
  sequenceAdapter,
  stateAdapter,
} from '@docs-theme/components/DiagramPresenter/diagram-adapters.js'

function parseSvg(markup: string) {
  const container = document.createElement('div')
  container.innerHTML = markup.trim()
  return container.querySelector('svg') as SVGSVGElement
}

describe('diagram adapters', () => {
  it('picks and prepares flowchart diagrams with connectivity and phases', () => {
    const svg = parseSvg(`
      <svg class="flowchart" viewBox="0 0 100 100">
        <g class="node" id="flowchart-Start-1"><rect width="20" height="10" /></g>
        <g class="node" id="flowchart-End-2"><circle r="5" /></g>
        <g class="edgePath LS-Start LE-End"><path class="flowchart-link" /></g>
      </svg>
    `)

    expect(pickAdapter(svg)).toBe(flowchartAdapter)

    const prepared = flowchartAdapter.prepare(svg)

    expect(prepared.kind).toBe('flowchart')
    expect(prepared.nodes).toHaveLength(2)
    expect(prepared.edges).toHaveLength(1)
    expect(prepared.phases).toHaveLength(3)
    expect(prepared.nodes[0].dataset.dpKind).toBe('process')
    expect(prepared.nodes[1].dataset.dpKind).toBe('terminus')
    expect(prepared.connectivity.get('Start')?.neighbors.has('End')).toBe(true)
  })

  it('picks and prepares state diagrams with marker and transition phases', () => {
    const svg = parseSvg(`
      <svg class="statediagram" viewBox="0 0 100 100">
        <g class="node" id="state-start-1"><circle r="5" /></g>
        <g class="node" id="state-Active-2"><rect width="20" height="10" /></g>
        <g class="edgePath LS-start LE-Active"><path class="transition" /></g>
      </svg>
    `)

    expect(pickAdapter(svg)).toBe(stateAdapter)

    const prepared = stateAdapter.prepare(svg)

    expect(prepared.kind).toBe('state')
    expect(prepared.nodes).toHaveLength(2)
    expect(prepared.edges).toHaveLength(1)
    expect(prepared.nodes[0].dataset.dpKind).toBe('terminus')
    expect(prepared.phases.length).toBeGreaterThan(0)
  })

  it('picks and prepares sequence diagrams with actor deduplication', () => {
    const svg = parseSvg(`
      <svg class="sequence" viewBox="0 0 100 100">
        <rect class="actor" x="10" y="0" width="10" height="10"></rect>
        <rect class="actor" x="10" y="80" width="10" height="10"></rect>
        <line class="actor-line" x1="15" x2="15" y1="10" y2="80"></line>
        <path class="messageLine0" y="20"></path>
        <text class="messageText" y="21">Hello</text>
      </svg>
    `)

    const actors = svg.querySelectorAll('.actor')
    vi.spyOn(actors[0], 'getBoundingClientRect').mockReturnValue({ left: 10 } as DOMRect)
    vi.spyOn(actors[1], 'getBoundingClientRect').mockReturnValue({ left: 10 } as DOMRect)

    expect(pickAdapter(svg)).toBe(sequenceAdapter)

    const prepared = sequenceAdapter.prepare(svg)

    expect(prepared.kind).toBe('sequence')
    expect(prepared.nodes).toHaveLength(1)
    expect(prepared.edges).toHaveLength(1)
    expect(prepared.phases.length).toBeGreaterThanOrEqual(2)
  })

  it('falls back to generic adapter when no specific matcher applies', () => {
    const svg = parseSvg(`
      <svg viewBox="0 0 100 100">
        <g class="node"><rect width="20" height="10" /></g>
      </svg>
    `)

    expect(pickAdapter(svg)).toBe(fallbackAdapter)

    const prepared = fallbackAdapter.prepare(svg)
    expect(prepared.kind).toBe('generic')
    expect(prepared.nodes).toHaveLength(1)
  })
})
