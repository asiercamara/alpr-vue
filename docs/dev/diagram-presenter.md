---
title: 'DiagramPresenter — Developer Guide'
description: 'How to embed animated Mermaid diagrams in the ALPR Vue docs using the DiagramPresenter component.'
---

# DiagramPresenter — Developer Guide

`DiagramPresenter` is the custom Vue component used across the docs to turn Mermaid diagrams into presentation-ready, animated SVGs. It wraps Mermaid rendering, type-aware adapters, GSAP timelines, fullscreen inspection, and contributor-focused controls in a single component.

> **Note:** This page is for contributors editing the documentation. It is not part of the public-facing help docs.

## Quick start

Every diagram needs two things in the Markdown file: a `<script setup>` block with the Mermaid source, and a `<DiagramPresenter>` tag that receives it.

```md
<script setup>
const myDiagram = `
flowchart TD
  A[Start] --> B{OK?}
  B -->|Yes| C[Done]
  B -->|No| D[Retry]
  D --> B
`
</script>

<DiagramPresenter :code="myDiagram" />
```

The component is globally registered, so no import is needed in Markdown.

## Props reference

| Prop            | Type                                                   | Default          | Description                                                                                                                              |
| --------------- | ------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `code`          | `string`                                               | — **(required)** | Mermaid source code.                                                                                                                     |
| `preset`        | `'auto' \| 'soft' \| 'neon'`                           | `'auto'`         | Visual style preset. `auto` follows the docs theme, `soft` is optimized for light mode, `neon` is optimized for dark technical diagrams. |
| `controls`      | `boolean`                                              | `true`           | Show the toolbar and playback controls.                                                                                                  |
| `showBadge`     | `boolean`                                              | `false`          | Show the active adapter badge (`flowchart`, `state`, `sequence`, `fallback`).                                                            |
| `autoPlay`      | `'none' \| 'nodes' \| 'edges' \| 'all' \| 'intersect'` | `'none'`         | Automatic playback strategy. `intersect` is best for long docs pages.                                                                    |
| `highlight`     | `string[]`                                             | `[]`             | Node keys to emphasize after playback completes.                                                                                         |
| `highlightMode` | `'pulse' \| 'glow'`                                    | `'pulse'`        | Highlight style. `pulse` is finite; `glow` is persistent.                                                                                |
| `speed`         | `'slow' \| 'normal' \| 'fast'`                         | `'normal'`       | Initial playback speed. Readers can still change it from the toolbar.                                                                    |
| `loop`          | `boolean`                                              | `false`          | Replay continuously after completion. Not used together with `phaseNav`.                                                                 |
| `caption`       | `string`                                               | `''`             | Text shown below the diagram.                                                                                                            |
| `phaseNav`      | `boolean`                                              | `false`          | Replace continuous playback with step-by-step `Prev / Next` phase navigation and dot indicators.                                         |
| `spotlight`     | `boolean`                                              | `false`          | Dim unrelated branches when hovering a node. Best on flowchart/state diagrams.                                                           |
| `timing`        | `object`                                               | see below        | Fine-grained duration overrides (in seconds, before speed multiplier).                                                                   |

### `timing` defaults

```js
{
  nodeDuration: 0.45,
  nodeStagger: 0.11,
  edgeDuration: 0.70,
  edgeStagger: 0.09,
  levelGap: 0.10
}
```

## Presets

### `auto`

Adapts automatically to the current VitePress theme.

```md
<DiagramPresenter :code="myDiagram" />
```

### `soft`

Best choice for light-mode documentation. The refined light-mode tokens give nodes, edges, and the stage frame more contrast than the original version.

```md
<DiagramPresenter :code="myDiagram" preset="soft" />
```

### `neon`

High-contrast dark presentation mode with stronger highlights and edge glow after playback.

```md
<DiagramPresenter
  :code="myDiagram"
  preset="neon"
  autoPlay="intersect"
  :highlight="['Confirmed']"
  highlightMode="glow"
/>
```

## Playback modes

### `autoPlay`

| Value         | Behavior                                         |
| ------------- | ------------------------------------------------ |
| `'none'`      | No automatic playback.                           |
| `'nodes'`     | Animate only nodes on mount.                     |
| `'edges'`     | Animate only edges on mount.                     |
| `'all'`       | Animate nodes + edges in adapter order on mount. |
| `'intersect'` | Start when the diagram enters the viewport.      |

For production docs pages, `intersect` is usually the best default.

### `phaseNav`

Use `phaseNav` when a diagram should behave like a guided walkthrough rather than a continuous animation timeline.

```md
<DiagramPresenter
  :code="myDiagram"
  phaseNav
  caption="Step through the flow one phase at a time"
/>
```

When `phaseNav` is enabled:

- `Prev / Next` buttons replace the normal play button
- a dot indicator shows the current phase position
- the scrubber is hidden
- looped playback is intentionally not combined with this mode

## Highlight

The `highlight` prop accepts **node keys** from the Mermaid source, not DOM IDs.

```md
<DiagramPresenter
  :code="detectionFlow"
  preset="neon"
  autoPlay="intersect"
  :highlight="['Confirmed', 'SaveResult']"
/>
```

### Finding node keys

For a flowchart node like `Process[Process Data]`, the key is `Process`.  
For a state node like `Confirmed`, the key is `Confirmed`.  
For sequence participants, the key is the participant alias (for example `Worker`).

