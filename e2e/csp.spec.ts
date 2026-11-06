import { vercelHeadersFor } from '../src/tests/vercelHeaders'
import { expect, test } from './fixtures'

/**
 * The app and the docs under the headers Vercel adds in production (`vercel.json`).
 * `vite preview` sends none of them, so without this a CSP too strict for the app (a blocked
 * worker, wasm, model fetch or inline script) would only show up once deployed. A CSP
 * violation is a console error, which the console guard of `fixtures.ts` fails on.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const response = await route.fetch()
    const { pathname } = new URL(route.request().url())
    await route.fulfill({
      response,
      headers: { ...response.headers(), ...vercelHeadersFor(pathname) },
    })
  })
})

test('the app loads and starts the camera under its CSP', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain("'wasm-unsafe-eval'")

  await page.getByRole('button', { name: 'Start camera' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await page.getByRole('button', { name: 'Stop' }).click()
})

test('the YOLO and OCR workers, models and wasm run under the CSP', async ({ page }) => {
  test.slow()
  await page.goto('/')

  await page.getByRole('button', { name: 'Or try a sample' }).click()
  await page.getByRole('button', { name: /Kia Stinger/ }).click()

  await expect(page.locator('.plate-text').first()).toBeVisible({ timeout: 90_000 })
})

for (const path of ['/docs/', '/docs/es/']) {
  test(`${path} renders under the docs CSP`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.headers()['content-security-policy']).toContain(
      "script-src 'self' 'unsafe-inline'",
    )

    await expect(page.locator('h1').first()).toBeVisible()
  })
}
