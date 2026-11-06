import type { Page } from '@playwright/test'
import { seriousViolations } from './axe'
import { expect, test } from './fixtures'

/**
 * Automated accessibility scan (axe-core) of the app in both colour schemes
 * and both languages: the main screen, and with each sheet open (they are
 * only in the DOM while open). Serious and critical violations fail.
 */
const SHEETS = [
  { name: 'Help', title: { en: 'How to use', es: 'Cómo usar' } },
  { name: 'Settings', title: { en: 'Settings', es: 'Configuración' } },
]

async function setLanguage(page: Page, language: 'en' | 'es') {
  await page.evaluate(
    (lang) => localStorage.setItem('alpr-settings', JSON.stringify({ language: lang })),
    language,
  )
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', language)
}

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
        await setLanguage(page, language)

        const serious = await seriousViolations(page)
        expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
      })

      for (const sheet of SHEETS) {
        test(`${sheet.name} sheet (${language}) has no serious accessibility violations`, async ({
          page,
        }) => {
          await setLanguage(page, language)
          await page.getByTitle(sheet.title[language]).click()
          await expect(page.getByRole('heading', { name: sheet.title[language] })).toBeVisible()

          const serious = await seriousViolations(page)
          expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
        })
      }
    }
  })
}
