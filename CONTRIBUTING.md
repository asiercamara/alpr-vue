# Contributing to ALPR Vue

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- pnpm (install with `npm i -g pnpm`)
- A modern browser with WebAssembly and OffscreenCanvas support

## Setup

```bash
git clone https://github.com/asiercamara/alpr-vue.git
cd alpr_vue
pnpm install
```

Husky hooks install automatically on `pnpm install`.

## Development workflow

```bash
pnpm dev          # Start dev server → http://localhost:5173/
pnpm test         # Vitest watch mode
pnpm lint         # ESLint
pnpm lint:fix     # ESLint --fix
pnpm format       # Prettier
```

Before opening a PR, make sure the full check suite passes:

```bash
pnpm lint && pnpm build && pnpm test:run
```

## Code style

- **Vue 3 Composition API** with `<script setup>` and TypeScript — no Options API.
- **No comments** unless the _why_ is non-obvious (hidden constraint, workaround, subtle invariant).
- **No unused code** — delete it; don't comment it out.
- ESLint + Prettier enforce the rest automatically.

## Testing

- Tests live alongside source under `src/` or in `__test-utils__/`.
- Use typed factories from `src/__test-utils__/factories.ts` for test data.
- Maintain 95%+ coverage. Run `pnpm test:coverage` to check.
- Do **not** mock internal modules — only mock at system boundaries (Web Workers, browser APIs).

## Workers

AI inference runs in a dedicated Web Worker. Worker files are compiled with `tsconfig.workers.json` targeting the `WebWorker` lib — do not import DOM types there.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add zoom controls to CameraPreview
fix: correct confidence threshold in detectionProcessor
chore: update vitepress-theme-app-docs to 0.8.2
```

Subject line ≤ 72 characters. Body only when the _why_ isn't obvious from the subject.

## Pull requests

1. Fork → branch off `main` (`feat/my-feature` or `fix/my-bug`).
2. Keep PRs focused — one concern per PR.
3. Run the full check suite before pushing.
4. Link the related issue if one exists.
5. Fill in the PR description: what changed and why.

The CI pipeline runs lint, type-check, tests with coverage, and a security audit on every PR. All checks must pass before merge.

## Reporting issues

Open an issue on GitHub with:

- Browser and OS version
- Steps to reproduce
- Expected vs actual behaviour
- Console errors or screenshots if relevant

## Documentation

Docs live under `docs/` and are built with VitePress. See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for the docs-specific guide.
