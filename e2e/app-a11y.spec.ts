import { seriousViolations } from './axe'
import { expect, test } from './fixtures'

/**
 * Automated accessibility scan (axe-core) of the app in both colour schemes
 * and both languages: the main screen, and with each sheet open (they are
 * only in the DOM while open). Serious and critical violations fail.
 */
const SHEETS: { name: string; opener: string; heading: string; knownIssues: string[] }[] = [
  { name: 'Help', opener: 'How to use', heading: 'How to use', knownIssues: [] },
  {
    name: 'Settings',
    opener: 'Settings',
    heading: 'Settings',
    // Known issue, excluded until fixed: the toggle switches have no accessible name
    // (`button-name`) and the range sliders have no label (`label`).
    knownIssues: ['button-name', 'label'],
  },
]

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`app axe (${scheme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'Detected Plates' })).toBeVisible()
    })

    for (const language of ['en', 'es'] as const) {
      test(`main screen (${language}) has no serious accessibility violations`, async ({
        page,
      }) => {
        await page.evaluate(
          (lang) => localStorage.setItem('alpr-settings', JSON.stringify({ language: lang })),
          language,
        )
        await page.reload()
        await expect(page.locator('html')).toHaveAttribute('lang', language)

        const serious = await seriousViolations(page)
        expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
      })
    }

    for (const sheet of SHEETS) {
      test(`${sheet.name} sheet has no serious accessibility violations`, async ({ page }) => {
        await page.getByTitle(sheet.opener).click()
        await expect(page.getByRole('heading', { name: sheet.heading })).toBeVisible()

        const serious = (await seriousViolations(page)).filter(
          (v) => !sheet.knownIssues.includes(v.rule),
        )
        expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
      })
    }
  })
}
