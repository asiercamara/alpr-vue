/**
 * Confidence helpers shared by the detection pipeline and the UI.
 */

/**
 * Mean of the per-character confidences of a plate.
 *
 * @param confidence - Non-empty list of confidences in `[0, 1]`.
 * @returns The mean, in the same range.
 */
export function meanConfidence(confidence: number[]): number {
  return confidence.reduce((a, b) => a + b, 0) / confidence.length
}

/**
 * CSS colour that represents a confidence level, from green (high) to red (poor).
 *
 * The thresholds map to the `--color-conf-*` tokens defined in `main.css`.
 *
 * @param value - Confidence in `[0, 1]`.
 * @returns A `var(--color-conf-*)` reference.
 */
export function confidenceColor(value: number): string {
  if (value >= 0.9) return 'var(--color-conf-high)'
  if (value >= 0.75) return 'var(--color-conf-good)'
  if (value >= 0.6) return 'var(--color-conf-mid)'
  if (value >= 0.45) return 'var(--color-conf-low)'
  return 'var(--color-conf-poor)'
}
