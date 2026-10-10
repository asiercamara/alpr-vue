import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cropImage, prepare_input, resizeImage } from './imageProcessor'

vi.mock('../../modelsLoader.js', () => ({ MODEL_SIZE: 2 }))

const bitmap = { width: 10, height: 10 } as ImageBitmap
const drawImage = vi.fn()
const getImageData = vi.fn()
const transferToImageBitmap = vi.fn()
const created: { width: number; height: number }[] = []

beforeEach(() => {
  drawImage.mockReset()
  getImageData.mockReset()
  transferToImageBitmap.mockReset().mockReturnValue('bitmap-result')
  created.length = 0
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        public width: number,
        public height: number,
      ) {
        created.push({ width, height })
      }
      getContext() {
        return { drawImage, getImageData }
      }
      transferToImageBitmap = transferToImageBitmap
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('prepare_input', () => {
  it('returns normalized planar RGB (all R, then all G, then all B)', () => {
    // MODEL_SIZE 2 → 4 pixels
    getImageData.mockReturnValue({
      data: new Uint8ClampedArray([
        255, 0, 51, 255, 0, 255, 102, 255, 0, 0, 153, 255, 255, 255, 204, 255,
      ]),
    })

    const result = prepare_input(bitmap)!

    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2, 2)
    expect(result).toHaveLength(12)
    expect(result.slice(0, 4)).toEqual([1, 0, 0, 1])
    expect(result.slice(4, 8)).toEqual([0, 1, 0, 1])
    expect(result[8]).toBeCloseTo(51 / 255)
    expect(result[11]).toBeCloseTo(204 / 255)
  })

  it('returns null and warns when the image data is empty', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    getImageData.mockReturnValue({ data: new Uint8ClampedArray(0) })

    expect(prepare_input(bitmap)).toBeNull()
    expect(warn).toHaveBeenCalled()
  })

  it('returns null and logs when drawing throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    drawImage.mockImplementation(() => {
      throw new Error('boom')
    })

    expect(prepare_input(bitmap)).toBeNull()
    expect(error).toHaveBeenCalled()
  })
})

describe('cropImage', () => {
  it('copies the region into a canvas of the crop size and returns its bitmap', () => {
    const result = cropImage(bitmap, 1, 2, 3, 4)

    expect(created).toEqual([{ width: 3, height: 4 }])
    expect(drawImage).toHaveBeenCalledWith(bitmap, 1, 2, 3, 4, 0, 0, 3, 4)
    expect(result).toBe('bitmap-result')
  })
})

describe('resizeImage', () => {
  it('draws the bitmap scaled to the target size', async () => {
    const result = await resizeImage(bitmap, 20, 30)

    expect(created).toEqual([{ width: 20, height: 30 }])
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 20, 30)
    expect(result).toBe('bitmap-result')
  })
})
