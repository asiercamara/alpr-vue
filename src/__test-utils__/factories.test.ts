import { describe, it, expect } from 'vitest'
import {
  createMockPlateText,
  createMockBitmap,
  createMockDetectionBox,
  createMockPlateRecord,
  createMockCanvas2DContext,
} from './factories'

describe('test factories', () => {
  it('createMockPlateText returns valid PlateTextResult', () => {
    const pt = createMockPlateText()
    expect(pt.text).toBe('AB1234')
    expect(pt.confidence).toHaveLength(6)
    expect(pt.confidence.every((c) => c === 0.9)).toBe(true)
  })

  it('createMockPlateText respects overrides', () => {
    const pt = createMockPlateText({ text: 'XYZ', confidence: [0.5, 0.6, 0.7] })
    expect(pt.text).toBe('XYZ')
    expect(pt.confidence).toEqual([0.5, 0.6, 0.7])
  })

  it('createMockBitmap returns object with width/height/close', () => {
    const bm = createMockBitmap()
    expect(bm.width).toBe(100)
    expect(bm.height).toBe(50)
    expect(typeof bm.close).toBe('function')
  })

  it('createMockBitmap respects overrides', () => {
    const bm = createMockBitmap({ width: 640, height: 480 })
    expect(bm.width).toBe(640)
    expect(bm.height).toBe(480)
  })

  it('createMockDetectionBox returns valid DetectionBox', () => {
    const box = createMockDetectionBox()
    expect(box.x1).toBe(10)
    expect(box.y1).toBe(20)
    expect(box.x2).toBe(110)
    expect(box.y2).toBe(70)
    expect(box.confidence).toBe(0.9)
    expect(box.area).toBe(5000)
    expect(box.plateText.text).toBe('AB1234')
    expect(box.croppedImage).toBeDefined()
  })

  it('createMockDetectionBox respects overrides', () => {
    const box = createMockDetectionBox({ confidence: 0.5, x1: 0, y1: 0, x2: 50, y2: 50 })
    expect(box.confidence).toBe(0.5)
    expect(box.x1).toBe(0)
    expect(box.x2).toBe(50)
  })

  it('createMockPlateRecord returns valid PlateRecord', () => {
    const record = createMockPlateRecord()
    expect(record.id).toBeTruthy()
    expect(record.text).toBe('AB1234')
    expect(record.confidence).toBe(0.9)
    expect(record.croppedImage).toBeNull()
    expect(record.boundingBox).toBeDefined()
    expect(record.timestamp).toBeInstanceOf(Date)
  })

  it('createMockPlateRecord generates unique ids', () => {
    const r1 = createMockPlateRecord()
    const r2 = createMockPlateRecord()
    expect(r1.id).not.toBe(r2.id)
  })

  it('createMockPlateRecord respects overrides', () => {
    const record = createMockPlateRecord({ text: 'ZZZ999', confidence: 0.75 })
    expect(record.text).toBe('ZZZ999')
    expect(record.confidence).toBe(0.75)
  })

  it('createMockCanvas2DContext returns object with drawing methods', () => {
    const ctx = createMockCanvas2DContext()
    expect(typeof ctx.clearRect).toBe('function')
    expect(typeof ctx.strokeRect).toBe('function')
    expect(typeof ctx.fillRect).toBe('function')
    expect(typeof ctx.fillText).toBe('function')
    expect(typeof ctx.drawImage).toBe('function')
    const metrics = ctx.measureText('hello')
    expect(metrics.width).toBe(100)
  })

  it('createMockCanvas2DContext all stub methods are invocable', () => {
    const ctx = createMockCanvas2DContext()
    ctx.clearRect(0, 0, 100, 100)
    ctx.strokeRect(0, 0, 100, 100)
    ctx.fillRect(0, 0, 100, 100)
    ctx.fillText('hello', 10, 10)
    ctx.drawImage(new Image(), 0, 0)
    const imageData = ctx.getImageData(0, 0, 10, 10)
    expect(imageData.data).toBeInstanceOf(Uint8ClampedArray)
  })

  it('createMockBitmap close function is callable', () => {
    const bm = createMockBitmap()
    expect(() => bm.close()).not.toThrow()
  })

  it('createMockCanvas2DContext respects overrides', () => {
    const fillRectSpy = vi.fn()
    const ctx = createMockCanvas2DContext({ fillRect: fillRectSpy })
    ctx.fillRect(0, 0, 10, 10)
    expect(fillRectSpy).toHaveBeenCalled()
  })
})

import { vi } from 'vitest'
