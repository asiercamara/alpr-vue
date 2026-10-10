import { describe, it, expect } from 'vitest'
import { intersection, iou, nonMaxSuppression, union } from './boundingBoxUtils'

function box(x1: number, y1: number, x2: number, y2: number, confidence = 0.9, label = 'plate') {
  return { x1, y1, x2, y2, label, confidence, area: (x2 - x1) * (y2 - y1) }
}

describe('intersection', () => {
  it('returns the overlapping area', () => {
    expect(intersection(box(0, 0, 10, 10), box(5, 5, 15, 15))).toBe(25)
  })

  it('returns 0 for disjoint boxes', () => {
    expect(intersection(box(0, 0, 10, 10), box(20, 20, 30, 30))).toBe(0)
  })

  it('returns 0 for boxes that only touch on an edge', () => {
    expect(intersection(box(0, 0, 10, 10), box(10, 0, 20, 10))).toBe(0)
  })

  it('returns the inner area when one box contains the other', () => {
    expect(intersection(box(0, 0, 100, 100), box(10, 10, 20, 20))).toBe(100)
  })
})

describe('union', () => {
  it('is the sum of both areas minus the intersection', () => {
    expect(union(box(0, 0, 10, 10), box(5, 5, 15, 15))).toBe(175)
  })

  it('is the sum of both areas for disjoint boxes', () => {
    expect(union(box(0, 0, 10, 10), box(20, 20, 30, 30))).toBe(200)
  })
})

describe('iou', () => {
  it('is 1 for identical boxes', () => {
    expect(iou(box(0, 0, 10, 10), box(0, 0, 10, 10))).toBe(1)
  })

  it('is 0 for disjoint boxes', () => {
    expect(iou(box(0, 0, 10, 10), box(20, 20, 30, 30))).toBe(0)
  })

  it('is intersection over union for partial overlap', () => {
    expect(iou(box(0, 0, 10, 10), box(5, 5, 15, 15))).toBeCloseTo(25 / 175)
  })

  it('is 0 (not NaN) for two zero-area boxes', () => {
    expect(iou(box(5, 5, 5, 5), box(5, 5, 5, 5))).toBe(0)
  })
})

describe('nonMaxSuppression', () => {
  it('returns an empty array for no boxes', () => {
    expect(nonMaxSuppression([])).toEqual([])
  })

  it('keeps a single box', () => {
    const only = box(0, 0, 10, 10)
    expect(nonMaxSuppression([only])).toEqual([only])
  })

  it('drops a lower-confidence box that overlaps above the 0.7 IoU threshold', () => {
    const best = box(0, 0, 100, 100, 0.95)
    const duplicate = box(2, 2, 100, 100, 0.8)
    expect(nonMaxSuppression([best, duplicate])).toEqual([best])
  })

  it('keeps boxes that overlap below the threshold', () => {
    const a = box(0, 0, 10, 10, 0.95)
    const b = box(5, 5, 15, 15, 0.9)
    expect(nonMaxSuppression([a, b])).toEqual([a, b])
  })

  it('keeps overlapping boxes with different labels', () => {
    const a = box(0, 0, 100, 100, 0.95, 'plate')
    const b = box(0, 0, 100, 100, 0.9, 'other')
    expect(nonMaxSuppression([a, b])).toEqual([a, b])
  })

  it('does not mutate the input array', () => {
    const boxes = [box(0, 0, 100, 100, 0.95), box(1, 1, 100, 100, 0.8)]
    const copy = [...boxes]
    nonMaxSuppression(boxes)
    expect(boxes).toEqual(copy)
  })

  it('collapses a cluster and keeps the distant box', () => {
    const best = box(0, 0, 100, 100, 0.95)
    const far = box(500, 500, 600, 600, 0.7)
    const result = nonMaxSuppression([
      best,
      box(1, 1, 100, 100, 0.9),
      box(0, 2, 99, 100, 0.85),
      far,
    ])
    expect(result).toEqual([best, far])
  })
})
