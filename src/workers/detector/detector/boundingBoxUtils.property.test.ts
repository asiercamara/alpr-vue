import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { intersection, iou, nonMaxSuppression } from './boundingBoxUtils'

const box = fc
  .record({
    x1: fc.integer({ min: 0, max: 500 }),
    y1: fc.integer({ min: 0, max: 500 }),
    width: fc.integer({ min: 1, max: 300 }),
    height: fc.integer({ min: 1, max: 300 }),
    label: fc.constantFrom<string[]>('plate', 'other'),
    confidence: fc.double({ min: 0, max: 1, noNaN: true }),
  })
  .map(({ x1, y1, width, height, label, confidence }) => ({
    x1,
    y1,
    x2: x1 + width,
    y2: y1 + height,
    label,
    confidence,
    area: width * height,
  }))

describe('iou (properties)', () => {
  it('is symmetric and stays within [0, 1]', () => {
    fc.assert(
      fc.property(box, box, (a, b) => {
        const value = iou(a, b)
        expect(value).toBe(iou(b, a))
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }),
    )
  })

  it('is 1 for a box with itself', () => {
    fc.assert(fc.property(box, (a) => iou(a, a) === 1))
  })

  it('is 0 for boxes that do not overlap', () => {
    fc.assert(
      fc.property(box, box, (a, b) => {
        const farAway = { ...b, x1: a.x2 + b.x1, x2: a.x2 + b.x2 }
        return iou(a, farAway) === 0
      }),
    )
  })

  it('intersection never exceeds the smaller area', () => {
    fc.assert(fc.property(box, box, (a, b) => intersection(a, b) <= Math.min(a.area, b.area)))
  })
})

describe('nonMaxSuppression (properties)', () => {
  const boxes = fc.array(box, { maxLength: 15 })

  it('keeps a subsequence of the input, starting with the first box', () => {
    fc.assert(
      fc.property(boxes, (input) => {
        const kept = nonMaxSuppression(input)

        expect(kept.length > 0).toBe(input.length > 0)
        if (input.length > 0) expect(kept[0]).toBe(input[0])
        let cursor = 0
        for (const keptBox of kept) {
          cursor = input.indexOf(keptBox, cursor)
          expect(cursor).toBeGreaterThanOrEqual(0)
          cursor++
        }
      }),
    )
  })

  it('leaves no two kept boxes of the same label overlapping by 0.7 or more', () => {
    fc.assert(
      fc.property(boxes, (input) => {
        const kept = nonMaxSuppression(input)
        for (let i = 0; i < kept.length; i++) {
          for (let j = i + 1; j < kept.length; j++) {
            if (kept[i].label === kept[j].label) expect(iou(kept[i], kept[j])).toBeLessThan(0.7)
          }
        }
      }),
    )
  })

  it('only drops a box that a kept box of the same label overlaps by 0.7 or more', () => {
    fc.assert(
      fc.property(boxes, (input) => {
        const kept = nonMaxSuppression(input)
        for (const dropped of input.filter((candidate) => !kept.includes(candidate))) {
          expect(kept.some((k) => k.label === dropped.label && iou(k, dropped) >= 0.7)).toBe(true)
        }
      }),
    )
  })

  it('is idempotent', () => {
    fc.assert(
      fc.property(boxes, (input) => {
        const once = nonMaxSuppression(input)
        expect(nonMaxSuppression(once)).toEqual(once)
      }),
    )
  })
})
