import { seriousViolations } from './axe'
import { expect, test } from './fixtures'

/**
 * Full pipeline with the real ONNX models: pick a bundled sample image, wait
 * for the YOLO + OCR worker to detect a plate, open its details (accessibility
 * scan, edit the text) and export CSV.
 */
test('detects a plate in a sample image, edits it and exports CSV', async ({ page }) => {
  test.slow()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // Picked right after load, while the worker is still loading the models: the image
  // must be processed once they are ready, not dropped.
  await page.goto('/')

  await page.getByRole('button', { name: 'Or try a sample' }).click()
  await page.getByRole('button', { name: /Kia Stinger/ }).click()

  // The model loads and the image is scanned in a worker: allow a long first run.
  const plate = page.locator('.plate-text').first()
  await expect(plate).toBeVisible({ timeout: 90_000 })
  await expect(plate).toHaveText(/\S{4,}/)
  await expect(page.getByText('No detections')).toBeHidden()

  // Details modal
  await page.locator('.card', { has: plate }).first().click()
  await expect(page.getByText('Confidence per character')).toBeVisible()
  // The modal fades in: axe would measure contrast on half-transparent colours
  const modal = page.locator('.modal-content')
  await expect(modal).toHaveCSS('opacity', '1')
  await expect(modal.locator('xpath=..')).toHaveCSS('opacity', '1')
  // The page behind the modal is dimmed by its overlay: scan the modal (teleported to <body>) only
  const serious = await seriousViolations(page, ['#app'])
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([])

  // Correct the text: the list shows the new text once the modal is closed
  await page.getByTitle('Edit').click()
  await page.locator('.modal-content input').fill('TEST123')
  await page.getByTitle('Save').click()
  await modal.getByLabel('Close').click()
  await expect(page.getByText('Confidence per character')).toBeHidden()
  await expect(plate).toHaveText('TEST123')

  // CSV export
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.csv$/)
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  const csv = Buffer.concat(chunks).toString('utf8')
  expect(csv.split('\n').length).toBeGreaterThan(1)
  expect(csv).toContain((await plate.innerText()).trim())
})
