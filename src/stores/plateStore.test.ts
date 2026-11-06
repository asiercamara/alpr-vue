import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlateStore } from '@/stores/plateStore'
import type { PlateTextResult } from '@/types/detection'

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    confirmationTimeMs: 3000,
    fastConfirmationTimeMs: 1000,
  })),
  DEFAULTS: {
    feedbackEnabled: true,
    confidenceThreshold: 0.7,
    confirmationTime: 3,
    fastConfirmationTime: 1,
    continuousMode: true,
    skipDuplicates: true,
    theme: 'system',
    language: 'auto',
  },
}))

function makePlate(overrides: Record<string, unknown> = {}) {
  const id = `plate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  return {
    id,
    text: 'ABC123',
    confidence: 0.9,
    croppedImage: null,
    boundingBox: null,
    plateText: { text: 'ABC123', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] } as PlateTextResult,
    ...overrides,
  }
}

describe('plateStore', () => {
  let store: ReturnType<typeof usePlateStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePlateStore()
  })

  describe('addPlate', () => {
    it('adds a plate to the list outside camera mode', () => {
      const result = store.addPlate(makePlate({ id: 'p1' }))
      expect(result).toBe(false)
      expect(store.plates).toHaveLength(1)
      expect(store.plates[0].text).toBe('ABC123')
    })

    it('rejects duplicate ids', () => {
      store.addPlate(makePlate({ id: 'p1' }))
      expect(store.addPlate(makePlate({ id: 'p1' }))).toBe(false)
      expect(store.plates).toHaveLength(1)
    })

    it('generates an id if not provided', () => {
      store.addPlate({
        text: 'XYZ',
        confidence: 0.8,
        plateText: { text: 'XYZ', confidence: [0.8] },
      })
      expect(store.plates[0].id).toMatch(/^plate_\d+_[a-z0-9]+$/)
    })

    it('returns false when not in camera mode', () => {
      const result = store.addPlate(makePlate({ id: 'p1' }))
      expect(result).toBe(false)
    })

    it('uses markRaw for croppedImage', () => {
      const mockBitmap = {} as any
      store.addPlate(makePlate({ id: 'p1', croppedImage: mockBitmap }))
      expect(store.plates).toHaveLength(1)
    })
  })

  describe('camera mode confirmation - time based', () => {
    it('does not confirm before MIN_CONFIRMATION_TIME with normal confidence', () => {
      store.setMode('camera')
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      store.addPlate(
        makePlate({
          id: 'p1',
          text: 'ABC123',
          confidence: 0.6,
          plateText: { text: 'ABC123', confidence: [0.5, 0.5, 0.6, 0.7, 0.6, 0.5] },
        }),
      )

      vi.spyOn(Date, 'now').mockReturnValue(now + 2000)
      const result = store.addPlate(
        makePlate({
          id: 'p2',
          text: 'ABC123',
          confidence: 0.6,
          plateText: { text: 'ABC123', confidence: [0.5, 0.5, 0.6, 0.7, 0.6, 0.5] },
        }),
      )

      expect(result).toBe(false)
      vi.restoreAllMocks()
    })

    it('confirms after MIN_CONFIRMATION_TIME with normal confidence', () => {
      store.setMode('camera')
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      store.addPlate(
        makePlate({
          id: 'p1',
          text: 'ABC123',
          confidence: 0.6,
          plateText: { text: 'ABC123', confidence: [0.5, 0.5, 0.6, 0.7, 0.6, 0.5] },
        }),
      )

      vi.spyOn(Date, 'now').mockReturnValue(now + 3000)
      const result = store.addPlate(
        makePlate({
          id: 'p2',
          text: 'ABC123',
          confidence: 0.7,
          plateText: { text: 'ABC123', confidence: [0.6, 0.6, 0.7, 0.8, 0.7, 0.6] },
        }),
      )

      expect(result).toBe(true)
      vi.restoreAllMocks()
    })

    it('does not confirm before MIN_FAST_CONFIRMATION_TIME even with high confidence', () => {
      store.setMode('camera')
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      store.addPlate(
        makePlate({
          id: 'p1',
          text: 'ABC123',
          confidence: 0.9,
          plateText: { text: 'ABC123', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        }),
      )

      vi.spyOn(Date, 'now').mockReturnValue(now + 500)
      const result = store.addPlate(
        makePlate({
          id: 'p2',
          text: 'ABC123',
          confidence: 0.9,
          plateText: { text: 'ABC123', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        }),
      )

      expect(result).toBe(false)
      vi.restoreAllMocks()
    })

    it('confirms after MIN_FAST_CONFIRMATION_TIME with high confidence and all chars >= 0.5', () => {
      store.setMode('camera')
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      store.addPlate(
        makePlate({
          id: 'p1',
          text: 'ABC123',
          confidence: 0.9,
          plateText: { text: 'ABC123', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        }),
      )

      vi.spyOn(Date, 'now').mockReturnValue(now + 1000)
      const result = store.addPlate(
        makePlate({
          id: 'p2',
          text: 'ABC123',
          confidence: 0.85,
          plateText: { text: 'ABC123', confidence: [0.85, 0.8, 0.9, 0.88, 0.82, 0.85] },
        }),
      )

      expect(result).toBe(true)
      vi.restoreAllMocks()
    })

    it('does not fast-track a high-mean plate when one character is below 0.5', () => {
      store.setMode('camera')
      const now = Date.now()
      const weakChar = {
        text: 'ABC123',
        confidence: [0.95, 0.95, 0.95, 0.95, 0.95, 0.3],
      }
      vi.spyOn(Date, 'now').mockReturnValue(now)
      store.addPlate(makePlate({ id: 'p1', confidence: 0.9, plateText: weakChar }))

      // Fast confirmation time (1000 ms) has passed, but the weak char forces the normal one
      vi.spyOn(Date, 'now').mockReturnValue(now + 1000)
      expect(store.addPlate(makePlate({ id: 'p2', confidence: 0.9, plateText: weakChar }))).toBe(
        false,
      )

      vi.spyOn(Date, 'now').mockReturnValue(now + 3000)
      expect(store.addPlate(makePlate({ id: 'p3', confidence: 0.9, plateText: weakChar }))).toBe(
        true,
      )
      vi.restoreAllMocks()
    })

    it('resets consecutive counter after timeout in camera mode', () => {
      store.setMode('camera')
      const now = Date.now()

      vi.spyOn(Date, 'now').mockReturnValue(now)
      for (let i = 0; i < 5; i++) {
        store.addPlate(makePlate({ id: `p${i}`, text: 'ABC123' }))
      }

      vi.spyOn(Date, 'now').mockReturnValue(now + 10000)
      const result = store.addPlate(makePlate({ id: 'p_late', text: 'ABC123' }))
      expect(result).toBe(false)

      // The late detection opens a new window instead of adding to the old five
      expect(store.consecutiveDetections['ABC123'].count).toBe(1)

      vi.restoreAllMocks()
    })

    it('does not add intermediate detections to plates in camera mode', () => {
      store.setMode('camera')
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      vi.spyOn(Date, 'now').mockReturnValue(now + 500)
      store.addPlate(makePlate({ id: 'p2', text: 'ABC123' }))

      expect(store.plates).toHaveLength(0)
      vi.restoreAllMocks()
    })

    it('adds only best-confidence detection when confirmed', () => {
      store.setMode('camera')
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      store.addPlate(
        makePlate({
          id: 'p1',
          text: 'ABC123',
          confidence: 0.7,
          plateText: { text: 'ABC123', confidence: [0.7, 0.7, 0.7, 0.7, 0.7, 0.7] },
        }),
      )

      vi.spyOn(Date, 'now').mockReturnValue(now + 3000)
      store.addPlate(
        makePlate({
          id: 'p2',
          text: 'ABC123',
          confidence: 0.95,
          plateText: { text: 'ABC123', confidence: [0.95, 0.95, 0.95, 0.95, 0.95, 0.95] },
        }),
      )

      expect(store.plates).toHaveLength(1)
      expect(store.plates[0].confidence).toBe(0.95)
      expect(store.plates[0].confirmed).toBe(true)
      vi.restoreAllMocks()
    })

    it('adds confirmed flag to confirmed plates', () => {
      store.setMode('camera')
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      store.addPlate(
        makePlate({
          id: 'p1',
          text: 'ABC123',
          confidence: 0.9,
          plateText: { text: 'ABC123', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        }),
      )

      vi.spyOn(Date, 'now').mockReturnValue(now + 1000)
      store.addPlate(
        makePlate({
          id: 'p2',
          text: 'ABC123',
          confidence: 0.9,
          plateText: { text: 'ABC123', confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9] },
        }),
      )

      expect(store.plates[0].confirmed).toBe(true)
      vi.restoreAllMocks()
    })

    it('tracks different texts separately in camera mode', () => {
      store.setMode('camera')
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      for (let i = 0; i < 5; i++) {
        store.addPlate(makePlate({ id: `a${i}`, text: 'AAA111' }))
        store.addPlate(makePlate({ id: `b${i}`, text: 'BBB222' }))
      }

      expect(store.plates).toHaveLength(0)

      vi.spyOn(Date, 'now').mockReturnValue(now + 3000)

      store.addPlate(makePlate({ id: 'a_final', text: 'AAA111' }))
      store.addPlate(makePlate({ id: 'b_final', text: 'BBB222' }))

      expect(store.plates).toHaveLength(2)
      vi.restoreAllMocks()
    })
  })

  describe('grouping', () => {
    it('creates a group for a new text', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      const groups = store.plateGroups as any
      expect(Object.keys(groups).length).toBeGreaterThanOrEqual(1)
    })

    it('groups similar texts together', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      store.addPlate(makePlate({ id: 'p2', text: 'ABC124' }))
      const groups = store.plateGroups as any
      expect(Object.keys(groups)).toHaveLength(1)
    })

    it('keeps different texts in separate groups', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      store.addPlate(makePlate({ id: 'p2', text: 'XYZ999' }))
      const groups = store.plateGroups as any
      expect(Object.keys(groups)).toHaveLength(2)
    })

    it('increments occurrences for repeated similar text in same group', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      store.addPlate(makePlate({ id: 'p2', text: 'ABC123' }))
      const groups = store.plateGroups as any
      const groupKey = Object.keys(groups)[0]
      expect(groups[groupKey].totalOccurrences).toBe(2)
    })

    it('renames group when variant becomes more frequent (updateMainVariant)', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123', confidence: 0.9 }))
      for (let i = 0; i < 10; i++) {
        store.addPlate(makePlate({ id: `v${i}`, text: 'ABC124', confidence: 0.85 }))
      }

      const groups = store.plateGroups as any
      const keys = Object.keys(groups)
      expect(keys).toHaveLength(1)
      expect(keys[0]).toBe('ABC124')
    })
  })

  describe('bestDetections', () => {
    it('returns empty array when no groups', () => {
      expect(store.bestDetections).toEqual([])
    })

    it('returns sorted by most recent detection first', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'AAA111', timestamp: new Date('2025-01-01') }))
      store.addPlate(makePlate({ id: 'p2', text: 'BBB222', timestamp: new Date('2025-01-03') }))
      store.addPlate(makePlate({ id: 'p3', text: 'BBB222' }))
      store.addPlate(makePlate({ id: 'p4', text: 'BBB222' }))

      const best = store.bestDetections
      expect(best.length).toBe(2)
      expect(best[0].text).toBe('BBB222')
      expect(best[1].text).toBe('AAA111')
    })

    it('returns best variant per group sorted by confidence', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'AAA111', confidence: 0.7 }))
      store.addPlate(makePlate({ id: 'p2', text: 'AAA111', confidence: 0.95 }))

      const best = store.bestDetections
      expect(best).toHaveLength(1)
      expect(best[0].confidence).toBe(0.95)
    })

    it('prefers a confirmed variant over a more confident unconfirmed one', () => {
      // Upload mode: stored without being confirmed
      store.addPlate(makePlate({ id: 'u1', text: 'AAA111', confidence: 0.95 }))

      // Camera mode: confirmed after the normal confirmation time
      store.setMode('camera')
      const now = Date.now()
      const lowChars = { text: 'AAA111', confidence: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6] }
      vi.spyOn(Date, 'now').mockReturnValue(now)
      store.addPlate(makePlate({ id: 'c1', text: 'AAA111', confidence: 0.6, plateText: lowChars }))
      vi.spyOn(Date, 'now').mockReturnValue(now + 3000)
      store.addPlate(makePlate({ id: 'c2', text: 'AAA111', confidence: 0.6, plateText: lowChars }))
      vi.restoreAllMocks()

      const best = store.bestDetections
      expect(best).toHaveLength(1)
      expect(best[0].confirmed).toBe(true)
      expect(best[0].confidence).toBe(0.6)
    })
  })

  describe('updatePlateText', () => {
    it('updates text and plateText.text of an existing plate', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      const result = store.updatePlateText('p1', 'XYZ789')
      expect(result).toBe(true)
      expect(store.plates[0].text).toBe('XYZ789')
      expect(store.plates[0].plateText.text).toBe('XYZ789')
    })

    it('returns false for non-existent plate id', () => {
      const result = store.updatePlateText('nonexistent', 'XYZ789')
      expect(result).toBe(false)
    })

    it('updates variant text in plate groups', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      store.updatePlateText('p1', 'XYZ789')

      expect(Object.keys(store.plateGroups)).toEqual(['XYZ789'])
      expect(store.plateGroups['XYZ789'].mainText).toBe('XYZ789')
      expect(store.plateGroups['XYZ789'].variantTexts).toEqual([{ text: 'XYZ789', occurrences: 1 }])
    })

    it('recalculates group confidence after text update', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123', confidence: 0.9 }))
      store.addPlate(makePlate({ id: 'p2', text: 'ABC123', confidence: 0.8 }))

      store.updatePlateText('p1', 'ABC124')

      expect(Object.keys(store.plateGroups)).toEqual(['ABC123'])
      expect(store.plateGroups['ABC123'].confidenceMean).toBeCloseTo(0.85)
    })
  })

  describe('clearPlates', () => {
    it('clears all plates and groups', () => {
      store.addPlate(makePlate({ id: 'p1' }))
      store.addPlate(makePlate({ id: 'p2', text: 'XYZ999' }))
      store.setMode('camera')
      store.clearPlates()
      expect(store.plates).toHaveLength(0)
      const groups = store.plateGroups as any
      expect(Object.keys(groups)).toHaveLength(0)
    })
  })

  describe('clearConsecutiveDetections', () => {
    it('clears consecutive detections without clearing plates or groups', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      store.setMode('camera')

      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      store.addPlate(makePlate({ id: 'p2', text: 'XYZ789' }))

      expect(Object.keys(store.consecutiveDetections)).toContain('XYZ789')

      store.clearConsecutiveDetections()

      expect(Object.keys(store.consecutiveDetections)).toHaveLength(0)
      expect(store.plates).toHaveLength(1)
      expect(Object.keys(store.plateGroups)).toHaveLength(1)

      vi.restoreAllMocks()
    })
  })

  describe('setMode', () => {
    it('changes currentMode', () => {
      store.setMode('camera')
      expect(store.currentMode).toBe('camera')
    })

    it('sets mode to null', () => {
      store.setMode('camera')
      store.setMode(null)
      expect(store.currentMode).toBeNull()
    })
  })

  describe('updatePlateText edge cases', () => {
    it('edits a variant whose group is keyed by a different text', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123', confidence: 0.9 }))
      store.addPlate(makePlate({ id: 'p2', text: 'ABC123', confidence: 0.8 }))
      // Similar text: joins the ABC123 group as a variant instead of opening its own
      store.addPlate(makePlate({ id: 'p3', text: 'ABC124', confidence: 0.7 }))
      expect(Object.keys(store.plateGroups)).toEqual(['ABC123'])

      expect(store.updatePlateText('p3', 'ABC125')).toBe(true)

      expect(store.plates.find((p) => p.id === 'p3')?.text).toBe('ABC125')
      expect(Object.keys(store.plateGroups)).toEqual(['ABC123'])
      const group = store.plateGroups['ABC123']
      expect(group.variants.find((v) => v.id === 'p3')?.text).toBe('ABC125')
      expect(group.confidenceMean).toBeCloseTo((0.9 + 0.8 + 0.7) / 3)
      expect(group.variantTexts).toEqual([
        { text: 'ABC123', occurrences: 2 },
        { text: 'ABC125', occurrences: 1 },
      ])
    })

    it('moves only the edited occurrence to the new text', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123', confidence: 0.9 }))
      store.addPlate(makePlate({ id: 'p2', text: 'ABC123', confidence: 0.8 }))

      store.updatePlateText('p1', 'ABC124')

      expect(Object.keys(store.plateGroups)).toEqual(['ABC123'])
      const group = store.plateGroups['ABC123']
      expect(group.totalOccurrences).toBe(2)
      expect(group.variantTexts).toEqual([
        { text: 'ABC123', occurrences: 1 },
        { text: 'ABC124', occurrences: 1 },
      ])
      expect(
        group.variants.map((v) => [v.id, v.text]).sort(([a], [b]) => a.localeCompare(b)),
      ).toEqual([
        ['p1', 'ABC124'],
        ['p2', 'ABC123'],
      ])
      expect(group.confidenceMean).toBeCloseTo(0.85)
    })

    it('promotes the edited text when it becomes the most frequent in the group', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      store.addPlate(makePlate({ id: 'p2', text: 'ABC123' }))
      store.addPlate(makePlate({ id: 'p3', text: 'ABC124' }))

      store.updatePlateText('p1', 'ABC124')

      expect(Object.keys(store.plateGroups)).toEqual(['ABC124'])
      expect(store.plateGroups['ABC124'].variantTexts).toEqual([
        { text: 'ABC123', occurrences: 1 },
        { text: 'ABC124', occurrences: 2 },
      ])
    })

    it('keeps the counts when a plate is edited to the text it already has', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      store.addPlate(makePlate({ id: 'p2', text: 'ABC123' }))

      store.updatePlateText('p1', 'ABC123')

      expect(store.plateGroups['ABC123'].variantTexts).toEqual([{ text: 'ABC123', occurrences: 2 }])
    })

    describe('regrouping', () => {
      it('moves a plate out of its group when the new text no longer resembles it', () => {
        store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
        store.addPlate(makePlate({ id: 'p2', text: 'ABC123' }))

        store.updatePlateText('p1', 'XYZ789')

        expect(Object.keys(store.plateGroups).sort()).toEqual(['ABC123', 'XYZ789'])
        const old = store.plateGroups['ABC123']
        expect(old.totalOccurrences).toBe(1)
        expect(old.variants.map((v) => v.id)).toEqual(['p2'])
        expect(old.variantTexts).toEqual([{ text: 'ABC123', occurrences: 1 }])
        const created = store.plateGroups['XYZ789']
        expect(created.totalOccurrences).toBe(1)
        expect(created.variants.map((v) => v.id)).toEqual(['p1'])
        expect(created.variantTexts).toEqual([{ text: 'XYZ789', occurrences: 1 }])
      })

      it('joins another group when the new text resembles it, instead of duplicating the plate', () => {
        store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
        store.addPlate(makePlate({ id: 'p2', text: 'XYZ789' }))

        store.updatePlateText('p2', 'ABC124')

        expect(Object.keys(store.plateGroups)).toEqual(['ABC123'])
        const group = store.plateGroups['ABC123']
        expect(group.totalOccurrences).toBe(2)
        expect(group.variantTexts).toEqual([
          { text: 'ABC123', occurrences: 1 },
          { text: 'ABC124', occurrences: 1 },
        ])
        expect(store.bestDetections).toHaveLength(1)
      })

      it('replaces the group of a lone plate edited to an unrelated text', () => {
        store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))

        store.updatePlateText('p1', 'XYZ789')

        expect(Object.keys(store.plateGroups)).toEqual(['XYZ789'])
        expect(store.bestDetections.map((p) => p.text)).toEqual(['XYZ789'])
      })

      it('passes the group key on when the plate that held it leaves', () => {
        store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
        store.addPlate(makePlate({ id: 'p2', text: 'ABC124' }))

        store.updatePlateText('p1', 'XYZ789')

        expect(Object.keys(store.plateGroups).sort()).toEqual(['ABC124', 'XYZ789'])
        expect(store.plateGroups['ABC124'].mainText).toBe('ABC124')
        expect(store.plateGroups['ABC124'].variantTexts).toEqual([
          { text: 'ABC124', occurrences: 1 },
        ])
      })

      it('recomputes the mean confidence of both groups', () => {
        store.addPlate(makePlate({ id: 'p1', text: 'ABC123', confidence: 0.9 }))
        store.addPlate(makePlate({ id: 'p2', text: 'ABC123', confidence: 0.5 }))

        store.updatePlateText('p1', 'XYZ789')

        expect(store.plateGroups['ABC123'].confidenceMean).toBeCloseTo(0.5)
        expect(store.plateGroups['XYZ789'].confidenceMean).toBeCloseTo(0.9)
      })
    })

    it('keeps the plates list and the group variants in sync after an edit', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))

      store.updatePlateText('p1', 'ABC124')

      const variant = store.plateGroups['ABC124'].variants[0]
      expect(variant).toBe(store.plates[0])
      expect(variant.text).toBe('ABC124')
      expect(variant.plateText.text).toBe('ABC124')
    })

    it('still updates the plate when it does not belong to any group', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123' }))
      store.plateGroups = {}

      expect(store.updatePlateText('p1', 'XYZ789')).toBe(true)
      expect(store.plates[0].text).toBe('XYZ789')
      expect(store.plateGroups).toEqual({})
    })

    it('returns false when plate id does not exist', () => {
      const result = store.updatePlateText('nonexistent', 'XYZ')
      expect(result).toBe(false)
    })
  })

  describe('calculateGroupConfidence', () => {
    it('is stored when group is created', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'TEST12', confidence: 0.85 }))

      const groupKey = Object.keys(store.plateGroups)[0]
      const group = store.plateGroups[groupKey]
      expect(group.confidenceMean).toBe(0.85)
    })
  })

  describe('rule boundaries', () => {
    const NORMAL = { text: 'ABC123', confidence: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6] }
    const at = (now: number) => vi.spyOn(Date, 'now').mockReturnValue(now)

    beforeEach(() => {
      store.setMode('camera')
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('records how many frames confirmed the plate', () => {
      const now = Date.now()
      at(now)
      store.addPlate(makePlate({ id: 'a', confidence: 0.6, plateText: NORMAL }))
      at(now + 1000)
      store.addPlate(makePlate({ id: 'b', confidence: 0.6, plateText: NORMAL }))
      at(now + 3000)
      expect(store.addPlate(makePlate({ id: 'c', confidence: 0.6, plateText: NORMAL }))).toBe(true)

      expect(store.plates[0].occurrences).toBe(3)
      expect(store.plates[0].confirmed).toBe(true)
    })

    it('keeps the window open for a gap of exactly 5 s and resets it after that', () => {
      const now = Date.now()
      at(now)
      store.addPlate(makePlate({ id: 'a', confidence: 0.6, plateText: NORMAL }))
      at(now + 5000)
      expect(store.addPlate(makePlate({ id: 'b', confidence: 0.6, plateText: NORMAL }))).toBe(true)

      store.clearPlates()
      store.clearConsecutiveDetections()
      at(now + 10_000)
      store.addPlate(makePlate({ id: 'c', text: 'XYZ789', confidence: 0.6, plateText: NORMAL }))
      at(now + 15_001)
      expect(
        store.addPlate(makePlate({ id: 'd', text: 'XYZ789', confidence: 0.6, plateText: NORMAL })),
      ).toBe(false)
    })

    it('fast-tracks a plate whose mean confidence is exactly 0.8', () => {
      const now = Date.now()
      const chars = { text: 'ABC123', confidence: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8] }
      at(now)
      store.addPlate(makePlate({ id: 'a', confidence: 0.8, plateText: chars }))
      at(now + 1000)

      expect(store.addPlate(makePlate({ id: 'b', confidence: 0.8, plateText: chars }))).toBe(true)
    })

    it('fast-tracks a plate whose weakest character is exactly 0.5', () => {
      const now = Date.now()
      const chars = { text: 'ABC123', confidence: [0.5, 1, 1, 1, 1, 1] }
      at(now)
      store.addPlate(makePlate({ id: 'a', confidence: 0.9, plateText: chars }))
      at(now + 1000)

      expect(store.addPlate(makePlate({ id: 'b', confidence: 0.9, plateText: chars }))).toBe(true)
    })

    it('groups texts that are exactly 80 % similar and splits those below', () => {
      store.setMode('upload')
      store.addPlate(makePlate({ id: 'a', text: 'ABCDE' }))
      store.addPlate(makePlate({ id: 'b', text: 'ABCDF' }))
      expect(Object.keys(store.plateGroups)).toHaveLength(1)

      store.addPlate(makePlate({ id: 'c', text: 'ABCFF' }))
      expect(Object.keys(store.plateGroups)).toHaveLength(2)
    })

    it('orders groups by their most recent variant, not their oldest', () => {
      store.setMode('upload')
      store.addPlate(makePlate({ id: 'a1', text: 'AAA111', timestamp: new Date('2025-01-01') }))
      store.addPlate(makePlate({ id: 'a2', text: 'AAA111', timestamp: new Date('2025-01-05') }))
      store.addPlate(makePlate({ id: 'b1', text: 'ZZZ999', timestamp: new Date('2025-01-03') }))

      expect(store.bestDetections.map((p) => p.text)).toEqual(['AAA111', 'ZZZ999'])
    })

    it('orders groups by recency whichever group was added first', () => {
      store.setMode('upload')
      store.addPlate(makePlate({ id: 'b1', text: 'ZZZ999', timestamp: new Date('2025-01-03') }))
      store.addPlate(makePlate({ id: 'a1', text: 'AAA111', timestamp: new Date('2025-01-01') }))
      store.addPlate(makePlate({ id: 'a2', text: 'AAA111', timestamp: new Date('2025-01-05') }))

      expect(store.bestDetections.map((p) => p.text)).toEqual(['AAA111', 'ZZZ999'])
    })

    it('discards detections from an expired window when confirming', () => {
      const now = Date.now()
      at(now)
      store.addPlate(makePlate({ id: 'old', confidence: 0.99, plateText: NORMAL }))
      // More than 5 s later: the window restarts and the old detection no longer counts
      at(now + 6000)
      store.addPlate(makePlate({ id: 'new1', confidence: 0.6, plateText: NORMAL }))
      at(now + 9000)
      expect(store.addPlate(makePlate({ id: 'new2', confidence: 0.7, plateText: NORMAL }))).toBe(
        true,
      )

      // The best of the two detections in the new window, not the stale 0.99 one
      expect(store.plates[0].id).toBe('new2')
      expect(store.plates[0].occurrences).toBe(2)
    })

    it('keeps the group key on a tie between variants', () => {
      store.setMode('upload')
      store.addPlate(makePlate({ id: 'a1', text: 'ABC123' }))
      store.addPlate(makePlate({ id: 'a2', text: 'ABC123' }))
      store.addPlate(makePlate({ id: 'b1', text: 'ABC124' }))
      store.addPlate(makePlate({ id: 'b2', text: 'ABC124' }))

      expect(Object.keys(store.plateGroups)).toEqual(['ABC123'])
    })

    it('does not promote an earlier variant that only ties with the group key', () => {
      store.setMode('upload')
      store.addPlate(makePlate({ id: 'a1', text: 'ABC123' }))
      store.addPlate(makePlate({ id: 'b1', text: 'ABC124' }))
      store.addPlate(makePlate({ id: 'b2', text: 'ABC124' }))
      expect(Object.keys(store.plateGroups)).toEqual(['ABC124'])

      // ABC123 catches up and is listed first, but 2 is not more than 2
      store.addPlate(makePlate({ id: 'a2', text: 'ABC123' }))

      expect(Object.keys(store.plateGroups)).toEqual(['ABC124'])
      expect(store.plateGroups['ABC124'].variantTexts).toEqual([
        { text: 'ABC123', occurrences: 2 },
        { text: 'ABC124', occurrences: 2 },
      ])
    })

    it('promotes the first of several variants that tie for the most occurrences', () => {
      store.setMode('upload')
      for (const id of ['a1', 'a2', 'a3']) store.addPlate(makePlate({ id, text: 'ABC123' }))
      for (const id of ['b1', 'b2']) store.addPlate(makePlate({ id, text: 'ABC124' }))
      for (const id of ['c1', 'c2']) store.addPlate(makePlate({ id, text: 'ABC125' }))
      expect(Object.keys(store.plateGroups)).toEqual(['ABC123'])

      // Editing two ABC123 plates away leaves ABC124 and ABC125 level, both above it
      store.updatePlateText('a1', 'ZZZ999')
      expect(Object.keys(store.plateGroups).sort()).toEqual(['ABC123', 'ZZZ999'])
      store.updatePlateText('a2', 'ZZZ998')

      expect(Object.keys(store.plateGroups).sort()).toEqual(['ABC124', 'ZZZ999'])
      expect(store.plateGroups['ABC124'].mainText).toBe('ABC124')
    })

    it('merges two groups when a variant takes a key another group already uses', () => {
      store.setMode('upload')
      // AAAAAB and ABAAAA are two edits apart, so they start two groups. AAAAAA is one edit
      // from both: it joins the first and, once it leads, takes the key the second one uses.
      const texts = ['AAAAAB', 'ABAAAA', 'AAAAAA', 'AAAAAA', 'AAAAAA', 'AAAAAA']
      texts.forEach((text, i) => store.addPlate(makePlate({ id: `p${i}`, text })))

      const grouped = Object.values(store.plateGroups).flatMap((g) => g.variants.map((v) => v.id))
      expect(grouped.sort()).toEqual(store.plates.map((p) => p.id).sort())
      for (const [key, group] of Object.entries(store.plateGroups)) {
        expect(group.mainText).toBe(key)
        expect(group.totalOccurrences).toBe(group.variants.length)
      }
    })

    it('leaves other groups untouched when a plate is edited', () => {
      store.setMode('upload')
      store.addPlate(makePlate({ id: 'a', text: 'AAA111', confidence: 0.9 }))
      store.addPlate(makePlate({ id: 'b', text: 'ZZZ999', confidence: 0.5 }))

      store.updatePlateText('b', 'ZZZ998')

      const first = store.plateGroups['AAA111']
      expect(first.variantTexts).toEqual([{ text: 'AAA111', occurrences: 1 }])
      expect(first.variants.map((v) => v.text)).toEqual(['AAA111'])
      expect(first.confidenceMean).toBeCloseTo(0.9)
    })
  })
})
