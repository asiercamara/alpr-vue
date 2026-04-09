import type { PlateRecord } from '@/types/detection'

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

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
