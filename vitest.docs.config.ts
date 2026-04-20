import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@docs-theme': fileURLToPath(new URL('./docs/.vitepress/theme', import.meta.url)),
      '@docs-tests': fileURLToPath(new URL('./docs/.vitepress/tests', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./docs/.vitepress/tests/setup.ts'],
    include: ['docs/.vitepress/tests/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['docs/.vitepress/theme/**/*.{js,ts,vue}'],
      exclude: ['docs/.vitepress/theme/style.css', 'docs/.vitepress/tests/**'],
    },
  },
})
