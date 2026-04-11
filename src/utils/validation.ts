/**
 * Plate text validation, quality scoring, and Levenshtein similarity utilities.
 */
import type { PlateTextResult } from '@/types/detection'

/** Minimum mean OCR confidence required to accept a detection into the pipeline. */
export const PLATE_CONF_THRESHOLD = 0.7
/** Minimum per-character confidence; detections with any character below this are penalized. */
export const PLATE_CHAR_MIN_CONF = 0.5
/** Mean confidence threshold that triggers the fast-confirmation path (1 s instead of 3 s). */
export const PLATE_HIGH_CONF_MEAN = 0.8
/** Regex that a plate string must match to receive full format score. */
export const PLATE_FORMAT_REGEX = /^[A-Z0-9]{2,4}[\s-]?[A-Z0-9]{2,4}$/i

/**
 * Computes the normalized textual similarity between two plate strings.
 *
 * Both strings are normalized (whitespace stripped, uppercased) before comparison.
 * Similarity is computed as `1 - levenshteinDistance / maxLength`.
 *
 * @param text1 - First plate string.
 * @param text2 - Second plate string.
 * @returns Similarity score in `[0, 1]`, where 1 means identical.
 * @example
 * ```ts
 * calculateTextSimilarity('ABC123', 'ABC124') // → 0.833...
 * ```
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  if (text1 === text2) return 1.0

  const normalize = (text: string) => text.replace(/\s+/g, '').toUpperCase()
  const normText1 = normalize(text1)
  const normText2 = normalize(text2)

  const distance = levenshteinDistance(normText1, normText2)
  const maxLength = Math.max(normText1.length, normText2.length)

  return 1 - distance / maxLength
}

/**
 * Standard dynamic-programming Levenshtein implementation.
 *
 * @param s1 - Source string.
 * @param s2 - Target string.
 * @returns Minimum edit distance (insertions, deletions, substitutions) between `s1` and `s2`.
 */
function levenshteinDistance(s1: string, s2: string): number {
  const d: number[][] = Array(s1.length + 1)
    .fill(null)
    .map(() => Array(s2.length + 1).fill(0))

  for (let i = 0; i <= s1.length; i++) d[i][0] = i
  for (let j = 0; j <= s2.length; j++) d[0][j] = j

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    }
  }

  return d[s1.length][s2.length]
}

/** Result of plate quality scoring. */
interface QualityResult {
  /** Weighted quality score in `[0, 1]`. Plates with score >= 0.7 are considered valid. */
  score: number
  /** `true` when `score >= 0.7`, indicating the detection meets the minimum bar for storage. */
  isValid: boolean
  /** Human-readable reasons (in Spanish) for each criterion that was not met. */
  reasons: string[]
}

/**
 * Scores a plate detection against 4 weighted criteria and returns a quality result.
 *
 * Scoring breakdown (weights sum to 1.0):
 * - **Length** (0.2): plate text must be 4–10 characters.
 * - **Mean confidence** (0.3): `confidenceMean` must be >= `PLATE_CONF_THRESHOLD` (0.7).
 * - **Min char confidence** (0.25): every character confidence must be >= `PLATE_CHAR_MIN_CONF` (0.5).
 * - **Format regex** (0.25): text must match `PLATE_FORMAT_REGEX`.
 *
 * @param detection - Object containing the OCR result and pre-computed mean confidence.
 * @returns `QualityResult` with composite score, validity flag, and failed-criteria messages.
 */
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
      check: confidenceMean >= PLATE_CONF_THRESHOLD,
      weight: 0.3,
      reason: 'Baja confianza general',
    },
    {
      check: Math.min(...plateText.confidence) >= PLATE_CHAR_MIN_CONF,
      weight: 0.25,
      reason: 'Caracteres de muy baja confianza',
    },
    {
      check: PLATE_FORMAT_REGEX.test(text.trim()),
      weight: 0.25,
      reason: 'Formato inconsistente',
    },
  ]

  let score = 0
  const failedReasons: string[] = []

  criteria.forEach((criterion) => {
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
