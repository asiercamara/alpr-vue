import { describe, it, expect, vi, beforeEach } from 'vitest'

const ort = vi.hoisted(() => ({
  create: vi.fn(),
}))

vi.mock('onnxruntime-web', () => ({
  InferenceSession: { create: ort.create },
  Tensor: class {
    constructor(
      public data: Float32Array,
      public dims: number[],
    ) {}
  },
}))

/** Fresh module instance per test: it keeps the sessions in module-level state. */
async function loadModule() {
  vi.resetModules()
  return import('./modelsLoader')
}

beforeEach(() => {
  ort.create.mockReset()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('constants', () => {
  it('exposes the model input size and tensor shape', async () => {
    const { MODEL_SIZE, modelInputShape, yolo_classes } = await loadModule()

    expect(MODEL_SIZE).toBe(384)
    expect(modelInputShape).toEqual([1, 3, 384, 384])
    expect(yolo_classes).toEqual(['license_plate'])
  })
})

describe('initializeModels', () => {
  it('starts with no sessions', async () => {
    const { modelYolov9, ocrModel } = await loadModule()

    expect(modelYolov9).toBeNull()
    expect(ocrModel).toBeNull()
  })

  it('loads both models, warms up YOLO and returns true', async () => {
    const yolo = { run: vi.fn().mockResolvedValue({}) }
    const ocr = { run: vi.fn() }
    ort.create.mockResolvedValueOnce(yolo).mockResolvedValueOnce(ocr)
    const loader = await loadModule()

    expect(await loader.initializeModels()).toBe(true)

    expect(loader.modelYolov9).toBe(yolo)
    expect(loader.ocrModel).toBe(ocr)
    expect(ort.create).toHaveBeenCalledTimes(2)
    expect(ort.create.mock.calls[0][0]).toBe('/models/yolo-v9-t-384-license-plates-end2end.onnx')
    expect(ort.create.mock.calls[1][0]).toBe('/models/european_mobile_vit_v2_ocr.onnx')
    expect(ort.create.mock.calls[0][1]).toMatchObject({ executionProviders: ['wasm'] })
    expect(yolo.run).toHaveBeenCalledTimes(1)
    const warmup = yolo.run.mock.calls[0][0].images
    expect(warmup.dims).toEqual([1, 3, 384, 384])
    expect(warmup.data).toHaveLength(3 * 384 * 384)
  })

  it('returns false and does not load OCR when YOLO fails to load', async () => {
    ort.create.mockRejectedValueOnce(new Error('no yolo'))
    const loader = await loadModule()

    expect(await loader.initializeModels()).toBe(false)

    expect(ort.create).toHaveBeenCalledTimes(1)
    expect(loader.ocrModel).toBeNull()
  })

  it('returns false when the YOLO warmup run fails', async () => {
    ort.create.mockResolvedValueOnce({ run: vi.fn().mockRejectedValue(new Error('warmup')) })
    const loader = await loadModule()

    expect(await loader.initializeModels()).toBe(false)
    expect(ort.create).toHaveBeenCalledTimes(1)
  })

  it('returns false when the OCR model fails to load', async () => {
    ort.create
      .mockResolvedValueOnce({ run: vi.fn().mockResolvedValue({}) })
      .mockRejectedValueOnce(new Error('no ocr'))
    const loader = await loadModule()

    expect(await loader.initializeModels()).toBe(false)
    expect(loader.ocrModel).toBeNull()
  })
})
