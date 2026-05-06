[![en](https://img.shields.io/badge/lang-en-red.svg)](./README.md)
[![docs](https://img.shields.io/badge/docs-alpr--vue-6366f1.svg)](https://alpr-vue.vercel.app/docs/)
[![es](https://img.shields.io/badge/lang-es-yellow.svg)](./README.es.md)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/asiercamara/alpr-vue)
[![github](https://img.shields.io/badge/repo-GitHub-181717.svg?logo=github)](https://github.com/asiercamara/alpr-vue)

# ALPR Vue - Automatic License Plate Recognition in Browser

**ALPR Vue** is a Vue 3 rewrite of [fast-alpr](https://github.com/ankandrew/fast-alpr) that runs entirely in the browser — no server required. YOLOv9 detects plates, MobileViT v2 reads characters, both via ONNX Runtime Web (WebAssembly). All processing stays on your device.

## Features

- Real-time plate detection via webcam
- Image and video file upload for offline detection
- Smart plate grouping with Levenshtein similarity
- Character-by-character confidence visualization
- Edit detected plate text in the detail modal
- Export detections to CSV
- Camera facing toggle (front/back) on mobile
- Light / dark / system theme with FOUC prevention
- English / Spanish with automatic browser language detection
- Hardware zoom with digital fallback
- Processing offloaded to Web Workers for smooth UI
- Unit tests with Vitest (95%+ coverage)

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- pnpm
- Modern browser with WebAssembly and OffscreenCanvas support

## Installation

```bash
git clone https://github.com/asiercamara/alpr-vue.git
cd alpr_vue
pnpm install
```

## Usage

```bash
pnpm dev            # Development server → http://localhost:5173/
pnpm build          # Type-check + Vite production build → dist/
pnpm preview        # Preview production build

pnpm test           # Vitest watch mode
pnpm test:run       # Single run
pnpm test:coverage  # Coverage report

pnpm lint           # ESLint
pnpm lint:fix       # ESLint --fix
pnpm format         # Prettier

pnpm docs:dev       # VitePress dev server
pnpm docs:build     # Build docs site
pnpm docs:preview   # Preview docs build
```

## Tech Stack

- **Vue 3** — Composition API, `<script setup>`, TypeScript
- **Pinia** — state management
- **Tailwind CSS v4** — via `@tailwindcss/vite`
- **Vite 8** — build tool with `vue-tsc` type-checked builds
- **vue-i18n** — EN / ES internationalization
- **ONNX Runtime Web** — in-browser AI inference
- **Vitest** + `@vue/test-utils` — testing
- **ESLint** + **Prettier** + **Husky** — code quality
- **GitHub Actions** — CI (lint, type-check, coverage, security audit)

## Security

pnpm supply chain hardening:

| File                  | Setting                             | Effect                                               |
| --------------------- | ----------------------------------- | ---------------------------------------------------- |
| `.npmrc`              | `ignore-dep-scripts=true`           | Blocks all dependency postinstall scripts            |
| `.npmrc`              | `engine-strict=true`                | Fails install on wrong Node.js version               |
| `.npmrc`              | `strict-peer-dependencies=true`     | Peer dependency issues are errors                    |
| `pnpm-workspace.yaml` | `allowBuilds: { protobufjs: true }` | Whitelist for the only dep that needs a build script |
| `pnpm-workspace.yaml` | `minimumReleaseAge: 4320`           | Blocks packages published less than 3 days ago       |
| `pnpm-workspace.yaml` | `trustPolicy: no-downgrade`         | Fails on trust level decrease                        |
| `pnpm-workspace.yaml` | `blockExoticSubdeps: true`          | Blocks git / tarball transitive deps                 |
| `package.json`        | `pnpm.overrides.vite: ">=8.0.5"`    | Forces patched Vite across the graph                 |

```bash
pnpm security:audit       # all deps, fails on high severity
pnpm security:audit:ci    # prod deps only
```

## Deployment

```bash
chmod +x scripts/deploy-surge.sh
./scripts/deploy-surge.sh                      # → alpr-vue.surge.sh
./scripts/deploy-surge.sh my-domain.surge.sh  # → custom domain
```

Requires a Surge account (`surge login`). Script falls back to `npx surge` / `pnpm dlx surge` if CLI not installed globally.

## Limitations

- Performance depends on device processing capability
- Models optimized for European license plates
- Requires WebAssembly and OffscreenCanvas support
- Camera access requires a secure context (HTTPS or localhost)

## Documentation

The full documentation site covers everything beyond this README:

| Section                                                                       | What it covers                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------- |
| [Introduction](https://alpr-vue.vercel.app/docs/introduction)                 | What ALPR Vue is and who it is for                 |
| [Quickstart](https://alpr-vue.vercel.app/docs/quickstart)                     | Detect your first plate in minutes                 |
| [How it works](https://alpr-vue.vercel.app/docs/how-it-works)                 | Two-stage YOLOv9 + MobileViT v2 pipeline explained |
| [Camera mode](https://alpr-vue.vercel.app/docs/camera-mode)                   | Live detection, auto-stop, flip camera, zoom       |
| [Upload files](https://alpr-vue.vercel.app/docs/upload-files)                 | Image / video upload and sample gallery            |
| [Viewing results](https://alpr-vue.vercel.app/docs/viewing-results)           | History, confidence scores, editing, clipboard     |
| [Detection settings](https://alpr-vue.vercel.app/docs/detection-settings)     | Confidence threshold, timing, continuous mode      |
| [Exporting data](https://alpr-vue.vercel.app/docs/exporting-data)             | CSV export format and usage                        |
| [Appearance & language](https://alpr-vue.vercel.app/docs/appearance-language) | Theme and locale settings                          |
| [AI models](https://alpr-vue.vercel.app/docs/ai-models)                       | ONNX model details and metrics                     |
| [Privacy](https://alpr-vue.vercel.app/docs/privacy)                           | On-device processing, local storage, no telemetry  |
| [FAQ](https://alpr-vue.vercel.app/docs/faq)                                   | Common questions                                   |
| [Troubleshooting](https://alpr-vue.vercel.app/docs/troubleshooting)           | Camera errors, model loading, detection issues     |

To run the docs locally: `pnpm docs:dev`

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Acknowledgements

- [fast-alpr](https://github.com/ankandrew/fast-alpr) — original project
  - [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) — OCR models
  - [open-image-models](https://github.com/ankandrew/open-image-models) — detection models
