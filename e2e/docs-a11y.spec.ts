import { seriousViolations } from './axe'
import { expect, scrollThroughPage, test } from './fixtures'

/**
 * Automated accessibility scan (axe-core) of the key docs pages, in both
 * languages and both colour schemes. Serious and critical violations fail.
 */
const PAGES = [
  '/docs/',
  '/docs/introduction',
  '/docs/quickstart',
  '/docs/how-it-works',
  '/docs/es/',
  '/docs/es/introduction',
  '/docs/es/quickstart',
]

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`docs axe (${scheme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    })

    for (const path of PAGES) {
      test(`${path} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(path)
        await scrollThroughPage(page)

        const serious = await seriousViolations(page)
        expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
      })
    }
  })
}
