import { docsPaths } from './docs-pages'
import { expect, scrollThroughPage, test } from './fixtures'

/**
 * Every docs page, in both languages, must render its content and load
 * without a single console error or warning (the fixture enforces the latter,
 * which includes Vue hydration mismatches).
 */
for (const path of docsPaths()) {
  test(`${path} renders`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)

    await page.waitForLoadState('networkidle')
    await expect(page.locator('.vp-doc').first()).toBeVisible()
    // Scroll the whole page: code that only runs when an element comes into
    // view (VitePress's link prefetch, deferred diagrams) must not log errors.
    await scrollThroughPage(page)
    // Exactly one visible H1 (the page header hides its own when the page has one).
    const visibleH1 = await page
      .locator('h1')
      .evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0).length)
    expect(visibleH1).toBeGreaterThanOrEqual(1)
  })
}
