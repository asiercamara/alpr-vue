# Agent Instructions for my-vue-app

## Core Development Commands

- Install dependencies: `pnpm install`
- Development server: `pnpm dev`
- Build project: `pnpm build`
- Preview build: `pnpm preview`
- Run tests: `pnpm test:run`
- Run tests with coverage: `pnpm test:coverage`
- Lint: `pnpm lint`
- Format: `pnpm format`
- Type check: `npx vue-tsc --noEmit`

## Project Conventions

- **Package Manager**: Use `pnpm` exclusively. Do not use `npm` or `yarn`.
- **Vue Style**: Use Vue 3 with Composition API and `<script setup>`.
- **CSS Pattern**: Prefer class-based selectors over element selectors in `<style scoped>` blocks for better maintenance and specificity control.
- **Component Naming**: Use PascalCase for both filenames and component usage in templates.
- **Path Aliases**: Use `@` to reference the `src` directory.
- **Testing**: Write tests for all new features. Maintain coverage above 90%. Use `vitest` and `@vue/test-utils`. Mock composables and stores in component tests.
- **ESLint**: `no-explicit-any` is error in `src`, warning in tests. `consistent-type-imports` required. Empty blocks need comments.

## Architecture

- **Component Structure**: Keep components small and focused. Move complex logic into composables.
- **Main Layout**: `App.vue` defines the header (with status indicator and help button) and the responsive grid (camera preview left, history right).
- **Camera System**: `useCamera` composable manages webcam lifecycle, facing mode toggle, and frame capture. `useStaticMedia` handles image/video file upload processing.
- **Detection Pipeline**: Camera/upload → `createImageBitmap` → `processFrame` → Worker → `onBoxes` callback → `drawBoxesAndUpdate()`.
- **State Management**: `appStore` (camera state, errors, model loading) and `plateStore` (detections, grouping, editing, chronological sorting).
- **Key Components**: `CameraPreview` (camera + upload controls), `MediaUploader` (file upload with progress), `HelpSheet` (bottom sheet instructions), `PlateList` (history with CSV export), `PlateModal` (detail with edit/copy), `ConfidenceRing` (circular indicator).
- **Utils**: `export.ts` (CSV generation/download), `feedback.ts` (audio beep/vibration), `validation.ts` (Levenshtein similarity).
