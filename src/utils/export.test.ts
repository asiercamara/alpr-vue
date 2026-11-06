import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

describe('generateCSV exact output', () => {
  beforeEach(() => {
    vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('15/01/2025 10:30:00')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes the header and one unquoted row per plate, separated by newlines', () => {
    const csv = generateCSV([
      makePlate({ id: 'p1' }),
      makePlate({ id: 'p2', confidence: 0.5, plateText: { text: 'XYZ789', confidence: [0.5] } }),
    ])

    expect(csv).toBe(
      [
        'Texto,Confianza,Fecha,ID',
        'ABC123,95.0%,15/01/2025 10:30:00,p1',
        'XYZ789,50.0%,15/01/2025 10:30:00,p2',
      ].join('\n'),
    )
  })

  it('quotes a cell with a line feed', () => {
    const text = 'AB\nCD'
    const csv = generateCSV([makePlate({ plateText: { text, confidence: [0.9] } })])

    expect(csv).toContain('"AB\nCD"')
  })
})

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

  it.each(['=1+1', '+1+1', '-1+1', '@SUM(A1)', '\t=1', '\r=1'])(
    'neutralizes formula prefix in %j',
    (text) => {
      const plate = makePlate({ text, plateText: { text, confidence: [0.9] } })
      const row = generateCSV([plate]).split('\n')[1]
      expect(row).toContain(`'${text}`)
    },
  )

  it.each([
    ['AB\rCD', '"AB\rCD"'],
    ['\r=1+1', `"'\r=1+1"`],
  ])('quotes a value with a carriage return: %j', (text, cell) => {
    const plate = makePlate({ text, plateText: { text, confidence: [0.9] } })

    // A lone CR ends a record for many CSV parsers, so the cell must be quoted
    expect(generateCSV([plate])).toContain(cell)
  })

  it('neutralizes formula prefix and still quotes commas', () => {
    const text = '=A1,B1'
    const plate = makePlate({ text, plateText: { text, confidence: [0.9] } })
    const csv = generateCSV([plate])
    expect(csv).toContain(`"'=A1,B1"`)
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
  let click: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.mocked(URL.createObjectURL).mockClear()
    vi.mocked(URL.revokeObjectURL).mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('downloads the CSV as a hidden link that is removed afterwards', async () => {
    const append = vi.spyOn(document.body, 'appendChild')
    const plates = [makePlate()]

    downloadCSV(plates, 'test.csv')

    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/csv;charset=utf-8;')
    expect(await blob.text()).toBe(generateCSV(plates))

    const link = append.mock.calls[0][0] as HTMLAnchorElement
    expect(link.tagName).toBe('A')
    expect(link.href).toBe('blob:test')
    expect(link.download).toBe('test.csv')
    expect(link.style.display).toBe('none')
    expect(click).toHaveBeenCalledTimes(1)
    expect(document.body.contains(link)).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })

  it('names the file matriculas.csv by default', () => {
    const append = vi.spyOn(document.body, 'appendChild')

    downloadCSV([makePlate()])

    expect((append.mock.calls[0][0] as HTMLAnchorElement).download).toBe('matriculas.csv')
  })
})