Enable `showBadge` and inspect the console if you need to confirm what the adapter extracted.

## Hover spotlight

`spotlight` dims nodes and edges that are not directly connected to the hovered node.

```md
<DiagramPresenter
  :code="flowDiagram"
  spotlight
  caption="Hover any node to inspect the surrounding branch"
/>
```

Notes:

- Works best for `flowchart` and `stateDiagram-v2`, where the adapters can compute connectivity.
- Sequence diagrams do not provide the same graph-style connectivity, so spotlight stays inactive there.

## Fullscreen modal, minimap, and shortcuts

All diagrams support double-click to open a fullscreen modal. Once open, the reader can drag to pan, use the wheel/pinch to zoom, and double-click a node to focus it.

### Keyboard shortcuts

| Shortcut        | Action                         |
| --------------- | ------------------------------ |
| `Space`         | Pause / resume                 |
| `←` / `→`       | Seek backward / forward        |
| `1` / `2` / `3` | Set slow / normal / fast speed |
| `R`             | Reset playback                 |
| `F`             | Reset zoom                     |
| `Esc`           | Close the modal                |

### Viewport minimap

When the zoom level exceeds the initial fit, a minimap appears in the bottom-right corner of the modal. It shows the full SVG, the visible viewport rectangle, and the current zoom label.

## Reduced motion

`DiagramPresenter` respects `prefers-reduced-motion` automatically:

- playback jumps to the end state instead of running long tweens
- highlight states become static instead of pulsing repeatedly
- decorative entrance motion is skipped

This behavior is built into the component and needs no extra prop.

## Export

The modal toolbar includes an **Export SVG** action. SVG is the recommended output because Mermaid labels use `<foreignObject>`, and SVG preserves the exact styling and text fidelity.

Programmatic export is also available from the exposed API:

```js
const dp = ref(null)

dp.value.exportDiagram() // SVG
dp.value.exportDiagram('svg') // same explicit form
```

There is also a best-effort PNG path in the exposed API, but SVG remains the supported format we recommend in documentation work.

## Story mode pattern

There is no extra `next` prop. Chain presenters using the existing `play-complete` event and the exposed methods:

```md
<script setup>
import { ref } from 'vue'

const first = ref(null)
const second = ref(null)

function playSecondStep() {
  setTimeout(() => second.value?.play?.(), 400)
}
</script>

<DiagramPresenter
ref="first"
:code="firstDiagram"
@play-complete="playSecondStep"
/>

<DiagramPresenter
  ref="second"
  :code="secondDiagram"
  :controls="false"
/>
```

Use this for tutorial-like sequences, onboarding flows, or before/after explanations in docs.

## Public API

The component exposes imperative methods through `defineExpose`, which is mainly useful in Vue wrappers or playgrounds:

```js
const dp = ref(null)

dp.value.play()
dp.value.playNodes()
dp.value.playEdges()
dp.value.pause()
dp.value.resume()
dp.value.togglePause()
dp.value.reset()
dp.value.seek(0.5)
dp.value.setSpeed('fast')
dp.value.setLoop(true)
dp.value.getTimeline()
dp.value.getAdapter()
dp.value.exportDiagram()
```

## Events

| Event           | Payload       | Description                            |
| --------------- | ------------- | -------------------------------------- |
| `ready`         | `{ adapter }` | Diagram rendered and adapter prepared. |
| `play-start`    | `{}`          | Playback started.                      |
| `play-complete` | `{}`          | Playback finished (or loop restarted). |

## Supported diagram types

The adapter system currently supports:

| Adapter     | Mermaid syntax        | Playback model                            |
| ----------- | --------------------- | ----------------------------------------- |
| `flowchart` | `flowchart TD/LR/...` | BFS level-by-level nodes then edges       |
| `state`     | `stateDiagram-v2`     | Top-to-bottom nodes then transitions      |
| `sequence`  | `sequenceDiagram`     | Actors first, then messages top-to-bottom |
| `fallback`  | Anything else         | Flat fade-in of all SVG elements          |

## Interactive playground

Use the [DiagramPresenter Playground](/dev/diagram-playground) to:

- edit props live
- switch between preconfigured feature presets
- test phase navigation and spotlight without rewriting a snippet
- validate the story-mode pattern before copying it into a docs page

## Adding a new docs page with a diagram

1. Create or edit a `.md` file in `docs/` (English) or `docs/es/` (Spanish).
2. Add a `<script setup>` block with your Mermaid source as a template literal.
3. Render it with `<DiagramPresenter :code="myDiagram" />`.
4. Use `autoPlay="intersect"` for diagrams that appear mid-page.
5. Validate the behavior in `pnpm dev:docs`.
6. Run `pnpm build:docs` before opening a pull request.

## Troubleshooting

**Diagram does not render / Mermaid parser error**  
Check the Mermaid syntax first. The component forwards the source directly to `mermaid.render()`.

**Highlight does not appear**  
Verify that the strings in `highlight` match the extracted `dpKey` values exactly.

**Spotlight seems inactive**  
Check the adapter type. `spotlight` is only meaningful when the adapter can compute graph connectivity.

**Animation should be quieter for accessibility testing**  
Enable reduced motion at the OS/browser level and re-open the page. The component adapts automatically.

**Need a chained sequence of diagrams**  
Use the `play-complete` event pattern shown above instead of expecting a dedicated story prop.
