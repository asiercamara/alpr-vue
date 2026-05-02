# Component Reference

Full prop reference for every `VTDoc*` component shipped by `vitepress-theme-app-docs`. All components are globally auto-registered — use them directly in Markdown without imports. Slot content is Markdown.

## Table of contents

- [Callouts](#callouts) — `VTDocNote`, `VTDocTip`, `VTDocInfo`, `VTDocWarning`, `VTDocCheck`
- [Cards](#cards) — `VTDocCard`, `VTDocCardGroup`
- [Steps](#steps) — `VTDocSteps`, `VTDocStep`
- [Tabs](#tabs) — `VTDocTabs`, `VTDocTab`
- [Accordions](#accordions) — `VTDocAccordionGroup`, `VTDocAccordion`
- [Diagram Presenter](#diagram-presenter) — `VTDocDiagramPresenter`
- [Mindmap](#mindmap) — `VTDocMindmap`
- [Layout / Frontmatter](#layout--frontmatter)

---

## Callouts

Five flavors. All have the same shape: a single default slot of Markdown content. No props.

| Component      | When                                                            |
| -------------- | --------------------------------------------------------------- |
| `VTDocNote`    | Contextual aside, design rationale.                             |
| `VTDocTip`     | Recommended path / happy-path advice.                           |
| `VTDocInfo`    | Neutral fact that should stand out (specs, accessibility note). |
| `VTDocWarning` | Risk, prerequisite, irreversible action, breaking change.       |
| `VTDocCheck`   | Success state, validation, confirmed completion.                |

```md
<VTDocTip>

Use the default `underline` variant unless you need pills or segmented.

</VTDocTip>
```

Pick at most one callout per logical idea. Stacking callouts dilutes them.

---

## Cards

### `VTDocCardGroup`

| Prop   | Type               | Default | Notes                                                 |
| ------ | ------------------ | ------- | ----------------------------------------------------- |
| `cols` | `number \| string` | `2`     | Grid columns. Use `:cols="3"` (Vue bind) for numbers. |

### `VTDocCard`

| Prop    | Type             | Default  | Notes                                  |
| ------- | ---------------- | -------- | -------------------------------------- |
| `title` | `string`         | required | Card heading.                          |
| `icon`  | enum (see below) | —        | Optional. Omit if none fits.           |
| `href`  | `string`         | —        | If set, the whole card becomes a link. |

**Icon enum (use exactly one of these strings):**
`camera`, `image`, `video`, `list-check`, `rocket`, `browser`, `file-csv`, `gear`, `language`, `pen`, `shield-halved`, `sliders`, `sun`, `upload`.

```md
<VTDocCardGroup :cols="3">
  <VTDocCard title="Quickstart" icon="rocket" href="/guide/getting-started">

    Add the package, peer dependencies, and the theme wrapper.

  </VTDocCard>
  <VTDocCard title="i18n" icon="language" href="/guide/i18n">

    Set up locale routing and translated frontmatter.

  </VTDocCard>
  <VTDocCard title="Custom Adapters" icon="gear" href="/guide/custom-adapters">

    Register adapters for the diagram presenter.

  </VTDocCard>
</VTDocCardGroup>
```

Use cards for navigation/entry points. They are not a replacement for bullet lists or tables.

---

## Steps

### `VTDocSteps`

| Prop   | Type                               | Default     | Notes         |
| ------ | ---------------------------------- | ----------- | ------------- |
| `type` | `'decimal' \| 'alpha' \| 'bullet'` | `'decimal'` | Marker style. |

- `decimal` — ordered procedure (1, 2, 3).
- `alpha` — labeled alternatives (A, B, C). NOT a sequence.
- `bullet` — unordered considerations / requirements.

### `VTDocStep`

| Prop    | Type     | Default  | Notes                 |
| ------- | -------- | -------- | --------------------- |
| `title` | `string` | required | Heading for the step. |

```md
<VTDocSteps>
  <VTDocStep title="Install the package">

    Add `vitepress-theme-app-docs` to your VitePress site.

  </VTDocStep>
  <VTDocStep title="Wire up the theme entry">

    Re-export the theme from `.vitepress/theme/index.ts`.

  </VTDocStep>
  <VTDocStep title="Author with components">

    Drop callouts, cards, tabs, and steps directly in Markdown.

  </VTDocStep>
</VTDocSteps>
```

Always at least 2 steps. A single step should be a paragraph.

---

## Tabs

### `VTDocTabs`

| Prop      | Type                                    | Default       | Notes              |
| --------- | --------------------------------------- | ------------- | ------------------ |
| `variant` | `'underline' \| 'pills' \| 'segmented'` | `'underline'` | Visual style only. |

- `underline` — default, fits most pages.
- `pills` — compact, modern look.
- `segmented` — button-group; good for binary or short option lists.

### `VTDocTab`

| Prop    | Type     | Default  | Notes                                                    |
| ------- | -------- | -------- | -------------------------------------------------------- |
| `title` | `string` | required | Tab label. Must be unique within the parent `VTDocTabs`. |

Tabs support full keyboard navigation (arrow keys).

````md
<VTDocTabs>
  <VTDocTab title="pnpm">

```bash
pnpm add vitepress-theme-app-docs
```
````

  </VTDocTab>
  <VTDocTab title="npm">

```bash
npm install vitepress-theme-app-docs
```

  </VTDocTab>
</VTDocTabs>
```

**Critical formatting rule:** When a fenced code block lives inside a tab, leave a blank line between the opening `<VTDocTab ...>` and the fence, and another blank line between the closing fence and `</VTDocTab>`. Without those blank lines the Markdown parser leaves the fence as raw text.

---

## Accordions

### `VTDocAccordionGroup`

No props. Wraps a series of `VTDocAccordion` items.

### `VTDocAccordion`

| Prop    | Type     | Default  | Notes                 |
| ------- | -------- | -------- | --------------------- |
| `title` | `string` | required | Header / toggle text. |

Accordions start collapsed. Use them for FAQs and secondary detail you want to keep off the page until the reader asks for it.

```md
<VTDocAccordionGroup>
  <VTDocAccordion title="Are the components auto-registered?">

    Yes — they are registered in the theme's `enhanceApp` hook.

  </VTDocAccordion>
  <VTDocAccordion title="Can I extend the theme?">

    Yes. Use `extends` and re-call the original `enhanceApp`.

  </VTDocAccordion>
</VTDocAccordionGroup>
```

**Antipattern — content as a string prop:** slot content must be written inline in the `.md` file so VitePress compiles it as Markdown and Vue template. Passing content from a JS variable, JSON file, or `:content="..."` prop renders as raw text — markdown syntax like `[link](url)` and Vue components like `<VTDocNote>` won't process.

```md
<!-- ❌ content from a JS string — markdown and VTDoc* components render as raw text -->
<VTDocAccordion title="Q" :content="answerString" />

<!-- ✅ inline slot — VitePress compiles it -->
<VTDocAccordion title="Q">

Content with **bold**, [links](./url), and `<VTDocNote>` components.

</VTDocAccordion>
```

---

## Diagram Presenter

`VTDocDiagramPresenter` turns Mermaid source into an interactive walkthrough.

| Prop            | Type                             | Default    | Notes                                                                      |
| --------------- | -------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `code`          | `string`                         | required   | Mermaid source. Pass via a `<script setup>` const for multi-line diagrams. |
| `preset`        | `'auto' \| 'soft' \| 'neon'`     | `'auto'`   | Visual style. `auto` follows VitePress theme.                              |
| `controls`      | `boolean`                        | `true`     | Show playback toolbar.                                                     |
| `showBadge`     | `boolean`                        | `false`    | Adapter name badge — useful while authoring.                               |
| `autoPlay`      | `'none' \| 'all' \| 'intersect'` | `'none'`   | `'intersect'` plays when scrolled into view.                               |
| `highlight`     | `string[]`                       | —          | Mermaid node keys to pulse/glow after playback.                            |
| `highlightMode` | `'pulse' \| 'glow'`              | `'pulse'`  | Transient or persistent highlight.                                         |
| `speed`         | `'slow' \| 'normal' \| 'fast'`   | `'normal'` | Initial playback speed.                                                    |
| `loop`          | `boolean`                        | `false`    | Replay continuously.                                                       |
| `caption`       | `string`                         | —          | Italic caption below the diagram.                                          |
| `phaseNav`      | `boolean`                        | `false`    | Replace continuous playback with Prev/Next phase navigation.               |
| `spotlight`     | `boolean`                        | `false`    | Dim unrelated nodes on hover (best for `flowchart` / `stateDiagram-v2`).   |
| `timing`        | `Partial<TimingConfig>`          | —          | Per-phase duration overrides in seconds.                                   |

```md
<script setup>
const flow = `flowchart LR
  A[Start] --> B{Choice}
  B -->|yes| C[Done]
  B -->|no| D[Retry]`
</script>

<VTDocDiagramPresenter
  :code="flow"
  auto-play="intersect"
  caption="Decision flow"
/>
```

For simple, one-shot diagrams a plain ` ```mermaid ` fence is enough — only reach for the presenter when you want playback, phases, highlighting, or spotlight.

---

## Mindmap

`VTDocMindmap` renders a Markmap-based interactive mindmap from Markdown hierarchy (headings + lists).

| Prop      | Type                           | Default   | Notes                                                      |
| --------- | ------------------------------ | --------- | ---------------------------------------------------------- |
| `code`    | `string`                       | required  | Markdown source — `#` headings and `-` lists become nodes. |
| `height`  | `string \| number`             | `'400px'` | Container height. CSS units allowed.                       |
| `options` | `Partial<IMarkmapJSONOptions>` | —         | Markmap layout/visual options (e.g. `initialExpandLevel`). |
| `caption` | `string`                       | —         | Italic caption below the mindmap.                          |
| `label`   | `string`                       | —         | Accessible label (used by screen readers when no caption). |

The toolbar includes **Prev / Next level** buttons and a dot indicator for navigating tree depth. The initial depth defaults to fully expanded unless `options.initialExpandLevel` is set. The user's chosen depth resets when `code` changes (new tree) but is preserved when `options` changes (e.g. inline `:options="{...}"` re-renders on the parent).

```md
<script setup>
const map = `# Theme features
## Components
- Callouts
- Cards
## Diagrams
- Mermaid presenter
- Mindmap`
</script>

<VTDocMindmap :code="map" height="350px" caption="Theme overview" />
```

---

## Layout / Frontmatter

The theme renders a `VTDocPageHeader` automatically using the page's `title` and `description` frontmatter. There's also an integrated print button that fires `vtdoc:before-print` so diagrams can re-render for high-resolution PDF output.

| Frontmatter key | Type      | Notes                                                                                      |
| --------------- | --------- | ------------------------------------------------------------------------------------------ |
| `title`         | `string`  | Becomes the page header title and document title fallback.                                 |
| `description`   | `string`  | Sub-line in the page header. Also used by the SEO layer.                                   |
| `pageHeader`    | `boolean` | Set to `false` to suppress the auto header (rare; use only for full custom landing pages). |

```yaml
---
title: Custom Adapters
description: Register diagram adapters that the presenter can detect at runtime.
---
```
