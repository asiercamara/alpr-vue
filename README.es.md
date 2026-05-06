[![en](https://img.shields.io/badge/lang-en-red.svg)](./README.md)
[![docs](https://img.shields.io/badge/docs-alpr--vue-6366f1.svg)](https://alpr-vue.vercel.app/docs/es/introduction)
[![es](https://img.shields.io/badge/lang-es-yellow.svg)](./README.es.md)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/asiercamara/alpr-vue)
[![github](https://img.shields.io/badge/repo-GitHub-181717.svg?logo=github)](https://github.com/asiercamara/alpr-vue)

# ALPR Vue - Reconocimiento Automático de Matrículas en Navegador

**ALPR Vue** es una reescritura en Vue 3 de [fast-alpr](https://github.com/ankandrew/fast-alpr) que funciona completamente en el navegador — sin servidor. YOLOv9 detecta matrículas, MobileViT v2 lee los caracteres, ambos vía ONNX Runtime Web (WebAssembly). Todo el procesamiento permanece en tu dispositivo.

## Características

- Detección de matrículas en tiempo real mediante cámara web
- Subida de imágenes y vídeos para detección sin conexión
- Agrupación inteligente con similitud Levenshtein
- Visualización de confianza carácter a carácter
- Edición del texto detectado en el modal de detalle
- Exportación de detecciones a CSV
- Cambio de cámara (frontal/trasera) en móviles
- Tema claro / oscuro / sistema con prevención de FOUC
- Inglés / español con detección automática del idioma del navegador
- Zoom por hardware con respaldo digital
- Procesamiento en Web Workers para interfaz fluida
- Tests unitarios con Vitest (cobertura 95%+)

## Requisitos

- Node.js `^20.19.0` o `>=22.12.0`
- pnpm
- Navegador moderno con soporte para WebAssembly y OffscreenCanvas

## Instalación

```bash
git clone https://github.com/asiercamara/alpr-vue.git
cd alpr_vue
pnpm install
```

## Uso

```bash
pnpm dev            # Servidor de desarrollo → http://localhost:5173/
pnpm build          # Comprobación de tipos + build de producción → dist/
pnpm preview        # Vista previa del build de producción

pnpm test           # Vitest en modo watch
pnpm test:run       # Ejecución única
pnpm test:coverage  # Informe de cobertura

pnpm lint           # ESLint
pnpm lint:fix       # ESLint --fix
pnpm format         # Prettier

pnpm docs:dev       # Servidor de desarrollo VitePress
pnpm docs:build     # Build del sitio de documentación
pnpm docs:preview   # Vista previa del build de docs
```

## Stack Tecnológico

- **Vue 3** — Composition API, `<script setup>`, TypeScript
- **Pinia** — gestión de estado
- **Tailwind CSS v4** — vía `@tailwindcss/vite`
- **Vite 8** — build tool con builds con comprobación de tipos via `vue-tsc`
- **vue-i18n** — internacionalización EN / ES
- **ONNX Runtime Web** — inferencia de IA en el navegador
- **Vitest** + `@vue/test-utils` — testing
- **ESLint** + **Prettier** + **Husky** — calidad de código
- **GitHub Actions** — CI (lint, tipos, cobertura, auditoría de seguridad)

## Seguridad

Endurecimiento de supply chain con pnpm:

| Fichero               | Setting                             | Efecto                                                    |
| --------------------- | ----------------------------------- | --------------------------------------------------------- |
| `.npmrc`              | `ignore-dep-scripts=true`           | Bloquea todos los scripts postinstall de dependencias     |
| `.npmrc`              | `engine-strict=true`                | Falla la instalación con versión de Node.js incorrecta    |
| `.npmrc`              | `strict-peer-dependencies=true`     | Los problemas de peer deps son errores                    |
| `pnpm-workspace.yaml` | `allowBuilds: { protobufjs: true }` | Lista blanca de la única dep que necesita script de build |
| `pnpm-workspace.yaml` | `minimumReleaseAge: 4320`           | Bloquea paquetes publicados hace menos de 3 días          |
| `pnpm-workspace.yaml` | `trustPolicy: no-downgrade`         | Falla ante bajada de nivel de confianza                   |
| `pnpm-workspace.yaml` | `blockExoticSubdeps: true`          | Bloquea deps transitivas via git / tarball                |
| `package.json`        | `pnpm.overrides.vite: ">=8.0.5"`    | Fuerza Vite parcheado en todo el grafo                    |

```bash
pnpm security:audit       # todas las deps, falla en severidad alta
pnpm security:audit:ci    # solo deps de producción
```

## Despliegue

```bash
chmod +x scripts/deploy-surge.sh
./scripts/deploy-surge.sh                      # → alpr-vue.surge.sh
./scripts/deploy-surge.sh mi-dominio.surge.sh  # → dominio personalizado
```

Requiere cuenta en Surge (`surge login`). El script usa `npx surge` / `pnpm dlx surge` si el CLI no está instalado globalmente.

## Limitaciones

- El rendimiento depende de la capacidad del dispositivo
- Modelos optimizados para matrículas europeas
- Requiere soporte de WebAssembly y OffscreenCanvas
- El acceso a la cámara requiere contexto seguro (HTTPS o localhost)

## Documentación

El sitio de documentación completo cubre todo lo que va más allá de este README:

| Sección                                                                        | Contenido                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [Introducción](https://alpr-vue.vercel.app/docs/es/introduction)               | Qué es ALPR Vue y para quién es                              |
| [Inicio rápido](https://alpr-vue.vercel.app/docs/es/quickstart)                | Detecta tu primera matrícula en minutos                      |
| [Cómo funciona](https://alpr-vue.vercel.app/docs/es/how-it-works)              | Pipeline YOLOv9 + MobileViT v2 explicado                     |
| [Modo cámara](https://alpr-vue.vercel.app/docs/es/camera-mode)                 | Detección en vivo, parada automática, cambio de cámara, zoom |
| [Subir archivos](https://alpr-vue.vercel.app/docs/es/upload-files)             | Subida de imagen / vídeo y galería de muestras               |
| [Ver resultados](https://alpr-vue.vercel.app/docs/es/viewing-results)          | Historial, confianza por carácter, edición, portapapeles     |
| [Ajustes de detección](https://alpr-vue.vercel.app/docs/es/detection-settings) | Umbral de confianza, temporización, modo continuo            |
| [Exportar datos](https://alpr-vue.vercel.app/docs/es/exporting-data)           | Formato CSV y uso                                            |
| [Apariencia e idioma](https://alpr-vue.vercel.app/docs/es/appearance-language) | Ajustes de tema y locale                                     |
| [Modelos de IA](https://alpr-vue.vercel.app/docs/es/ai-models)                 | Detalles y métricas de los modelos ONNX                      |
| [Privacidad](https://alpr-vue.vercel.app/docs/es/privacy)                      | Procesamiento local, almacenamiento, sin telemetría          |
| [Preguntas frecuentes](https://alpr-vue.vercel.app/docs/es/faq)                | Preguntas comunes                                            |
| [Resolución de problemas](https://alpr-vue.vercel.app/docs/es/troubleshooting) | Errores de cámara, carga de modelos, detección               |

Para ejecutar la documentación en local: `pnpm docs:dev`

## Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md).

## Reconocimientos

- [fast-alpr](https://github.com/ankandrew/fast-alpr) — proyecto original
  - [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) — modelos OCR
  - [open-image-models](https://github.com/ankandrew/open-image-models) — modelos de detección
