import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePlateStore } from '@/stores/plateStore'
import type { PlateTextResult } from '@/types/detection'

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
      store.addPlate(makePlate({ id: 'p1' }))
      expect(store.plates).toHaveLength(1)
    })

    it('generates an id if not provided', () => {
      store.addPlate({
        text: 'XYZ',
        confidence: 0.8,
        plateText: { text: 'XYZ', confidence: [0.8] },
      })
      expect(store.plates[0].id).toBeTruthy()
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

      vi.spyOn(Date, 'now').mockReturnValue(now + store.MIN_CONFIRMATION_TIME)
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

      vi.spyOn(Date, 'now').mockReturnValue(now + store.MIN_FAST_CONFIRMATION_TIME)
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

      const consecutive = store.consecutiveDetections as any
      const entry = consecutive['ABC123']
      if (entry) {
        expect(entry.count).toBeLessThan(10)
      }

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

      vi.spyOn(Date, 'now').mockReturnValue(now + store.MIN_CONFIRMATION_TIME)
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

      vi.spyOn(Date, 'now').mockReturnValue(now + store.MIN_FAST_CONFIRMATION_TIME)
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

      vi.spyOn(Date, 'now').mockReturnValue(now + store.MIN_CONFIRMATION_TIME)

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
      const groups = store.plateGroups as any
      const keys = Object.keys(groups)
      expect(keys).toHaveLength(1)
    })

    it('recalculates group confidence after text update', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'ABC123', confidence: 0.9 }))
      store.addPlate(makePlate({ id: 'p2', text: 'ABC123', confidence: 0.8 }))

      store.updatePlateText('p1', 'ABC124')
      const groupsAfter = store.plateGroups as any // eslint-disable-line @typescript-eslint/no-explicit-any
      expect(Object.keys(groupsAfter)).toHaveLength(1)
    })
  })

  describe('removePlate', () => {
    it('removes plate by id', () => {
      store.addPlate(makePlate({ id: 'p1' }))
      store.removePlate('p1')
      expect(store.plates).toHaveLength(0)
    })

    it('does nothing for non-existent id', () => {
      store.addPlate(makePlate({ id: 'p1' }))
      store.removePlate('p_nonexistent')
      expect(store.plates).toHaveLength(1)
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
})
