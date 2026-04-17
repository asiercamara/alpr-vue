# ALPR Vue — Documentación

Este directorio contiene el sitio de documentación de VitePress para [ALPR Vue](https://alpr-vue.surge.sh), una aplicación de reconocimiento automático de matrículas que funciona en el navegador.

Ver también: [README para contribución en inglés](./README.md)

## Sitio publicado

La documentación se despliega dentro de la aplicación principal bajo `/docs/`.

- **Inglés:** https://alpr-vue.surge.sh/docs/
- **Español:** https://alpr-vue.surge.sh/docs/es/

## Estructura

```text
docs/
├── .vitepress/              # Configuración, tema, caché y salida de build
├── *.md                     # Páginas en inglés
└── es/
    └── *.md                 # Páginas en español
```

Las páginas están escritas en Markdown. La configuración del sitio y la navegación viven en `docs/.vitepress/config.ts`, y el tema personalizado está implementado en `docs/.vitepress/theme/`.

## Vista previa local

Desde la raíz del repositorio, ejecuta:

```bash
pnpm dev:docs
```

VitePress sirve la documentación localmente y la recompila cuando detecta cambios.

## Compilar la documentación

```bash
pnpm build:docs
pnpm preview:docs
```

La salida de producción de la documentación se escribe en `dist/docs/`.

## Stack de documentación

- **Generador del sitio:** VitePress
- **Configuración principal:** `docs/.vitepress/config.ts`
- **Tema personalizado:** `docs/.vitepress/theme/index.ts`
- **Estilos del tema:** `docs/.vitepress/theme/style.css`

La documentación es bilingüe:

- `docs/*.md` para páginas en inglés
- `docs/es/*.md` para páginas en español

## Diagramas Mermaid

La documentación incluye diagramas Mermaid con:

- `vitepress-mermaid-renderer`
- `mermaid`

La integración se inicializa en `docs/.vitepress/theme/index.ts` y se estiliza en `docs/.vitepress/theme/style.css`.

El comportamiento personalizado actual incluye:

- controles interactivos en la toolbar
- mejor encuadre inicial dentro del layout de documentación
- ajuste al ancho en fullscreen
- soporte para flowcharts, sequence diagrams, state diagrams y otras sintaxis Mermaid usadas en la documentación

## Añadir o editar páginas

1. Edita el archivo `.md` correspondiente en `docs/` (inglés) o `docs/es/` (español).
2. Si añades una página nueva, regístrala en `docs/.vitepress/config.ts` dentro del sidebar del locale correcto.
3. Ejecuta `pnpm dev:docs` para previsualizar los cambios.
4. Ejecuta `pnpm build:docs` antes de abrir una pull request.

Consulta [CONTRIBUTING.md](./CONTRIBUTING.md) para las guías de escritura.
