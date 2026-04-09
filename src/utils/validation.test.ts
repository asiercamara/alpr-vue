import { describe, it, expect } from 'vitest'
import {
  calculateTextSimilarity,
  evaluatePlateQuality,
  PLATE_FORMAT_REGEX,
  PLATE_CONF_THRESHOLD,
  PLATE_CHAR_MIN_CONF,
  PLATE_HIGH_CONF_MEAN,
} from '@/utils/validation'

describe('PLATE_FORMAT_REGEX', () => {
  describe('formatos válidos', () => {
    it.each([
      ['AB1234',  '2 letras + 4 números, sin separador'],
      ['1234AB',  '4 números + 2 letras, sin separador'],
      ['ABC123',  '3+3, sin separador'],
      ['ABCD1234','4+4, sin separador (máximo)'],
      ['AB12',    '2+2, mínimo válido'],
      ['AB-1234', '2+guión+4'],
      ['AB 1234', '2+espacio+4'],
      ['1234 BCD','4+espacio+3 (matrícula española típica)'],
      ['ab1234',  'minúsculas — case insensitive'],
      ['Ab12Cd',  'mix mayúsculas/minúsculas'],
      ['AB12345', 'el motor lo interpreta como AB1+2345 (3+4), válido sin separador'],
    ])('acepta "%s" (%s)', (plate) => {
      expect(PLATE_FORMAT_REGEX.test(plate)).toBe(true)
    })
  })

  describe('formatos inválidos', () => {
    it.each([
      ['A1',          'demasiado corto (1+1)'],
      ['ABCDE1234',   'primer grupo demasiado largo (5 chars)'],
      ['AB-12345',    'con separador explícito, segundo grupo de 5 es demasiado largo'],
      ['AB!1234',     'carácter especial no permitido'],
      ['AB-1234-CD',  'dos separadores'],
      ['AB 1234 CD',  'dos separadores con espacios'],
      ['',            'cadena vacía'],
    ])('rechaza "%s" (%s)', (plate) => {
      expect(PLATE_FORMAT_REGEX.test(plate)).toBe(false)
    })
  })
})

describe('constantes de umbral', () => {
  it('PLATE_CONF_THRESHOLD es 0.7', () => {
    expect(PLATE_CONF_THRESHOLD).toBe(0.7)
  })

  it('PLATE_CHAR_MIN_CONF es 0.5', () => {
    expect(PLATE_CHAR_MIN_CONF).toBe(0.5)
  })

  it('PLATE_HIGH_CONF_MEAN es mayor que PLATE_CONF_THRESHOLD', () => {
    expect(PLATE_HIGH_CONF_MEAN).toBeGreaterThan(PLATE_CONF_THRESHOLD)
  })
})

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