import { describe, it, expect } from 'vitest'
import { generateCSV, downloadCSV } from '@/utils/export'
import type { PlateRecord } from '@/types/detection'

function makePlate(overrides: Partial<PlateRecord> = {}): PlateRecord {
  return {
    id: 'plate_1234567890_abcdef123',
    text: 'ABC123',
    confidence: 0.95,
    croppedImage: null,
    boundingBox: null,
    plateText: { text: 'ABC123', confidence: [0.95, 0.92, 0.88, 0.91, 0.93, 0.9] },
    timestamp: new Date('2025-01-15T10:30:00'),
    occurrences: 3,
    ...overrides,
  }
}

describe('generateCSV', () => {
  it('generates CSV with correct headers', () => {
    const csv = generateCSV([])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Texto,Confianza,Fecha,ID')
  })

  it('formats confidence as percentage', () => {
    const csv = generateCSV([makePlate({ confidence: 0.876 })])
    expect(csv).toContain('87.6%')
  })

  it('formats timestamp as locale string', () => {
    const plate = makePlate({ timestamp: new Date('2025-01-15T10:30:00') })
    const csv = generateCSV([plate])
    expect(csv).toContain('2025')
  })

  it('escapes commas in plate text', () => {
    const plate = makePlate({ text: 'AB,C,12', plateText: { text: 'AB,C,12', confidence: [0.9] } })
    const csv = generateCSV([plate])
    expect(csv).toContain('"AB,C,12"')
  })

  it('escapes double quotes in plate text', () => {
    const plate = makePlate({ text: 'AB"12', plateText: { text: 'AB"12', confidence: [0.9] } })
    const csv = generateCSV([plate])
    expect(csv).toContain('"AB""12"')
  })

  it('handles empty plates array', () => {
    const csv = generateCSV([])
    expect(csv).toBe('Texto,Confianza,Fecha,ID')
  })

  it('handles multiple plates', () => {
    const plates = [
      makePlate({ id: '1', text: 'AAA111', confidence: 0.9 }),
      makePlate({ id: '2', text: 'BBB222', confidence: 0.8 }),
    ]
    const csv = generateCSV(plates)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3)
  })

  it('includes plate ID', () => {
    const plate = makePlate({ id: 'plate_test' })
    const csv = generateCSV([plate])
    expect(csv).toContain('plate_test')
  })
})

describe('downloadCSV', () => {
  it('creates a blob URL and triggers download', () => {
    const createElementSpy = vi.spyOn(document, 'createElement')
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => document.createElement('a'))
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => document.createElement('a'))

    const mockClick = vi.fn()
    createElementSpy.mockImplementation(
      () =>
        ({
          click: mockClick,
          style: { display: '' },
          href: '',
          download: '',
          setAttribute: vi.fn(),
        }) as any,
    )

    downloadCSV([makePlate()], 'test.csv')

    expect(createElementSpy).toHaveBeenCalledWith('a')

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })
})
