import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  cleanPlateText,
  decodeRegion,
  fixSpanishPlateDigits,
  postprocessOutput,
} from './textProcessor'

const DIGITS_AND_LOOKALIKES = '0123456789OQI'
const CONSONANTS = 'BCDFGHJKLMNPRSTVWXYZ'
const SPANISH_PLATE = /^[0-9OQI]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/

const spanishPlate = fc
  .tuple(
    fc.array(fc.constantFrom(...DIGITS_AND_LOOKALIKES), { minLength: 4, maxLength: 4 }),
    fc.array(fc.constantFrom(...CONSONANTS), { minLength: 3, maxLength: 3 }),
  )
  .map(([digits, letters]) => digits.join('') + letters.join(''))

describe('cleanPlateText (properties)', () => {
  const padChar = fc.string({ minLength: 1, maxLength: 1 })

  it('only removes trailing pad characters: the result is a prefix that does not end in one', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), padChar, (text, pad) => {
        const cleaned = cleanPlateText(text, pad)

        expect(text.startsWith(cleaned)).toBe(true)
        expect(cleaned.endsWith(pad)).toBe(false)
        expect(text.slice(cleaned.length)).toBe(pad.repeat(text.length - cleaned.length))
      }),
    )
  })

  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), padChar, (text, pad) => {
        const once = cleanPlateText(text, pad)
        return cleanPlateText(once, pad) === once
      }),
    )
  })

  it('strips any amount of padding, including regex special characters', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 12 }),
        padChar,
        fc.integer({ min: 0, max: 10 }),
        (text, pad, count) =>
          cleanPlateText(text + pad.repeat(count), pad) === cleanPlateText(text, pad),
      ),
    )
  })
})

describe('fixSpanishPlateDigits (properties)', () => {
  it('turns every look-alike in the numeric block into a digit and keeps the letters', () => {
    fc.assert(
      fc.property(spanishPlate, (plate) => {
        const fixed = fixSpanishPlateDigits(plate)

        expect(fixed).toMatch(/^[0-9]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/)
        expect(fixed.slice(4)).toBe(plate.slice(4))
        // Real digits are never touched
        for (let i = 0; i < 4; i++) {
          if (/[0-9]/.test(plate[i])) expect(fixed[i]).toBe(plate[i])
        }
      }),
    )
  })

  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.oneof(spanishPlate, fc.string({ maxLength: 10 })), (text) => {
        const once = fixSpanishPlateDigits(text)
        return fixSpanishPlateDigits(once) === once
      }),
    )
  })

  it('returns any other text unchanged', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 12 }).filter((text) => !SPANISH_PLATE.test(text)),
        (text) => fixSpanishPlateDigits(text) === text,
      ),
    )
  })
})

describe('postprocessOutput (properties)', () => {
  const alphabet = '0123456789ABCDEFGHJKLMNPRSTVWXYZ-'
  const slots = 9
  const config = { max_plate_slots: slots, alphabet, img_width: 140, img_height: 70 }
  const output = fc.float32Array({
    minLength: slots * alphabet.length,
    maxLength: slots * alphabet.length,
    min: 0,
    max: 1,
    noNaN: true,
  })

  it('reads the most likely character of every slot and its confidence', () => {
    fc.assert(
      fc.property(output, (raw) => {
        const result = postprocessOutput(raw, config, true) as {
          text: string
          confidence: number[]
        }

        expect(result.text.length).toBeLessThanOrEqual(slots)
        expect(result.confidence).toHaveLength(result.text.length)
        for (let slot = 0; slot < result.text.length; slot++) {
          const values = Array.from(raw.slice(slot * alphabet.length, (slot + 1) * alphabet.length))
          // The confidence is the winning probability of the slot
          expect(result.confidence[slot]).toBe(Math.max(...values))
        }
        // Padding is trimmed at the end only, so the text never ends in the pad character
        expect(result.text.endsWith('-')).toBe(false)
      }),
    )
  })

  it('returns the same text with or without confidences', () => {
    fc.assert(
      fc.property(output, (raw) => {
        const withConfidence = postprocessOutput(raw, config, true) as { text: string }
        return postprocessOutput(raw, config) === withConfidence.text
      }),
    )
  })

  it('rejects an output whose size does not match the configuration', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: slots * alphabet.length * 2 }), (length) => {
        fc.pre(length !== slots * alphabet.length)
        expect(() => postprocessOutput(new Float32Array(length), config)).toThrow()
      }),
    )
  })
})

describe('decodeRegion (properties)', () => {
  const regions = ['ES', 'FR', 'DE', 'IT', 'PT']

  it('returns the region with the highest probability, the first one on a tie', () => {
    fc.assert(
      fc.property(
        fc.float32Array({ minLength: 5, maxLength: 5, min: 0, max: 1, noNaN: true }),
        (probabilities) => {
          const expected = regions[probabilities.indexOf(Math.max(...probabilities))]
          return decodeRegion(probabilities, regions) === expected
        },
      ),
    )
  })

  it('rejects a probability vector of the wrong size', () => {
    expect(() => decodeRegion(new Float32Array(4), regions)).toThrow()
  })
})
