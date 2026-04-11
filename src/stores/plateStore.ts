/**
 * Detected plates state with Levenshtein-based grouping, time-based camera confirmation,
 * variant tracking, and text editing.
 */
import { ref, computed, markRaw } from 'vue'
import { defineStore } from 'pinia'
import {
  calculateTextSimilarity,
  PLATE_HIGH_CONF_MEAN,
  PLATE_CHAR_MIN_CONF,
} from '@/utils/validation'
import { useSettingsStore } from '@/stores/settingsStore'
import type { PlateRecord, PlateTextResult } from '@/types/detection'

/** A single observed OCR text variant and how many times it appeared within a group. */
interface VariantText {
  /** The OCR text string for this variant. */
  text: string
  /** Number of detections that produced this exact text. */
  occurrences: number
}

/** A cluster of plate records whose texts are mutually similar (Levenshtein >= 0.8). */
interface PlateGroup {
  /** The most-frequent variant text, used as the display key for the group. */
  mainText: string
  /** Sum of occurrences across all variants in the group. */
  totalOccurrences: number
  /** All individual `PlateRecord` detections belonging to this group. */
  variants: PlateRecord[]
  /** Frequency table of distinct OCR texts seen within this group. */
  variantTexts: VariantText[]
  /** Running mean detection confidence across all variants. */
  confidenceMean: number
}

/** Accumulated state for ongoing time-windowed confirmation of a single plate text. */
interface ConsecutiveDetection {
  /** How many frames have seen this plate text within the current window. */
  count: number
  /** Timestamp of the first detection in the current window, or `null` if not started. */
  firstTimestamp: number | null
  /** Timestamp of the most recent detection, used to detect window expiry. */
  lastTimestamp: number | null
  /** All detection records accumulated in the current window. */
  detections: PlateRecord[]
}

/**
 * Levenshtein similarity threshold for merging two plates into the same group.
 * Plates with similarity >= 0.8 are considered the same physical plate.
 */
const SIMILARITY_THRESHOLD = 0.8
/**
 * If no new detection for a given text arrives within this many milliseconds,
 * the consecutive-detection window resets to zero.
 */
const CONSECUTIVE_DETECTION_TIMEOUT = 5000
const HIGH_CONFIDENCE_MEAN = PLATE_HIGH_CONF_MEAN
const HIGH_CONFIDENCE_MIN_CHAR = PLATE_CHAR_MIN_CONF

