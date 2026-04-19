# ALPR Vue — Documentation

This directory contains the VitePress documentation site for [ALPR Vue](https://alpr-vue.surge.sh), a browser-based automatic license plate recognition app.

See also: [Spanish contributor README](./README.es.md)

## Published site

The documentation is deployed inside the main app under `/docs/`.

- **English:** https://alpr-vue.surge.sh/docs/
- **Spanish:** https://alpr-vue.surge.sh/docs/es/

## Structure

```text
docs/
├── .vitepress/
│   ├── config.ts              # VitePress config, sidebar navigation
│   ├── theme/
│   │   ├── index.ts           # Theme setup, global component registration
│   │   ├── style.css          # Theme styles
│   │   └── components/
│   │       ├── DiagramPresenter.vue    # Animated Mermaid wrapper (GSAP)
│   │       ├── diagram-adapters.js     # Flowchart/state/sequence adapters
│   │       ├── DiagramPlayground.vue   # Interactive prop explorer
│   │       └── Doc*.vue                # Other shared UI components
├── *.md                       # English pages (public)
├── diagram-presenter.md       # DiagramPresenter dev guide (not in sidebar)
├── diagram-playground.md      # Live playground (not in sidebar)
└── es/
    └── *.md                   # Spanish pages (public)
```

Pages are written in Markdown. Site configuration and navigation live in `docs/.vitepress/config.ts`, and the custom theme is implemented in `docs/.vitepress/theme/`.

## Local preview

From the repository root, run:

```bash
pnpm dev:docs
```

VitePress serves the docs locally and rebuilds them on changes.

## Build documentation

```bash
pnpm build:docs
pnpm preview:docs
```

The production docs output is written to `dist/docs/`.

## Documentation stack

- **Site generator:** VitePress
- **Main config:** `docs/.vitepress/config.ts`
- **Custom theme:** `docs/.vitepress/theme/index.ts`
- **Theme styles:** `docs/.vitepress/theme/style.css`

The docs are bilingual:

- `docs/*.md` for English pages
- `docs/es/*.md` for Spanish pages

## Mermaid diagrams — DiagramPresenter

All diagrams in the docs are powered by the custom `DiagramPresenter` component (`docs/.vitepress/theme/components/DiagramPresenter.vue`), backed by GSAP timelines and a type-aware adapter system.

### Quick usage

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

<DiagramPresenter :code="myDiagram" preset="neon" autoPlay="intersect" />
```

### Key props

| Prop        | Default  | Description                                     |
| ----------- | -------- | ----------------------------------------------- |
| `preset`    | `'auto'` | `'auto'` \| `'soft'` \| `'neon'` — visual style |
| `autoPlay`  | `'none'` | `'intersect'` recommended for production pages  |
| `highlight` | `[]`     | Node keys to pulse after animation              |
| `controls`  | `true`   | Show speed/loop/play toolbar                    |
| `caption`   | `''`     | Optional figcaption text                        |

### Full reference

See **[`docs/diagram-presenter.md`](./diagram-presenter.md)** for the complete prop reference, adapter system, highlight usage, and troubleshooting guide.

### Interactive playground

Open `docs/diagram-playground.md` (not in the sidebar) to experiment with all props live in the browser:

```bash
pnpm dev:docs
# then open http://localhost:5173/docs/diagram-playground
```

## Adding or editing pages

1. Edit the relevant `.md` file in `docs/` (English) or `docs/es/` (Spanish).
2. If you add a new page, register it in `docs/.vitepress/config.ts` under the correct locale sidebar.
3. Run `pnpm dev:docs` to preview your changes.
4. Run `pnpm build:docs` before opening a pull request.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for writing guidelines.
