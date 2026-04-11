/**
 * CSV generation and download utilities for exporting detected plates.
 */
import type { PlateRecord } from '@/types/detection'

/**
 * Escapes a value for safe inclusion in a CSV cell.
 *
 * @param value - The raw string to escape.
 * @returns The value wrapped in double quotes when it contains commas, double-quotes, or newlines;
 *   otherwise the original value unchanged.
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Generates a UTF-8 CSV string with headers (Texto, Confianza, Fecha, ID).
 *
 * @param plates - Array of plate records to include. Each plate occupies one row.
 * @returns The complete CSV content as a string, with a header row followed by one row per plate.
 * @example
 * ```ts
 * const csv = generateCSV(plateStore.plates)
 * ```
 */
export function generateCSV(plates: PlateRecord[]): string {
  const headers = ['Texto', 'Confianza', 'Fecha', 'ID']
  const rows = plates.map((plate) => [
    escapeCSV(plate.plateText.text),
    `${(plate.confidence * 100).toFixed(1)}%`,
    escapeCSV(new Date(plate.timestamp).toLocaleString()),
    escapeCSV(plate.id),
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

/**
 * Creates a temporary blob URL and triggers a browser download of the plate data as CSV.
 *
 * @param plates - Array of plate records to export.
 * @param filename - Name for the downloaded file. Defaults to `'matriculas.csv'`.
 *
 * The blob URL is revoked immediately after the click event to avoid memory leaks.
 */
export function downloadCSV(plates: PlateRecord[], filename = 'matriculas.csv'): void {
  const csv = generateCSV(plates)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