export const usePlateStore = defineStore('plateStore', () => {
  /** Flat list of all confirmed (or upload-mode) plate records, most recent first. */
  const plates = ref<PlateRecord[]>([])
  /** Grouped plates keyed by the most-frequent variant text in each group. */
  const plateGroups = ref<Record<string, PlateGroup>>({})
  /** Per-text accumulator for the time-based confirmation window in camera mode. */
  const consecutiveDetections = ref<Record<string, ConsecutiveDetection>>({})
  /** Current operating mode: `'camera'` for live detection, or `null` for upload mode. */
  const currentMode = ref<string | null>(null)

  /**
   * Deduplicated best-representative plate for each group, sorted most-recent group first.
   *
   * For each group: prefers confirmed variants if any exist; within that pool picks the
   * highest-confidence detection. The returned record's `occurrences` field reflects the
   * group's total occurrence count.
   */
  const bestDetections = computed(() => {
    const groupsArray = Object.values(plateGroups.value)

    const sortedGroups = [...groupsArray].sort((a, b) => {
      const aTime = Math.max(...a.variants.map((v) => new Date(v.timestamp).getTime()))
      const bTime = Math.max(...b.variants.map((v) => new Date(v.timestamp).getTime()))
      return bTime - aTime
    })

    return sortedGroups.map((group) => {
      const confirmedVariants = group.variants.filter((v) => v.confirmed)
      const pool = confirmedVariants.length > 0 ? confirmedVariants : group.variants
      const sortedVariants = [...pool].sort((a, b) => b.confidence - a.confidence)
      const best = { ...sortedVariants[0] }
      best.occurrences = group.totalOccurrences
      return best
    })
  })

  function isHighQuality(plateText: PlateTextResult, confidenceMean: number): boolean {
    if (confidenceMean < HIGH_CONFIDENCE_MEAN) return false
    if (plateText.confidence.some((c) => c < HIGH_CONFIDENCE_MIN_CHAR)) return false
    return true
  }

  /**
   * Adds a new plate detection to the store.
   *
   * In camera mode, the detection enters the time-based confirmation window via
   * `processForCameraMode`. In upload mode, it is stored immediately and grouped.
   *
   * @param plate - Partial plate data; `id` and `timestamp` are generated if omitted.
   * @returns `true` when a plate was confirmed (camera should stop in non-continuous mode),
   *   `false` otherwise.
   */
  function addPlate(plate: {
    id?: string
    text: string
    confidence: number
    croppedImage?: ImageBitmap | null
    boundingBox?: { x1: number; y1: number; x2: number; y2: number } | null
    plateText: PlateTextResult
    timestamp?: Date
  }): boolean {
    if (plates.value.find((p) => p.id === plate.id)) return false

    const id = plate.id || `plate_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    const detectionObj: PlateRecord = {
      id,
      text: plate.text,
      confidence: plate.confidence,
      timestamp: plate.timestamp ?? new Date(),
      croppedImage: plate.croppedImage ? markRaw(plate.croppedImage) : null,
      boundingBox: plate.boundingBox ?? null,
      plateText: plate.plateText,
      occurrences: 1,
    }

    if (currentMode.value === 'camera') {
      return processForCameraMode(detectionObj)
    }

    plates.value.unshift(detectionObj)
    groupSimilarDetections(detectionObj)

    return false
  }

  /**
   * Handles camera-mode confirmation logic for a single detection.
   *
   * Each call increments the consecutive-detection counter for the plate text.
   * If the gap since the last detection exceeds `CONSECUTIVE_DETECTION_TIMEOUT`, the
   * window resets. Once the elapsed time since the window opened reaches the configured
   * confirmation threshold (fast-track for high-quality detections), the best detection
   * in the window is committed and `confirmed` is set to `true`.
   *
   * @param detectionObj - The incoming detection record.
   * @returns `true` when a plate was confirmed and the camera should stop (in non-continuous mode).
   */
  function processForCameraMode(detectionObj: PlateRecord): boolean {
    const settingsStore = useSettingsStore()
    const text = detectionObj.text
    const now = Date.now()

    if (!consecutiveDetections.value[text]) {
      consecutiveDetections.value[text] = {
        count: 0,
        firstTimestamp: null,
        lastTimestamp: null,
        detections: [],
      }
    }

    const current = consecutiveDetections.value[text]

    if (current.lastTimestamp && now - current.lastTimestamp > CONSECUTIVE_DETECTION_TIMEOUT) {
      current.count = 0
      current.firstTimestamp = null
      current.detections = []
    }

    current.count++
    current.lastTimestamp = now
    if (!current.firstTimestamp) {
      current.firstTimestamp = now
    }
    current.detections.push(detectionObj)

    const elapsed = current.firstTimestamp ? now - current.firstTimestamp : 0
    const highQuality = isHighQuality(detectionObj.plateText, detectionObj.confidence)
    const minTime = highQuality
      ? settingsStore.fastConfirmationTimeMs
      : settingsStore.confirmationTimeMs

    if (elapsed >= minTime) {
      detectionObj.confirmed = true

      const bestDetection = [...current.detections].sort((a, b) => b.confidence - a.confidence)[0]
      const confirmedPlate: PlateRecord = {
        ...bestDetection,
        confirmed: true,
        occurrences: current.count,
      }

      plates.value.unshift(confirmedPlate)
      groupSimilarDetections(confirmedPlate)

      delete consecutiveDetections.value[text]
      return true
    }

    return false
  }

  /**
   * Assigns `newDetection` to an existing group if a sufficiently similar group key exists
   * (similarity >= `SIMILARITY_THRESHOLD`), otherwise creates a new group.
   *
   * After merging, calls `updateMainVariant` to promote the most-frequent text to the group key.
   *
   * @param newDetection - The detection to group.
   */
  function groupSimilarDetections(newDetection: PlateRecord): void {
    const text = newDetection.text
    let foundGroup = false

    for (const mainText in plateGroups.value) {
      const similarity = calculateTextSimilarity(text, mainText)

      if (similarity >= SIMILARITY_THRESHOLD) {
        const group = plateGroups.value[mainText]
        if (!group.variants) group.variants = []
        group.variants.push(newDetection)
        group.totalOccurrences++

        if (!group.variantTexts) group.variantTexts = []
        const variantIndex = group.variantTexts.findIndex((v) => v.text === text)
        if (variantIndex >= 0) {
          group.variantTexts[variantIndex].occurrences++
        } else {
          group.variantTexts.push({ text, occurrences: 1 })
        }

        updateMainVariant(mainText)
        foundGroup = true
        break
      }
    }

    if (!foundGroup) {
      plateGroups.value[text] = {
        mainText: text,
        totalOccurrences: 1,
        variants: [newDetection],
        variantTexts: [{ text, occurrences: 1 }],
        confidenceMean: newDetection.confidence,
      }
    }
  }

  /**
   * Promotes the most-frequent variant text to be the group's key when it overtakes
   * the current key's occurrence count.
   *
   * When promotion happens: the old key is deleted and replaced with the new key,
   * preserving all variants and variant texts.
   *
   * @param groupKey - The current key of the group to evaluate.
   */
  function updateMainVariant(groupKey: string): void {
    const group = plateGroups.value[groupKey]
    if (!group || !group.variantTexts || group.variantTexts.length === 0) return

    const mainVariant = group.variantTexts.reduce(
      (max, v) => (v.occurrences > max.occurrences ? v : max),
      { text: '', occurrences: 0 },
    )

    if (
      mainVariant.text !== groupKey &&
      mainVariant.occurrences >
        (group.variantTexts.find((v) => v.text === groupKey)?.occurrences || 0)
    ) {
      const oldGroup = { ...plateGroups.value[groupKey] }
      plateGroups.value[mainVariant.text] = {
        mainText: mainVariant.text,
        totalOccurrences: oldGroup.totalOccurrences,
        variants: oldGroup.variants,
        variantTexts: oldGroup.variantTexts,
        confidenceMean: calculateGroupConfidence(oldGroup.variants),
      }
      delete plateGroups.value[groupKey]
    }
  }

  function calculateGroupConfidence(variants: PlateRecord[]): number {
    if (!variants || variants.length === 0) return 0
    const sum = variants.reduce((total, v) => total + v.confidence, 0)
    return sum / variants.length
  }

  /**
   * Edits the display text of a plate record, keeping the `plates` array, group
   * `variantTexts`, and group `variants` all in sync.
   *
   * @param plateId - ID of the plate to update.
   * @param newText - The corrected plate text.
   * @returns `true` if the plate was found and updated, `false` if not found.
   */
  function updatePlateText(plateId: string, newText: string): boolean {
    const plate = plates.value.find((p) => p.id === plateId)
    if (!plate) return false

    const oldText = plate.text
    plate.text = newText
    plate.plateText = { ...plate.plateText, text: newText }

    const oldGroupKey = oldText
    const group = plateGroups.value[oldGroupKey]
    if (group) {
      const variantIndex = group.variantTexts.findIndex((v) => v.text === oldText)
      if (variantIndex >= 0) {
        group.variantTexts[variantIndex].text = newText
      }
      const variantPlateIndex = group.variants.findIndex((v) => v.id === plateId)
      if (variantPlateIndex >= 0) {
        group.variants[variantPlateIndex] = {
          ...group.variants[variantPlateIndex],
          text: newText,
          plateText: { ...group.variants[variantPlateIndex].plateText, text: newText },
        }
      }
      group.confidenceMean = calculateGroupConfidence(group.variants)
      updateMainVariant(oldGroupKey)
    }

    const newGroupKey = Object.keys(plateGroups.value).find((key) => {
      const existingGroup = plateGroups.value[key]
      return existingGroup.variants.some((v) => v.id === plateId)
    })
    if (newGroupKey) {
      const newGroup = plateGroups.value[newGroupKey]
      newGroup.confidenceMean = calculateGroupConfidence(newGroup.variants)
    }

    return true
  }

  function removePlate(plateId: string): void {
    plates.value = plates.value.filter((p) => p.id !== plateId)
  }

  function clearPlates(): void {
    plates.value = []
    plateGroups.value = {}
    consecutiveDetections.value = {}
  }

  function clearConsecutiveDetections(): void {
    consecutiveDetections.value = {}
  }

  function setMode(mode: string | null): void {
    currentMode.value = mode
  }

  return {
    plates,
    plateGroups,
    consecutiveDetections,
    currentMode,
    bestDetections,
    addPlate,
    updatePlateText,
    removePlate,
    clearPlates,
    clearConsecutiveDetections,
    setMode,
  }
})
