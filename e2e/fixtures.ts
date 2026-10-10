import { expect, test as base, type Page } from '@playwright/test'

/**
 * `test` with a guard on every page a spec opens: any console error or
 * warning, uncaught exception or failed request fails the test. Hydration
 * mismatches are Vue warnings, so they are caught here too. So does any request
 * to another origin: the privacy page promises that nothing leaves the app.
 */
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page, baseURL }, use) => {
      const problems: string[] = []
      const ownOrigin = new URL(baseURL ?? 'http://localhost').origin
      page.on('request', (request) => {
        const { protocol, origin } = new URL(request.url())
        if (/^https?:$/.test(protocol) && origin !== ownOrigin) {
          problems.push(`external request: ${request.url()}`)
        }
      })
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          problems.push(`console.${message.type()}: ${message.text()}`)
        }
      })
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
      page.on('requestfailed', (request) => {
        // Navigating away aborts in-flight prefetches; that is not a failure.
        if (request.failure()?.errorText === 'net::ERR_ABORTED') return
        problems.push(`requestfailed: ${request.url()} (${request.failure()?.errorText})`)
      })

      await use()

      expect(problems, 'the page logged errors or warnings').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** Scrolls the whole page so code that only runs when an element comes into view runs. */
export async function scrollThroughPage(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight / 2)
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
    window.scrollTo(0, 0)
  })
}
