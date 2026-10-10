import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'

const mocks = vi.hoisted(() => ({
  initializeModels: vi.fn(),
  prepare_input: vi.fn(),
  run_model: vi.fn(),
  process_output_boxes: vi.fn(),
  recognizePlateText: vi.fn(),
}))

vi.mock('./modelsLoader.js', () => ({ initializeModels: mocks.initializeModels }))
vi.mock('./detector/detector/imageProcessor.js', () => ({ prepare_input: mocks.prepare_input }))
vi.mock('./detector/detector/detectionProcessor.js', () => ({
  run_model: mocks.run_model,
  process_output_boxes: mocks.process_output_boxes,
}))
vi.mock('./ocr/ocr/ocrProcessor.js', () => ({ recognizePlateText: mocks.recognizePlateText }))

const bitmap = { width: 10, height: 10 } as ImageBitmap
let postMessage: Mock<(message: unknown) => void>

/** Imports the worker with models resolving to `ready`; returns the installed handler. */
async function startWorker(ready: boolean) {
  mocks.initializeModels.mockResolvedValue(ready)
  vi.resetModules()
  await import('./mainWorker')
  await vi.waitFor(() => expect(postMessage).toHaveBeenCalled())
  return self.onmessage as unknown as (event: {
    data: { imageBitmap: ImageBitmap }
  }) => Promise<void>
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
  postMessage = vi.fn()
  vi.spyOn(self, 'postMessage').mockImplementation(postMessage)
})

afterEach(() => {
  vi.restoreAllMocks()
  self.onmessage = null
})

describe('startup', () => {
  it('posts model_ready once the models load', async () => {
    await startWorker(true)

    expect(postMessage).toHaveBeenCalledWith({ status: 'model_ready' })
  })

  it('posts model_failed when the models fail to load', async () => {
    await startWorker(false)

    expect(postMessage).toHaveBeenCalledWith({ status: 'model_failed' })
  })
})

describe('onmessage', () => {
  it('detects plates, runs OCR on each crop and posts the boxes', async () => {
    const onmessage = await startWorker(true)
    postMessage.mockClear()
    const crop = { id: 'crop' }
    const boxes = [{ croppedImage: crop }]
    mocks.prepare_input.mockReturnValue([1, 2, 3])
    mocks.run_model.mockResolvedValue('predictions')
    mocks.process_output_boxes.mockReturnValue(boxes)
    mocks.recognizePlateText.mockResolvedValue({ text: 'AB1234', confidence: [1] })

    await onmessage({ data: { imageBitmap: bitmap } })

    expect(mocks.run_model).toHaveBeenCalledWith([1, 2, 3])
    expect(mocks.process_output_boxes).toHaveBeenCalledWith('predictions', bitmap)
    expect(mocks.recognizePlateText).toHaveBeenCalledWith(crop, true)
    expect(postMessage).toHaveBeenCalledWith([
      { croppedImage: crop, plateText: { text: 'AB1234', confidence: [1] } },
    ])
  })

  it('posts an empty list when nothing is detected', async () => {
    const onmessage = await startWorker(true)
    postMessage.mockClear()
    mocks.prepare_input.mockReturnValue([1])
    mocks.process_output_boxes.mockReturnValue([])

    await onmessage({ data: { imageBitmap: bitmap } })

    expect(postMessage).toHaveBeenCalledWith([])
    expect(mocks.recognizePlateText).not.toHaveBeenCalled()
  })

  it('posts an error when the models are not loaded', async () => {
    const onmessage = await startWorker(false)
    postMessage.mockClear()
    mocks.prepare_input.mockReturnValue([1])

    await onmessage({ data: { imageBitmap: bitmap } })

    expect(postMessage).toHaveBeenCalledWith({ error: 'No se pudo cargar el modelo' })
    expect(mocks.run_model).not.toHaveBeenCalled()
  })

  it('posts an error when the input cannot be prepared', async () => {
    const onmessage = await startWorker(true)
    postMessage.mockClear()
    mocks.prepare_input.mockReturnValue(null)

    await onmessage({ data: { imageBitmap: bitmap } })

    expect(postMessage).toHaveBeenCalledWith({
      error: 'No se pudo preparar la entrada de imagen',
    })
    expect(mocks.run_model).not.toHaveBeenCalled()
  })

  it('posts the error message when inference throws', async () => {
    const onmessage = await startWorker(true)
    postMessage.mockClear()
    mocks.prepare_input.mockReturnValue([1])
    mocks.run_model.mockRejectedValue(new Error('inference exploded'))

    await onmessage({ data: { imageBitmap: bitmap } })

    expect(postMessage).toHaveBeenCalledWith({ error: 'inference exploded' })
  })
})
