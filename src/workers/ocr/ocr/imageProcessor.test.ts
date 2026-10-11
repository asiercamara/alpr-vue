import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractRgb, createInputTensor, preprocessImage } from './imageProcessor'

const bitmap = { width: 10, height: 10 } as ImageBitmap

describe('extractRgb', () => {
  it('keeps the RGB channels of each pixel in order', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255])
    expect(Array.from(extractRgb(rgba))).toEqual([255, 0, 0, 0, 255, 0, 0, 0, 255])
  })

  it('ignores the alpha channel', () => {
    const rgba = new Uint8ClampedArray([10, 20, 30, 0])
    expect(Array.from(extractRgb(rgba))).toEqual([10, 20, 30])
  })

  it('returns three bytes per pixel', () => {
    expect(extractRgb(new Uint8ClampedArray(16 * 4))).toHaveLength(16 * 3)
  })

  it('returns an empty array for empty input', () => {
    expect(extractRgb(new Uint8ClampedArray(0))).toHaveLength(0)
  })
})

describe('createInputTensor', () => {
  it('describes a three-channel uint8 [1, h, w, 3] tensor', () => {
    const data = new Uint8Array(18)
    expect(createInputTensor(data, 2, 3)).toEqual({ dims: [1, 2, 3, 3], data, type: 'uint8' })
  })
})

describe('preprocessImage', () => {
  const drawImage = vi.fn()
  const getImageData = vi.fn()

  beforeEach(() => {
    drawImage.mockReset()
    getImageData.mockReset()
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(
          public width: number,
          public height: number,
        ) {}
        getContext() {
          return { drawImage, getImageData }
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('draws the bitmap at the target size and returns RGB data', () => {
    // 2x1 target: one red pixel, one white pixel
    getImageData.mockReturnValue({
      data: new Uint8ClampedArray([255, 0, 0, 255, 255, 255, 255, 255]),
    })

    const result = preprocessImage(bitmap, 1, 2)

    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2, 1)
    expect(getImageData).toHaveBeenCalledWith(0, 0, 2, 1)
    expect(Array.from(result)).toEqual([255, 0, 0, 255, 255, 255])
  })
})
