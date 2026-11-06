import { expect, test } from './fixtures'

/**
 * The live camera on Chromium's fake device (see `launchOptions` in
 * playwright.config.ts): the real getUserMedia → video → detection loop,
 * without a physical camera.
 */
test.describe('camera', () => {
  test('starts the camera, shows the live feed and stops it', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Camera off')).toBeVisible()

    await page.getByRole('button', { name: 'Start camera' }).click()

    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
    // The header and the video overlay both report the camera state; either label is valid
    await expect(page.getByText(/^(Live|Scanning)$/).first()).toBeVisible()
    await expect(page.getByText('Camera off')).toBeHidden()
    // The fake device really delivers frames
    await expect
      .poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.videoWidth))
      .toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Stop' }).click()

    await expect(page.getByText('Camera off')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start camera' })).toBeVisible()
  })

  test('switches from the rear to the front camera and keeps streaming', async ({ page }) => {
    await page.addInitScript(() => {
      const spy = window as unknown as { __facingModes: string[] }
      spy.__facingModes = []
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = (constraints) => {
        const video = constraints?.video as { facingMode?: { ideal?: string } } | undefined
        spy.__facingModes.push(video?.facingMode?.ideal ?? '')
        return original(constraints)
      }
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Start camera' }).click()
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()

    await page.getByTitle('Switch camera').click()

    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __facingModes: string[] }).__facingModes),
      )
      .toEqual(['environment', 'user'])
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  })

  test('shows the permission error and lets the user retry', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('denied', 'NotAllowedError'))
    })
    await page.goto('/')

    await page.getByRole('button', { name: 'Start camera' }).click()

    await expect(page.getByText('Camera error')).toBeVisible()
    await expect(page.getByText('Camera permission denied')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
  })
})
