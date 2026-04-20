---
title: 'DiagramPresenter — Developer Guide'
description: 'How to embed animated Mermaid diagrams in the ALPR Vue docs using the DiagramPresenter component.'
---

# DiagramPresenter — Developer Guide

`DiagramPresenter` is the custom Vue component used across all docs pages to display animated Mermaid diagrams. It replaces plain Mermaid fences with a presentation-quality wrapper backed by GSAP timelines.

> **Note:** This page is for contributors editing the documentation. It is not part of the public-facing help docs.

## Quick start

Every diagram needs two things in the Markdown file: a `<script setup>` block that defines the Mermaid source as a template literal, and the `<DiagramPresenter>` tag that receives it.

```md
<script setup>
const myDiagram = `
flowchart TD
  A[Start] --> B{OK?}
  B -->|Yes| C[Done]
  B -->|No|  D[Retry]
  D --> B
`
</script>

<DiagramPresenter :code="myDiagram" />
```

The component is globally registered — no import needed.

## Props reference

| Prop            | Type                                                   | Default          | Description                                                                                                                                      |
| --------------- | ------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `code`          | `string`                                               | — **(required)** | Mermaid source code                                                                                                                              |
| `preset`        | `'auto' \| 'soft' \| 'neon'`                           | `'auto'`         | Visual style preset. `auto` follows the page's dark/light mode; `soft` uses muted pastels; `neon` uses vivid accent colors on a dark background. |
| `controls`      | `boolean`                                              | `true`           | Show the animation toolbar (play, speed, loop)                                                                                                   |
| `showBadge`     | `boolean`                                              | `false`          | Show the detected adapter name — useful when debugging a new diagram                                                                             |
| `autoPlay`      | `'none' \| 'nodes' \| 'edges' \| 'all' \| 'intersect'` | `'none'`         | When to start the animation automatically. `intersect` starts when the diagram scrolls into view.                                                |
| `highlight`     | `string[]`                                             | `[]`             | Node keys to pulse or glow after animation completes (see [Highlight](#highlight))                                                               |
| `highlightMode` | `'pulse' \| 'glow'`                                    | `'pulse'`        | `pulse` plays 3 cycles then stops; `glow` is persistent                                                                                          |
| `speed`         | `'slow' \| 'normal' \| 'fast'`                         | `'normal'`       | Initial animation speed. The reader can change this at runtime via the toolbar.                                                                  |
| `loop`          | `boolean`                                              | `false`          | Restart animation automatically when it ends                                                                                                     |
| `caption`       | `string`                                               | `''`             | Text shown below the diagram as a `<figcaption>`                                                                                                 |
| `timing`        | `object`                                               | see below        | Fine-grained duration overrides (in seconds, before speed multiplier)                                                                            |

### `timing` defaults

```js
{
  nodeDuration: 0.45,   // how long each node fade-in takes
  nodeStagger:  0.11,   // delay between nodes in the same level
  edgeDuration: 0.70,   // how long each edge draw takes
  edgeStagger:  0.09,   // delay between edges
  levelGap:     0.10    // pause between BFS levels
}
```

## Presets

### `auto` (default)

Adapts to the reader's current theme. Uses the VitePress brand palette.

```md
<DiagramPresenter :code="myDiagram" />
```

### `soft`

Muted pastel tones, suitable for process flows or overview diagrams.

```md
<DiagramPresenter :code="myDiagram" preset="soft" />
```

### `neon`

Vivid accent colors on a dark background. Best for technical or architecture diagrams.

```md
<DiagramPresenter :code="myDiagram" preset="neon" autoPlay="intersect" />
```

## `autoPlay`

| Value         | Behaviour                                                                       |
| ------------- | ------------------------------------------------------------------------------- |
| `'none'`      | No automatic play; reader clicks ▶                                              |
| `'nodes'`     | Animate only nodes on mount                                                     |
| `'edges'`     | Animate only edges on mount                                                     |
| `'all'`       | Animate both on mount                                                           |
| `'intersect'` | Start animation when the diagram scrolls into view (recommended for long pages) |

`intersect` is the recommended default for all production docs pages.

## Highlight

The `highlight` prop accepts an array of **node keys** — the semantic name used in the Mermaid source, not an HTML id.

```md
<DiagramPresenter
  :code="detectionFlow"
  preset="neon"
  autoPlay="intersect"
  :highlight="['Confirmed', 'SaveResult']"
/>
```

### Finding node keys

For a flowchart node like `Process[Process Data]` the key is `Process`.  
For a state diagram state like `Confirmed` the key is `Confirmed`.  
For sequence diagram participants, the key is the participant alias (e.g. `Worker`).

Enable `showBadge` and open the browser console — the component logs all detected node keys on render:

```
=== NODES (8) ===
dpKey="Idle" ...
dpKey="Active" ...
```

### `highlightMode`

- **`pulse`** — three glow pulses, then off (default — good for drawing attention)
- **`glow`** — persistent accent glow (good for "current state" diagrams)

## Public API

The component exposes methods for programmatic control — useful if you embed it inside another Vue component or playground:

```js
const dp = ref(null) // template ref

dp.value.play() // full animation
dp.value.playNodes() // nodes only
dp.value.playEdges() // edges only
dp.value.pause()
dp.value.resume()
dp.value.togglePause()
dp.value.reset() // resets to initial (hidden) state
dp.value.seek(0.5) // jump to 50 % of the timeline
dp.value.setSpeed('fast')
dp.value.setLoop(true)
dp.value.getTimeline() // returns raw GSAP timeline
dp.value.getAdapter() // returns adapter name ('flowchart' | 'state' | 'sequence' | 'fallback')
```

## Events

| Event           | Payload       | Description                            |
| --------------- | ------------- | -------------------------------------- |
| `ready`         | `{ adapter }` | Diagram rendered and timeline built    |
| `play-start`    | `{}`          | Animation started                      |
| `play-complete` | `{}`          | Animation finished (or loop restarted) |

## Supported diagram types

The component uses an **adapter system** — each adapter handles one Mermaid diagram type and produces an ordered animation playlist:

| Adapter     | Mermaid syntax      | Phases                            |
| ----------- | ------------------- | --------------------------------- |
| `flowchart` | `flowchart TD/LR/…` | BFS level-by-level nodes → edges  |
| `state`     | `stateDiagram-v2`   | Top-to-bottom nodes → transitions |
| `sequence`  | `sequenceDiagram`   | Actors → messages top-to-bottom   |
| `fallback`  | Any other type      | Flat fade-in of all SVG elements  |

## Double-click to maximize

All diagrams support double-click to open a full-screen modal with pan (drag) and zoom (scroll wheel). This is enabled by default and requires no configuration.

### Viewport minimap

When you zoom in past the initial fit level, a **minimap overlay** appears in the bottom-right corner of the modal. It shows:

- The full diagram at a glance as a small thumbnail.
- A highlighted rectangle representing the currently visible area.
- A zoom level label (e.g. `2.4×`).

The minimap disappears automatically when you zoom back out so the entire diagram fits the screen again. It is purely informational — all navigation is still done by dragging and scrolling on the main stage.

## Interactive playground

Experiment with all props live at [DiagramPresenter Playground](/diagram-playground).

## Adding a new page with a diagram

1. Create or edit a `.md` file in `docs/` (English) or `docs/es/` (Spanish).
2. Add a `<script setup>` block at the top with your Mermaid source as a template literal.
3. Use `<DiagramPresenter>` with at least `:code`.
4. Set `autoPlay="intersect"` for diagrams that appear mid-page.
5. Run `pnpm dev:docs` to preview.
6. Run `pnpm build:docs` before opening a pull request.

## Troubleshooting

**Diagram doesn't render / console shows Mermaid parse error**  
Check the Mermaid syntax. The component passes source unchanged to `mermaid.render()`.

**`highlight` prop has no visible effect**  
Enable `showBadge` and check the console for the `=== NODES ===` list. Make sure the strings in your `highlight` array exactly match the `dpKey` values printed there.

**Animation doesn't start automatically**  
Set `autoPlay="intersect"` (or `"all"`). The default is `"none"`.

**Nodes appear but edges are missing**  
This is a known issue with some sequence diagram syntaxes. Verify that the diagram renders correctly in the plain Mermaid live editor before embedding it.
