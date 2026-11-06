import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  PLATE_EDGE_GAP_RATIO,
  calculateTextSimilarity,
  evaluatePlateQuality,
  isPlateTouchingFrameEdge,
} from '@/utils/validation'

/** Plate-like text: letters, digits and the spaces or dashes OCR can leave in. */
const plateText = fc.stringMatching(/^[A-Za-z0-9 -]{0,12}$/)
/** Text with at least one non-blank character, so it survives normalization. */
const nonBlankText = fc.stringMatching(/^[A-Za-z0-9]{1,12}$/)

describe('calculateTextSimilarity (properties)', () => {
  it('is 1 for identical texts', () => {
    fc.assert(fc.property(plateText, (a) => calculateTextSimilarity(a, a) === 1))
  })

  it('is symmetric', () => {
    fc.assert(
      fc.property(
        plateText,
        plateText,
        (a, b) => calculateTextSimilarity(a, b) === calculateTextSimilarity(b, a),
      ),
    )
  })

  it('stays within [0, 1]', () => {
    fc.assert(
      fc.property(plateText, plateText, (a, b) => {
        const similarity = calculateTextSimilarity(a, b)
        return similarity >= 0 && similarity <= 1
      }),
    )
  })

  it('ignores case and whitespace', () => {
    fc.assert(
      fc.property(nonBlankText, (a) => {
        const spaced = a.split('').join(' ')
        return (
          calculateTextSimilarity(a.toLowerCase(), a.toUpperCase()) === 1 &&
          calculateTextSimilarity(a, spaced) === 1
        )
      }),
    )
  })

  it('loses exactly 1/length for a single substituted character', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z0-9]{1,12}$/),
        fc.nat(),
        fc.constantFrom('A', 'B', 'C', '0', '1'),
        (text, rawIndex, replacement) => {
          const index = rawIndex % text.length
          fc.pre(text[index] !== replacement)
          const edited = text.slice(0, index) + replacement + text.slice(index + 1)

          return Math.abs(calculateTextSimilarity(text, edited) - (1 - 1 / text.length)) < 1e-12
        },
      ),
    )
  })

  it('is 1 for texts that are blank after normalization', () => {
    // Used to be NaN (0 / 0): both normalize to the empty string
    expect(calculateTextSimilarity(' ', '  ')).toBe(1)
    expect(calculateTextSimilarity('', ' ')).toBe(1)
  })
})

const frame = { width: 640, height: 480 }
const confidences = fc.array(fc.double({ min: 0, max: 1, noNaN: true }), {
  minLength: 1,
  maxLength: 10,
})

describe('evaluatePlateQuality (properties)', () => {
  it('keeps the score in [0, 1], validity consistent with it, and one reason per failed criterion', () => {
    fc.assert(
      fc.property(plateText, confidences, (text, confidence) => {
        const mean = confidence.reduce((a, b) => a + b, 0) / confidence.length
        const result = evaluatePlateQuality({
          plateText: { text, confidence },
          confidenceMean: mean,
        })

        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(1 + 1e-9)
        expect(result.isValid).toBe(result.score >= 0.7)
        expect(result.reasons.length).toBeLessThanOrEqual(4)
      }),
    )
  })

  it('accepts a well-formed plate read with high confidence', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z0-9]{4,8}$/),
        fc.double({ min: 0.8, max: 1, noNaN: true }),
        (text, level) => {
          const confidence = Array.from(text, () => level)
          const result = evaluatePlateQuality({
            plateText: { text, confidence },
            confidenceMean: level,
          })

          return result.isValid && result.reasons.length === 0
        },
      ),
    )
  })

  it('never accepts a plate whose box touches the frame edge, however good the read', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z0-9]{4,8}$/),
        fc.integer({ min: 20, max: 200 }),
        fc.integer({ min: 20, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.constantFrom('left', 'top', 'right', 'bottom'),
        (text, width, height, offset, edge) => {
          const x1 = edge === 'left' ? 0 : edge === 'right' ? frame.width - width : 100 + offset
          const y1 = edge === 'top' ? 0 : edge === 'bottom' ? frame.height - height : 100 + offset
          const box = { x1, y1, x2: x1 + width, y2: y1 + height }
          const confidence = Array.from(text, () => 0.99)

          const result = evaluatePlateQuality({
            plateText: { text, confidence },
            confidenceMean: 0.99,
            box,
            frame,
          })

          return !result.isValid
        },
      ),
    )
  })
})

describe('isPlateTouchingFrameEdge (properties)', () => {
  it('is false for a box well inside the frame', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 200 }),
        fc.integer({ min: 20, max: 100 }),
        fc.integer({ min: 50, max: 150 }),
        (width, height, margin) => {
          const box = { x1: margin, y1: margin, x2: margin + width, y2: margin + height }
          return !isPlateTouchingFrameEdge(box, frame)
        },
      ),
    )
  })

  it('is true when a side sits on the frame edge', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 1, max: 100 }),
        (width, height) =>
          isPlateTouchingFrameEdge({ x1: 0, y1: 100, x2: width, y2: 100 + height }, frame),
      ),
    )
  })

  it('is false for degenerate boxes, which have no size to compare the gap with', () => {
    expect(isPlateTouchingFrameEdge({ x1: 0, y1: 0, x2: 0, y2: 10 }, frame)).toBe(false)
    expect(isPlateTouchingFrameEdge({ x1: 5, y1: 5, x2: 3, y2: 9 }, frame)).toBe(false)
  })

  it('uses the documented gap ratio', () => {
    const width = 100
    const justInside = { x1: width * PLATE_EDGE_GAP_RATIO + 1, y1: 100, x2: 0, y2: 150 }
    justInside.x2 = justInside.x1 + width
    const justOutside = { ...justInside, x1: width * PLATE_EDGE_GAP_RATIO - 1, x2: 0 }
    justOutside.x2 = justOutside.x1 + width

    expect(isPlateTouchingFrameEdge(justInside, frame)).toBe(false)
    expect(isPlateTouchingFrameEdge(justOutside, frame)).toBe(true)
  })
})
