import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as loader from '../../modelsLoader'
import { recognizePlateText, runOcrModel } from './ocrProcessor'
import ocrConfig from '../../../models/cct_xs_v2_global_ocr_config.json'

const ort = vi.hoisted(() => ({ create: vi.fn() }))

// Only the system boundaries are faked: ONNX Runtime and OffscreenCanvas.
vi.mock('onnxruntime-web', () => ({
  InferenceSession: { create: ort.create },
  Tensor: class {
    constructor(
      public type: string | Float32Array,
      public data: Uint8Array | number[],
      public dims?: number[],
    ) {}
  },
}))

const bitmap = { width: 10, height: 10 } as ImageBitmap

/** One-hot model output spelling `word`, padded with the pad char. */
function outputFor(word: string): Float32Array {
  const { alphabet, max_plate_slots: slots, pad_char: pad } = ocrConfig
  const out = new Float32Array(slots * alphabet.length)
  for (let slot = 0; slot < slots; slot++) {
    const char = word[slot] ?? pad
    out[slot * alphabet.length + alphabet.indexOf(char)] = 1
  }
  return out
}

/** Region head output with all the probability on `region`. */
function regionOutputFor(region: string): Float32Array {
  const out = new Float32Array(ocrConfig.plate_regions.length)
  out[ocrConfig.plate_regions.indexOf(region)] = 1
  return out
}

/** Fake model outputs: the plate spelling `word` and the region head on `region`. */
function modelOutputs(word: string, region = 'Spain') {
  return { plate: { data: outputFor(word) }, region: { data: regionOutputFor(region) } }
}

/** Initializes the real loader with a fake OCR session that runs `ocrRun`. */
async function initModels(ocrRun: ReturnType<typeof vi.fn>) {
  ort.create.mockResolvedValueOnce({ run: vi.fn().mockResolvedValue({}) })
  ort.create.mockResolvedValueOnce({ run: ocrRun })
  await loader.initializeModels()
}

beforeEach(() => {
  ort.create.mockReset()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext() {
        return {
          drawImage: () => {},
          // Mid-grey pixels: the OCR input content does not matter, only its size
          getImageData: (_x: number, _y: number, w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4).fill(128),
          }),
        }
      }
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// The loader keeps the sessions in module state, so this block must stay first:
// it relies on no test having initialized the models yet.
describe('before the models are initialized', () => {
  it('runOcrModel throws', async () => {
    await expect(runOcrModel(new Uint8Array(4), 2, 2)).rejects.toThrow('Modelo OCR no inicializado')
  })

  it('recognizePlateText logs and returns an empty string', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await recognizePlateText(bitmap)).toBe('')
    expect(error).toHaveBeenCalled()
  })

  it('recognizePlateText returns an empty result object when confidence is requested', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await recognizePlateText(bitmap, true)).toEqual({ text: '', confidence: [] })
  })
})

describe('runOcrModel', () => {
  it('runs the model with a uint8 [1, h, w, 3] tensor and returns the plate and region outputs', async () => {
    const plate = new Float32Array([1, 2, 3])
    const region = new Float32Array([4, 5])
    const run = vi.fn().mockResolvedValue({
      // Output order must not matter: they are read by name
      region: { data: region },
      plate: { data: plate },
    })
    await initModels(run)
    const input = new Uint8Array(18)

    const result = await runOcrModel(input, 2, 3)

    expect(result.plate).toBe(plate)
    expect(result.region).toBe(region)
    expect(run.mock.calls[0][0].input).toMatchObject({
      type: 'uint8',
      data: input,
      dims: [1, 2, 3, 3],
    })
  })
})

describe('recognizePlateText', () => {
  it('preprocesses the crop to the configured size and returns the decoded text', async () => {
    const run = vi.fn().mockResolvedValue(modelOutputs('AB1234'))
    await initModels(run)

    expect(await recognizePlateText(bitmap)).toBe('AB1234')

    const input = run.mock.calls[0][0].input
    expect(input.dims).toEqual([1, ocrConfig.img_height, ocrConfig.img_width, 3])
    expect(input.data).toHaveLength(ocrConfig.img_height * ocrConfig.img_width * 3)
  })

  it('returns text, per-character confidence and region when requested', async () => {
    await initModels(vi.fn().mockResolvedValue(modelOutputs('XY9', 'France')))

    expect(await recognizePlateText(bitmap, true)).toEqual({
      text: 'XY9',
      confidence: [1, 1, 1],
      region: 'France',
    })
  })

  it('returns an empty result object on inference failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await initModels(vi.fn().mockRejectedValue(new Error('inference failed')))

    expect(await recognizePlateText(bitmap, true)).toEqual({ text: '', confidence: [] })
  })
})
