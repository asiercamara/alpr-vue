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
├── .vitepress/              # VitePress config, theme, cache, and build output
├── *.md                     # English pages
└── es/
    └── *.md                 # Spanish pages
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

## Mermaid diagrams

The docs include Mermaid diagrams powered by:

- `vitepress-mermaid-renderer`
- `mermaid`

The integration is initialized in `docs/.vitepress/theme/index.ts` and styled in `docs/.vitepress/theme/style.css`.

Custom behavior currently includes:

- interactive toolbar controls
- improved initial framing inside the docs layout
- fullscreen fit-to-width behavior
- support for flowcharts, sequence diagrams, state diagrams, and other Mermaid syntaxes used in the docs

## Adding or editing pages

1. Edit the relevant `.md` file in `docs/` (English) or `docs/es/` (Spanish).
2. If you add a new page, register it in `docs/.vitepress/config.ts` under the correct locale sidebar.
3. Run `pnpm dev:docs` to preview your changes.
4. Run `pnpm build:docs` before opening a pull request.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for writing guidelines.
