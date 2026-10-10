import { defineConfig, devices } from '@playwright/test'

/**
 * E2E suite for the app and its docs.
 *
 * `webServer` serves the prebuilt `dist/` (the app at `/`, the docs at `/docs/`),
 * so run `pnpm build:all` before `pnpm test:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    permissions: ['camera'],
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
      },
    },
  ],
  webServer: {
    command: 'pnpm preview --port 4173',
    url: 'http://localhost:4173',
    // `pnpm check:all` asks for a fresh preview of the build it just made.
    reuseExistingServer: !process.env.CI && !process.env.ALPR_FRESH_PREVIEW,
    timeout: 60_000,
  },
})
