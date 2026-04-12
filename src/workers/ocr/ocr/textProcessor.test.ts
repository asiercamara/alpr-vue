import { describe, it, expect } from 'vitest'
import { postprocessOutput, cleanPlateText } from './textProcessor'

/** Crea un Float32Array para `maxPlateSlots` slots y `alphabetLength` caracteres.
 *  Para cada slot se establece el índice ganador en `winnerIndices[slot]`
 *  con un softmax sintético: el ganador recibe `winnerConf` y el resto se reparte.
 */
function makeModelOutput(
  maxPlateSlots: number,
  alphabetLength: number,
  winnerIndices: number[],
  winnerConf = 0.9,
): Float32Array {
  const output = new Float32Array(maxPlateSlots * alphabetLength)
  const otherConf = (1 - winnerConf) / (alphabetLength - 1)
  for (let slot = 0; slot < maxPlateSlots; slot++) {
    const base = slot * alphabetLength
    for (let j = 0; j < alphabetLength; j++) {
      output[base + j] = j === winnerIndices[slot] ? winnerConf : otherConf
    }
  }
  return output
}

// alphabet: A-Z (26) + 0-9 (10) + '-' pad = 37 chars
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
const PAD_INDEX = ALPHABET.indexOf('-') // 36
const MAX_SLOTS = 9

describe('cleanPlateText', () => {
  it('removes trailing pad characters', () => {
    expect(cleanPlateText('ABC---', '-')).toBe('ABC')
  })

  it('leaves text without padding unchanged', () => {
    expect(cleanPlateText('ABC123', '-')).toBe('ABC123')
  })

  it('returns empty string when all chars are pad', () => {
    expect(cleanPlateText('---', '-')).toBe('')
  })

  it('does not remove pad chars in the middle', () => {
    expect(cleanPlateText('AB-CD-', '-')).toBe('AB-CD')
  })
})

describe('postprocessOutput', () => {
  const config = {
    max_plate_slots: MAX_SLOTS,
    alphabet: ALPHABET,
    pad_char: '-',
    img_width: 128,
    img_height: 64,
  }

  it('returns a string when returnConfidence is false', () => {
    const winnerIndices = [
      0,
      1,
      2,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
    ]
    const output = makeModelOutput(MAX_SLOTS, ALPHABET.length, winnerIndices)
    const result = postprocessOutput(output, config, false)
    expect(typeof result).toBe('string')
    expect(result).toBe('ABC')
  })

  it('confidence length equals text length (bug regression)', () => {
    // Plate "ABC123" → 6 chars + 3 padding slots
    const winnerIndices = [
      0,
      1,
      2,
      ALPHABET.indexOf('1'),
      ALPHABET.indexOf('2'),
      ALPHABET.indexOf('3'),
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
    ]
    const output = makeModelOutput(MAX_SLOTS, ALPHABET.length, winnerIndices)
    const result = postprocessOutput(output, config, true) as { text: string; confidence: number[] }

    expect(result.text).toBe('ABC123')
    expect(result.confidence).toHaveLength(result.text.length) // must be 6, not 9
    expect(result.confidence).toHaveLength(6)
  })

  it('confidence values are in [0, 1]', () => {
    const winnerIndices = [
      0,
      1,
      2,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
    ]
    const output = makeModelOutput(MAX_SLOTS, ALPHABET.length, winnerIndices)
    const result = postprocessOutput(output, config, true) as { text: string; confidence: number[] }

    for (const conf of result.confidence) {
      expect(conf).toBeGreaterThanOrEqual(0)
      expect(conf).toBeLessThanOrEqual(1)
    }
  })

  it('returns correct winner confidence values', () => {
    const winnerIndices = [
      0,
      1,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
      PAD_INDEX,
    ]
    const output = makeModelOutput(MAX_SLOTS, ALPHABET.length, winnerIndices, 0.95)
    const result = postprocessOutput(output, config, true) as { text: string; confidence: number[] }

    expect(result.text).toBe('AB')
    expect(result.confidence).toHaveLength(2)
    expect(result.confidence[0]).toBeCloseTo(0.95, 2)
    expect(result.confidence[1]).toBeCloseTo(0.95, 2)
  })

  it('handles full plate with no padding', () => {
    const winnerIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8] // 9 chars, no padding
    const output = makeModelOutput(MAX_SLOTS, ALPHABET.length, winnerIndices)
    const result = postprocessOutput(output, config, true) as { text: string; confidence: number[] }

    expect(result.text).toHaveLength(9)
    expect(result.confidence).toHaveLength(9)
  })

  it('throws when output length does not match config', () => {
    const badOutput = new Float32Array(10) // wrong size
    expect(() => postprocessOutput(badOutput, config, false)).toThrow()
  })
})
