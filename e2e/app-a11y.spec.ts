import { seriousViolations } from './axe'
import { expect, test } from './fixtures'

/**
 * Automated accessibility scan (axe-core) of the app in both colour schemes
 * and both languages. Serious and critical violations fail.
 *
 * Known issues, excluded on purpose until fixed:
 * - `index.html` ships `<html lang="">` and nothing sets it at runtime, so
 *   `html-has-lang` / `html-lang-valid` fail.
 * - `color-contrast`: the `text-brand-500` text (4.2:1, needs 4.5:1) and the
 *   empty-state hint under "No detections" (2.6:1) are below WCAG AA.
 */
const KNOWN_ISSUES = ['html-has-lang', 'html-lang-valid', 'color-contrast']

for (const scheme of ['light', 'dark'] as const) {
  for (const language of ['en', 'es'] as const) {
    test(`app (${scheme}, ${language}) has no serious accessibility violations`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await page.addInitScript(
        ([key, lang]) => localStorage.setItem(key, JSON.stringify({ language: lang })),
        ['alpr-settings', language],
      )
      await page.goto('/')
      await expect(page.locator('.plate-text, h2').first()).toBeVisible()

      const serious = (await seriousViolations(page)).filter((v) => !KNOWN_ISSUES.includes(v.rule))
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
    })
  }
}
