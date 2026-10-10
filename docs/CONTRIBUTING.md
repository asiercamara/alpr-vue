# Contribute to the documentation

Thank you for your interest in contributing to the ALPR Vue documentation! This guide will help you get started.

## How to contribute

### Option 1: Edit directly on GitHub

1. Navigate to the page you want to edit
2. Click the "Edit this file" button (the pencil icon)
3. Make your changes and submit a pull request

### Option 2: Local development

1. Fork and clone this repository
2. Install dependencies from the repository root: `pnpm install`
3. Create a branch for your changes
4. Edit the relevant `.md` file in `docs/` (English) or `docs/es/` (Spanish)
5. From the repository root, run `pnpm docs:dev`
6. Preview your changes at the URL shown in the terminal (typically `http://localhost:5173/docs/`)
7. Commit your changes and submit a pull request

## Writing guidelines

- **Use active voice**: "Run the command" not "The command should be run"
- **Address the reader directly**: Use "you" instead of "the user"
- **Keep sentences concise**: Aim for one idea per sentence
- **Lead with the goal**: Start instructions with what the user wants to accomplish
- **Use consistent terminology**: See [AGENTS.md](./AGENTS.md) for the preferred term list
- **Include examples**: Show, don't just tell

## Adding or editing pages

1. Edit the relevant `.md` file in `docs/` (English) or `docs/es/` (Spanish).
2. If you add a new page, register it in `docs/.vitepress/config.ts` under the correct locale sidebar.
3. Run `pnpm docs:dev` to preview your changes.
4. Run `pnpm docs:build` before opening a pull request.

## Adding a Spanish translation

Spanish pages live in `docs/es/` and must have the same filename as their English counterpart. When translating:

- Keep all technical terms in their original form (ONNX, WebAssembly, localStorage, CSV, etc.)
- Translate navigation group names as defined in `docs/.vitepress/config.ts`
- Update all internal links to use the `/es/` prefix (e.g., `/camera-mode` → `/es/camera-mode`)
- See [AGENTS.md](./AGENTS.md) for the preferred Spanish terminology

## Adding Mermaid diagrams

All diagrams use the `DiagramPresenter` component. See [diagram-presenter.md](./diagram-presenter.md) for the full usage guide. Quick example:

```md
<script setup>
const myDiagram = `
flowchart TD
  A[Start] --> B[Done]
`
</script>

<VTDocDiagramPresenter :code="myDiagram" preset="neon" autoPlay="intersect" />
```

To experiment with all diagram props interactively, run `pnpm docs:dev` and open `/docs/dev/diagram-playground`.
