import { fileURLToPath, URL } from 'node:url'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

/**
 * Serves the pre-built VitePress output from dist/docs/ at the /docs/ path in dev mode.
 *
 * In production, dist/docs/ is served statically at /docs/ by the hosting provider.
 * In dev mode, Vite's SPA fallback would intercept /docs/* and return the app shell instead.
 * This plugin adds a middleware that short-circuits those requests and serves the static files
 * directly from dist/docs/, mirroring production behavior.
 *
 * Requires a prior `pnpm build:docs` (or `pnpm build:all`) to populate dist/docs/.
 * For active docs editing, use `pnpm dev:docs` instead (full VitePress HMR).
 *
 * Future: as the app adds context-sensitive help links (e.g. /docs/camera-mode, /docs/es/quickstart),
 * this plugin ensures those deep links resolve correctly in dev without any extra configuration.
 */
function serveDocsPlugin(): Plugin {
  return {
    name: 'serve-docs',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/'
        if (!url.startsWith('/docs')) return next()

        let filePath = resolve(__dirname, 'dist', url.slice(1))
        if (existsSync(filePath) && statSync(filePath).isDirectory()) {
          filePath = resolve(filePath, 'index.html')
        }

        if (!existsSync(filePath)) return next()

        res.setHeader('Content-Type', MIME[extname(filePath)] ?? 'application/octet-stream')
        res.end(readFileSync(filePath))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss(), serveDocsPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  worker: {
    format: 'es',
  },
})
