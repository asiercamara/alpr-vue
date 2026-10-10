import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { convertToGrayscale, createInputTensor, preprocessImage } from './imageProcessor'

const bitmap = { width: 10, height: 10 } as ImageBitmap

describe('convertToGrayscale', () => {
  it('applies the weighted luminance formula', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255])
    expect(Array.from(convertToGrayscale(rgba))).toEqual([76, 150, 29])
  })

  it('maps white to 255 and black to 0', () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])
    expect(Array.from(convertToGrayscale(rgba))).toEqual([255, 0])
  })

  it('ignores the alpha channel', () => {
    const rgba = new Uint8ClampedArray([100, 100, 100, 0])
    expect(Array.from(convertToGrayscale(rgba))).toEqual([100])
  })

  it('returns one byte per pixel', () => {
    expect(convertToGrayscale(new Uint8ClampedArray(16 * 4))).toHaveLength(16)
  })

  it('returns an empty array for empty input', () => {
    expect(convertToGrayscale(new Uint8ClampedArray(0))).toHaveLength(0)
  })
})

describe('createInputTensor', () => {
  it('describes a single-channel uint8 [1, h, w, 1] tensor', () => {
    const data = new Uint8Array(6)
    expect(createInputTensor(data, 2, 3)).toEqual({ dims: [1, 2, 3, 1], data, type: 'uint8' })
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

  it('draws the bitmap at the target size and returns grayscale data', () => {
    // 2x1 target: one red pixel, one white pixel
    getImageData.mockReturnValue({
      data: new Uint8ClampedArray([255, 0, 0, 255, 255, 255, 255, 255]),
    })

    const result = preprocessImage(bitmap, 1, 2)

    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2, 1)
    expect(getImageData).toHaveBeenCalledWith(0, 0, 2, 1)
    expect(Array.from(result)).toEqual([76, 255])
  })
})
