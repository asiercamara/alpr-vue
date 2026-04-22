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
│   ├── config.ts              # VitePress config, dynamic sidebar (buildSidebar + i18n)
│   ├── theme/
│   │   └── index.ts           # Registers vitepress-theme-app-docs as the VitePress theme
│   └── tests/                 # Vitest test suite for theme package components
├── public/                    # Static assets (favicon, logo) — served at /docs/
├── dev/
│   ├── diagram-presenter.md   # DiagramPresenter contributor guide (not in sidebar)
│   └── diagram-playground.md  # Live playground (not in sidebar)
├── *.md                       # English pages (public)
└── es/
    └── *.md                   # Spanish pages (public)
```

Pages are written in Markdown. Site configuration and navigation live in `docs/.vitepress/config.ts`. The custom theme (components, styles, Mermaid renderer) is provided by the [`vitepress-theme-app-docs`](https://github.com/asiercamara/vitepress-theme-app-docs) package and wired up in `docs/.vitepress/theme/index.ts`.

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
- **Theme package:** [`vitepress-theme-app-docs`](https://github.com/asiercamara/vitepress-theme-app-docs) — components, styles, Mermaid renderer
- **Theme entry:** `docs/.vitepress/theme/index.ts`

The docs are bilingual:

- `docs/*.md` for English pages
- `docs/es/*.md` for Spanish pages

## Mermaid diagrams — DiagramPresenter

All diagrams in the docs are powered by the `VTDocDiagramPresenter` component, provided by the `vitepress-theme-app-docs` package. It is backed by GSAP timelines and a type-aware adapter system.

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

<VTDocDiagramPresenter :code="myDiagram" preset="neon" autoPlay="intersect" />
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

See **[`docs/dev/diagram-presenter.md`](./dev/diagram-presenter.md)** for the complete prop reference, adapter system, highlight usage, and troubleshooting guide.

### Interactive playground

Open `docs/dev/diagram-playground.md` (not in the sidebar) to experiment with all props live in the browser:

```bash
pnpm dev:docs
# then open http://localhost:5173/docs/dev/diagram-playground
```

## Adding or editing pages

1. Edit the relevant `.md` file in `docs/` (English) or `docs/es/` (Spanish).
2. If you add a new page, register it in `docs/.vitepress/config.ts`: add an entry to `sections[]` and a translation key to every locale in `i18n`.
3. Run `pnpm dev:docs` to preview your changes.
4. Run `pnpm build:docs` before opening a pull request.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for writing guidelines.
