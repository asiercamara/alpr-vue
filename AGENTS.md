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

## Dark/Light Mode

- **FOUC prevention**: `index.html` contains an inline `<script>` that runs synchronously before Vue loads. It reads `localStorage.getItem('alpr-settings')`, parses the `theme` field (`'light'|'dark'|'system'`), and conditionally adds the `dark` class to `<html>`. Never remove or defer this script.
- **Runtime management**: `useTheme` composable (called once in `App.vue`) watches `settingsStore.theme`, applies/removes `dark` on `<html>`, and listens to `window.matchMedia('(prefers-color-scheme: dark)')` for `'system'` mode.
- **Store**: `settingsStore.theme` is the single source of truth. Always call `settingsStore.setTheme(value)` — never manipulate `<html>` class directly outside `useTheme`.
- **CSS pattern**: Always pair `bg-surface-50 dark:bg-surface-900` style classes. The custom Tailwind variant `@custom-variant dark (&:where(.dark, .dark *))` in `main.css` enables this.
- **Rule**: Never hardcode a light or dark color without its `dark:` counterpart.

## Responsive Design

- **Mobile-first**: All base styles target mobile. Use `sm:` (640px) and `lg:` (1024px) breakpoints to progressively enhance.
- **`isMobile` signal**: `App.vue` computes `isMobile` as `window.innerWidth < 1024` and updates it on `resize`. Pass this as a prop where components need to branch behavior.
- **Layout**: Single-column on mobile; `lg:grid lg:grid-cols-3` (camera 2/3, history 1/3) on desktop.
- **Camera**: Goes fullscreen (`position: fixed, inset: 0`) on mobile when active. Stays in-column on desktop.
- **Aspect ratios**: `CameraPreview` uses `aspect-[3/4] sm:aspect-video` (portrait mobile → landscape desktop).
- **Sheets/overlays**: Use `BottomDrawer` component for all sheet-style overlays. Always cap at `max-h-[85vh]` with `overflow-y-auto`.
- **Touch targets**: Minimum 44×44px for all interactive elements on mobile.

## Custom Tailwind Color Tokens

Defined in `src/assets/main.css` under `@theme`. Never use raw hex values in components.

| Prefix                        | Purpose                             | Notes                                  |
| ----------------------------- | ----------------------------------- | -------------------------------------- |
| `brand-*`                     | Primary actions, links, focus rings | Violet/indigo palette, 50–900          |
| `surface-*`                   | Backgrounds, borders, and body text | Cool-gray with violet tint, 0 + 50–950 |
| `conf-high/good/mid/low/poor` | Confidence visualization            | Semantic green→red                     |

**Typical patterns:**

- Background: `bg-surface-50 dark:bg-surface-900`
- Body text: `text-surface-900 dark:text-white`
- Muted text: `text-surface-500 dark:text-surface-400`
- Primary button: `bg-brand-600 hover:bg-brand-700 text-white`
- Confidence text: `text-conf-high`, `text-conf-good`, `text-conf-mid`, `text-conf-low`, `text-conf-poor`

## settingsStore Conventions

`useSettingsStore` (`src/stores/settingsStore.ts`) is the single location for all user-configurable settings, persisted to `localStorage` under key `'alpr-settings'` on every change.

- **Always use the setter** (`setTheme`, `setConfidenceThreshold`, etc.) — never mutate `ref` values directly from outside the store.
- **Each setting has a matching reset** (`resetTheme`, `resetAll`, etc.) that restores to `DEFAULTS`.
- **`confirmationTimeMs` / `fastConfirmationTimeMs`** are computed (seconds → ms). Use these in timing logic, not the raw `ref` values.
- **`theme`** is type `ThemeMode = 'light' | 'dark' | 'system'`. Import this type from the store.
- **Legacy migration**: `loadSettings()` automatically migrates the old `'alpr-feedback-enabled'` key on first load. Do not reference that key anywhere else.
- All stores follow the **Setup Store** style (`defineStore('id', () => { ... })`). Follow this pattern for any new stores.

## TSDoc/JSDoc Documentation Standards

All TypeScript files (composables, stores, utils, types) must be documented with TSDoc. Vue `<script setup>` component internal functions generally do not need TSDoc, but `props` interfaces do.

**Function format:**

````typescript
/**
 * Brief one-line description ending with a period.
 *
 * @param paramName - What it is and any constraints.
 * @returns What is returned and under what conditions.
 * @example
 * ```ts
 * functionName(arg)
 * ```
 */
````

**Interface / field format:**

```typescript
/** Description of the type's role in the system. */
interface MyType {
  /** What this field holds and its valid values or units. */
  field: string
}
```

Rules:

- First line must be a concise sentence ending with a period.
- `@param` required for each non-obvious parameter.
- `@returns` required when return value is non-void and non-trivial.
- `@example` encouraged for public utility functions.
- Do **not** use `@author`, `@version`, or `@since` tags.

## Deployment

The project deploys to [Surge.sh](https://surge.sh) via `scripts/deploy-surge.sh`.

```bash
chmod +x scripts/deploy-surge.sh        # first time only
./scripts/deploy-surge.sh               # → alpr-vue.surge.sh
./scripts/deploy-surge.sh my.surge.sh   # → custom domain
```

The script runs `pnpm build` first, then calls `surge ./dist <domain>`. It auto-detects whether `surge` is installed globally or falls back to `npx`/`pnpm dlx`. Requires a Surge account (`surge login`).
