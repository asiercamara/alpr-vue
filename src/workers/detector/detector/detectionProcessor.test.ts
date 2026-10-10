import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { process_output_boxes, processModelOutput } from './detectionProcessor'

const ort = vi.hoisted(() => ({ create: vi.fn() }))

// Only the system boundaries are faked: ONNX Runtime and OffscreenCanvas.
vi.mock('onnxruntime-web', () => ({
  InferenceSession: { create: ort.create },
  Tensor: class {
    constructor(
      public data: Float32Array,
      public dims: number[],
    ) {}
  },
}))

const crops: { width: number; height: number; drawArgs: number[] }[] = []

beforeEach(() => {
  crops.length = 0
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      drawArgs: number[] = []
      constructor(
        public width: number,
        public height: number,
      ) {
        crops.push(this)
      }
      getContext() {
        return { drawImage: (_img: unknown, ...args: number[]) => (this.drawArgs = args) }
      }
      transferToImageBitmap() {
        return { fromCanvas: this }
      }
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Each detection is [classId, x1, y1, x2, y2, _, confidence]. */
function makeTensor(detections: number[][]) {
  return {
    data: Float32Array.from(detections.flat()),
    dims: [detections.length, 7],
  } as never
}

// Image twice the model input size (384) → coordinates are scaled by 2
const bitmap = { width: 768, height: 768 } as ImageBitmap

describe('processModelOutput', () => {
  it('maps each row to label, confidence and bounding box', () => {
    const result = processModelOutput(makeTensor([[0, 10, 20, 30, 40, 0, 0.8]]))

    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('license_plate')
    expect(result[0].confidence).toBeCloseTo(0.8)
    expect(result[0].bounding_box).toEqual({ x1: 10, y1: 20, x2: 30, y2: 40 })
  })

  it('returns an empty array for no detections', () => {
    expect(processModelOutput(makeTensor([]))).toEqual([])
  })

  it('reads every row using the stride from dims', () => {
    const result = processModelOutput(
      makeTensor([
        [0, 1, 2, 3, 4, 0, 0.5],
        [0, 5, 6, 7, 8, 0, 0.9],
      ]),
    )
    expect(result.map((r) => r.bounding_box.x1)).toEqual([1, 5])
  })
})

describe('process_output_boxes', () => {
  it('scales model coordinates to the image size and crops the region', () => {
    const [box] = process_output_boxes(makeTensor([[0, 10, 20, 30, 40, 0, 0.9]]), bitmap)

    expect(box).toMatchObject({ x1: 20, y1: 40, x2: 60, y2: 80, area: 40 * 40 })
    expect(crops).toHaveLength(1)
    expect(crops[0]).toMatchObject({ width: 40, height: 40 })
    expect(crops[0].drawArgs).toEqual([20, 40, 40, 40, 0, 0, 40, 40])
    expect(box.croppedImage).toEqual({ fromCanvas: crops[0] })
  })

  it('discards detections below the 0.6 confidence threshold', () => {
    const boxes = process_output_boxes(
      makeTensor([
        [0, 10, 10, 50, 50, 0, 0.59],
        [0, 10, 10, 50, 50, 0, 0.3],
      ]),
      bitmap,
    )
    expect(boxes).toEqual([])
  })

  it('clamps boxes that fall outside the image', () => {
    const [box] = process_output_boxes(makeTensor([[0, -10, -10, 500, 500, 0, 0.9]]), bitmap)

    expect(box).toMatchObject({ x1: 0, y1: 0, x2: 768, y2: 768 })
  })

  it('discards boxes whose area is too small (≤ 25 px²)', () => {
    // 2x2 model px → 4x4 image px = 16 px²
    const boxes = process_output_boxes(makeTensor([[0, 10, 10, 12, 12, 0, 0.9]]), bitmap)
    expect(boxes).toEqual([])
  })

  it('discards degenerate boxes with inverted or zero extent', () => {
    const boxes = process_output_boxes(
      makeTensor([
        [0, 50, 50, 10, 10, 0, 0.9],
        [0, 10, 10, 10, 60, 0, 0.9],
      ]),
      bitmap,
    )
    expect(boxes).toEqual([])
  })

  it('applies non-max suppression to overlapping detections, keeping the most confident', () => {
    const boxes = process_output_boxes(
      makeTensor([
        [0, 10, 10, 50, 50, 0, 0.7],
        [0, 11, 11, 50, 50, 0, 0.95],
      ]),
      bitmap,
    )

    expect(boxes).toHaveLength(1)
    expect(boxes[0].confidence).toBeCloseTo(0.95)
  })

  it('keeps separate plates and orders them by confidence', () => {
    const boxes = process_output_boxes(
      makeTensor([
        [0, 5, 5, 25, 25, 0, 0.7],
        [0, 60, 60, 90, 90, 0, 0.95],
      ]),
      bitmap,
    )
    expect(boxes.map((b) => b.confidence.toFixed(2))).toEqual(['0.95', '0.70'])
  })
})

describe('run_model', () => {
  it('feeds the input as a tensor named "images" and returns the first output', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const output = { data: new Float32Array(0), dims: [0, 7] }
    const run = vi.fn().mockResolvedValue({ out0: output })
    ort.create
      .mockResolvedValueOnce({ run, outputNames: ['out0'] })
      .mockResolvedValueOnce({ run: vi.fn() })
    // Fresh instances so the real loader and `run_model` share the same session state
    vi.resetModules()
    const loader = await import('../../modelsLoader')
    const { run_model } = await import('./detectionProcessor')
    await loader.initializeModels()
    run.mockClear()

    const result = await run_model([0.1, 0.2, 0.3])

    expect(result).toBe(output)
    const feeds = run.mock.calls[0][0]
    expect(Array.from(feeds.images.data)).toEqual([
      Math.fround(0.1),
      Math.fround(0.2),
      Math.fround(0.3),
    ])
    expect(feeds.images.dims).toEqual([1, 3, 384, 384])
  })
})
