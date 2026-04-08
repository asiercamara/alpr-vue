import { describe, it, expect } from 'vitest'
import { calculateTextSimilarity, evaluatePlateQuality } from '@/utils/validation'

describe('calculateTextSimilarity', () => {
  it('returns 1.0 for identical texts', () => {
    expect(calculateTextSimilarity('ABC123', 'ABC123')).toBe(1.0)
  })

  it('returns high similarity for texts differing by one character', () => {
    const result = calculateTextSimilarity('ABC123', 'ABC124')
    expect(result).toBeGreaterThanOrEqual(0.8)
    expect(result).toBeLessThan(1.0)
  })

  it('returns 0 for completely different texts of same length', () => {
    expect(calculateTextSimilarity('ABC', 'XYZ')).toBe(0)
  })

  it('normalizes spaces and case', () => {
    expect(calculateTextSimilarity('a b c', 'ABC')).toBe(1.0)
  })

  it('returns partial similarity for partially matching texts', () => {
    const result = calculateTextSimilarity('1234ABC', '1234XYZ')
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1.0)
  })

  it('handles empty strings', () => {
    expect(calculateTextSimilarity('', '')).toBe(1.0)
  })

  it('handles one empty string', () => {
    expect(calculateTextSimilarity('ABC', '')).toBe(0)
  })
})

describe('evaluatePlateQuality', () => {
  it('returns valid for a good detection', () => {
    const result = evaluatePlateQuality({
      plateText: { text: 'AB1234', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
      confidenceMean: 0.9,
    })
    expect(result.isValid).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(0.7)
    expect(result.reasons).toHaveLength(0)
  })

  it('returns invalid for low confidence', () => {
    const result = evaluatePlateQuality({
      plateText: { text: 'AB1234', confidence: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1] },
      confidenceMean: 0.1,
    })
    expect(result.isValid).toBe(false)
    expect(result.reasons).toContain('Baja confianza general')
  })

  it('returns invalid for short text', () => {
    const result = evaluatePlateQuality({
      plateText: { text: 'AB', confidence: [0.9, 0.9] },
      confidenceMean: 0.9,
    })
    expect(result.isValid).toBe(false)
    expect(result.reasons).toContain('Longitud inadecuada')
  })

  it('returns invalid for very low character confidence', () => {
    const result = evaluatePlateQuality({
      plateText: { text: 'AB1234', confidence: [0.3, 0.3, 0.3, 0.3, 0.3, 0.05] },
      confidenceMean: 0.26,
    })
    expect(result.isValid).toBe(false)
    expect(result.reasons).toContain('Caracteres de muy baja confianza')
  })

  it('returns invalid for inconsistent format', () => {
    const result = evaluatePlateQuality({
      plateText: { text: 'THISISWAYTOOLONG', confidence: Array(16).fill(0.9) },
      confidenceMean: 0.9,
    })
    expect(result.isValid).toBe(false)
    expect(result.reasons.length).toBeGreaterThanOrEqual(1)
  })

  it('accumulates multiple failure reasons', () => {
    const result = evaluatePlateQuality({
      plateText: { text: 'AB', confidence: [0.1, 0.1] },
      confidenceMean: 0.1,
    })
    expect(result.reasons.length).toBeGreaterThanOrEqual(2)
  })
})