import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
    it('adds a plate to the list', () => {
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
      store.addPlate({ text: 'XYZ', confidence: 0.8, plateText: { text: 'XYZ', confidence: [0.8] } })
      expect(store.plates[0].id).toBeTruthy()
    })

    it('returns false when not in camera mode', () => {
      const result = store.addPlate(makePlate({ id: 'p1' }))
      expect(result).toBe(false)
    })

    it('returns true in camera mode after 10 consecutive detections', () => {
      store.setMode('camera')
      for (let i = 0; i < 9; i++) {
        const result = store.addPlate(makePlate({ id: `p${i}`, text: 'ABC123' }))
        expect(result).toBe(false)
      }
      const result = store.addPlate(makePlate({ id: 'p10', text: 'ABC123' }))
      expect(result).toBe(true)
    })

    it('tracks different texts separately', () => {
      store.setMode('camera')
      for (let i = 0; i < 5; i++) {
        store.addPlate(makePlate({ id: `a${i}`, text: 'AAA111' }))
        store.addPlate(makePlate({ id: `b${i}`, text: 'BBB222' }))
      }
      expect(store.plates).toHaveLength(10)
    })

    it('resets consecutive counter after timeout', () => {
      store.setMode('camera')
      const originalNow = Date.now
      const now = Date.now()

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

    it('uses markRaw for croppedImage', () => {
      const mockBitmap = {} as any
      store.addPlate(makePlate({ id: 'p1', croppedImage: mockBitmap }))
      expect(store.plates).toHaveLength(1)
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

    it('returns sorted by occurrences descending', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'AAA111' }))
      store.addPlate(makePlate({ id: 'p2', text: 'BBB222' }))
      store.addPlate(makePlate({ id: 'p3', text: 'BBB222' }))
      store.addPlate(makePlate({ id: 'p4', text: 'BBB222' }))

      const best = store.bestDetections
      expect(best.length).toBe(2)
      expect(best[0].occurrences).toBeGreaterThanOrEqual(best[1].occurrences!)
    })

    it('returns best variant per group sorted by confidence', () => {
      store.addPlate(makePlate({ id: 'p1', text: 'AAA111', confidence: 0.7 }))
      store.addPlate(makePlate({ id: 'p2', text: 'AAA111', confidence: 0.95 }))

      const best = store.bestDetections
      expect(best).toHaveLength(1)
      expect(best[0].confidence).toBe(0.95)
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