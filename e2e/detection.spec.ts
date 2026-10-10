import { expect, test } from './fixtures'

/**
 * Full pipeline with the real ONNX models: pick a bundled sample image, wait
 * for the YOLO + OCR worker to detect a plate, open its details and export CSV.
 */
test('detects a plate in a sample image, shows its details and exports CSV', async ({ page }) => {
  test.slow()
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
  await page.locator('.modal-content button').first().click()
  await expect(page.getByText('Confidence per character')).toBeHidden()

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
