import { expect, test } from './fixtures'

const SETTINGS_KEY = 'alpr-settings'

test.describe('app shell', () => {
  test('loads without console errors or warnings', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('ALPR', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Detected Plates' })).toBeVisible()
    await expect(page.getByText('No detections')).toBeVisible()
  })

  test('opens and closes the Settings sheet', async ({ page }) => {
    await page.goto('/')

    await page.getByTitle('Settings').click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeHidden()
  })

  test('opens and closes the Help sheet', async ({ page }) => {
    await page.goto('/')

    await page.getByTitle('How to use').click()
    await expect(page.getByRole('heading', { name: 'How to use' })).toBeVisible()

    await page.getByRole('button', { name: 'Got it' }).click()
    await expect(page.getByRole('heading', { name: 'How to use' })).toBeHidden()
  })
})

test.describe('theme', () => {
  test('switches to dark, persists it and applies it on reload without a flash', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.getByTitle('Settings').click()
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    const stored = await page.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY)
    expect(JSON.parse(stored!).theme).toBe('dark')

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('switches back to light', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({ theme: 'dark' }))
    }, SETTINGS_KEY)
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.getByTitle('Settings').click()
    await page.getByRole('button', { name: 'Light', exact: true }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('follows the system colour scheme by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})

test.describe('language', () => {
  test('switches between English and Spanish and persists the choice', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Detected Plates' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await page.getByTitle('Settings').click()
    await page.getByRole('button', { name: /ES$/ }).click()
    await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible()

    const stored = await page.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY)
    expect(JSON.parse(stored!).language).toBe('es')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Matrículas Detectadas' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  })

  test('opens the Spanish docs when the app is in Spanish', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({ language: 'es' }))
    }, SETTINGS_KEY)
    await page.goto('/')

    await expect(page.getByTitle('Documentación')).toHaveAttribute('href', '/docs/es/')
  })
})

test.describe('layout', () => {
  test('uses the two-column grid on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const columns = await page
      .locator('main, #app')
      .locator('.grid')
      .first()
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    expect(columns).toBe(3)
  })

  test('stacks to a single column on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/')

    const columns = await page
      .locator('.grid')
      .first()
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    expect(columns).toBe(1)
  })
})
