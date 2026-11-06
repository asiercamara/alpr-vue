import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { confidenceColor, meanConfidence } from '@/utils/confidence'

describe('confidenceColor', () => {
  it.each([
    [1, 'high'],
    [0.9, 'high'],
    [0.89, 'good'],
    [0.75, 'good'],
    [0.74, 'mid'],
    [0.6, 'mid'],
    [0.59, 'low'],
    [0.45, 'low'],
    [0.44, 'poor'],
    [0, 'poor'],
  ])('maps %s to the %s level', (value, level) => {
    expect(confidenceColor(value)).toBe(`var(--color-conf-${level})`)
  })
})

describe('meanConfidence', () => {
  it('averages the per-character confidences', () => {
    expect(meanConfidence([0.9, 0.7, 0.8])).toBeCloseTo(0.8)
    expect(meanConfidence([0.5])).toBe(0.5)
  })

  it('stays between the weakest and the strongest character', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 12 }),
        (values) => {
          const mean = meanConfidence(values)
          return mean >= Math.min(...values) - 1e-12 && mean <= Math.max(...values) + 1e-12
        },
      ),
    )
  })
})
