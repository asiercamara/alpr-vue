import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

/** `/models/*.onnx?url` points into `public/`, which vitest cannot resolve: serve the URL string itself. */
function onnxUrlStub(): Plugin {
  const prefix = '\0onnx-url:'
  return {
    name: 'onnx-url-stub',
    enforce: 'pre',
    resolveId: (id) =>
      /^\/models\/.+\.onnx\?url$/.test(id) ? prefix + id.replace(/\?url$/, '') : null,
    load: (id) =>
      id.startsWith(prefix) ? `export default ${JSON.stringify(id.slice(prefix.length))}` : null,
  }
}

export default defineConfig({
  plugins: [vue(), onnxUrlStub()],
  define: {
    __APP_VERSION__: JSON.stringify(
      JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version,
    ),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,js,vue}'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,vue}'],
      // Suelo con holgura bajo lo medido; AGENTS.md exige >90 %
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 85 },
      exclude: [
        'src/tests/**',
        'src/types/**',
        'src/vite-env.d.ts',
        'src/main.js',
        'src/App.vue',
        'src/components/icons/*.vue',
      ],
    },
  },
})
