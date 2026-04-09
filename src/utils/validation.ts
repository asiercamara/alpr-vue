/**
 * Módulo para validación y comparación de matrículas detectadas
 * Implementa algoritmos para calcular similitud textual y evaluar calidad de detecciones
 */
import type { PlateTextResult } from '@/types/detection'

export function calculateTextSimilarity(text1: string, text2: string): number {
  if (text1 === text2) return 1.0

  const normalize = (text: string) => text.replace(/\s+/g, '').toUpperCase()
  const normText1 = normalize(text1)
  const normText2 = normalize(text2)

  const distance = levenshteinDistance(normText1, normText2)
  const maxLength = Math.max(normText1.length, normText2.length)

  return 1 - (distance / maxLength)
}

function levenshteinDistance(s1: string, s2: string): number {
  const d: number[][] = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(0))

  for (let i = 0; i <= s1.length; i++) d[i][0] = i
  for (let j = 0; j <= s2.length; j++) d[0][j] = j

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      )
    }
  }

  return d[s1.length][s2.length]
}

interface QualityResult {
  score: number
  isValid: boolean
  reasons: string[]
}

export function evaluatePlateQuality(detection: {
  plateText: PlateTextResult
  confidenceMean: number
}): QualityResult {
  const { plateText, confidenceMean } = detection
  const text = plateText.text

  const criteria = [
    {
      check: text.length >= 4 && text.length <= 10,
      weight: 0.2,
      reason: 'Longitud inadecuada',
    },
    {
      check: confidenceMean >= 0.7,
      weight: 0.3,
      reason: 'Baja confianza general',
    },
    {
      check: Math.min(...plateText.confidence) >= 0.5,
      weight: 0.25,
      reason: 'Caracteres de muy baja confianza',
    },
    {
      check: /^[A-Z0-9]{2,4}[\s-]?[A-Z0-9]{2,4}$/i.test(text.trim()),
      weight: 0.25,
      reason: 'Formato inconsistente',
    },
  ]

  let score = 0
  const failedReasons: string[] = []

  criteria.forEach(criterion => {
    if (criterion.check) {
      score += criterion.weight
    } else {
      failedReasons.push(criterion.reason)
    }
  })

  return {
    score,
    isValid: score >= 0.7,
    reasons: failedReasons,
  }
}