# Agent Instructions for my-vue-app

## Core Development Commands
- Install dependencies: `pnpm install`
- Development server: `pnpm dev`
- Build project: `pnpm build`
- Preview build: `pnpm preview`

## Project Conventions
- **Package Manager**: Use `pnpm` exclusively. Do not use `npm` or `yarn`.
- **Vue Style**: Use Vue 3 with Composition API and `<script setup>`.
- **CSS Pattern**: Prefer class-based selectors over element selectors in `<style scoped>` blocks for better maintenance and specificity control.
- **Component Naming**: Use PascalCase for both filenames and component usage in templates.
- **Path Aliases**: Use `@` to reference the `src` directory.

## Architecture
- **Component Structure**: Keep components small and focused. Move complex logic into composables.
- **Main Layout**: `App.vue` defines the primary layout with a responsive grid (camera preview on left, history on right).
