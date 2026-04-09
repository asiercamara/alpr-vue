import { ref, computed, markRaw } from 'vue'
import { defineStore } from 'pinia'
import { calculateTextSimilarity } from '@/utils/validation'
import type { PlateRecord, PlateTextResult } from '@/types/detection'

interface VariantText {
  text: string
  occurrences: number
}

interface PlateGroup {
  mainText: string
  totalOccurrences: number
  variants: PlateRecord[]
  variantTexts: VariantText[]
  confidenceMean: number
}

interface ConsecutiveDetection {
  count: number
  firstTimestamp: number | null
  lastTimestamp: number | null
  detections: PlateRecord[]
}

const SIMILARITY_THRESHOLD = 0.8
const CONSECUTIVE_DETECTION_TIMEOUT = 5000
const MIN_CONFIRMATION_TIME = 3000
const MIN_FAST_CONFIRMATION_TIME = 1000
const HIGH_CONFIDENCE_MEAN = 0.8
const HIGH_CONFIDENCE_MIN_CHAR = 0.5

export const usePlateStore = defineStore('plateStore', () => {
  const plates = ref<PlateRecord[]>([])
  const plateGroups = ref<Record<string, PlateGroup>>({})
  const consecutiveDetections = ref<Record<string, ConsecutiveDetection>>({})
  const currentMode = ref<string | null>(null)

  const bestDetections = computed(() => {
    const groupsArray = Object.values(plateGroups.value)

    const sortedGroups = [...groupsArray].sort((a, b) => {
      if (b.totalOccurrences !== a.totalOccurrences) {
        return b.totalOccurrences - a.totalOccurrences
      }
      return b.confidenceMean - a.confidenceMean
    })

    return sortedGroups.map(group => {
      const confirmedVariants = group.variants.filter(v => v.confirmed)
      const pool = confirmedVariants.length > 0 ? confirmedVariants : group.variants
      const sortedVariants = [...pool].sort((a, b) => b.confidence - a.confidence)
      const best = { ...sortedVariants[0] }
      best.occurrences = group.totalOccurrences
      return best
    })
  })

  function isHighQuality(plateText: PlateTextResult, confidenceMean: number): boolean {
    if (confidenceMean < HIGH_CONFIDENCE_MEAN) return false
    if (plateText.confidence.some(c => c < HIGH_CONFIDENCE_MIN_CHAR)) return false
    return true
  }

  function addPlate(plate: {
    id?: string
    text: string
    confidence: number
    croppedImage?: ImageBitmap | null
    boundingBox?: { x1: number; y1: number; x2: number; y2: number } | null
    plateText: PlateTextResult
    timestamp?: Date
  }): boolean {
    if (plates.value.find(p => p.id === plate.id)) return false

    const id = plate.id || `plate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

  function processForCameraMode(detectionObj: PlateRecord): boolean {
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

    if (current.lastTimestamp && (now - current.lastTimestamp) > CONSECUTIVE_DETECTION_TIMEOUT) {
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
    const minTime = highQuality ? MIN_FAST_CONFIRMATION_TIME : MIN_CONFIRMATION_TIME

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
        const variantIndex = group.variantTexts.findIndex(v => v.text === text)
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

  function updateMainVariant(groupKey: string): void {
    const group = plateGroups.value[groupKey]
    if (!group || !group.variantTexts || group.variantTexts.length === 0) return

    const mainVariant = group.variantTexts.reduce(
      (max, v) => v.occurrences > max.occurrences ? v : max,
      { text: '', occurrences: 0 },
    )

    if (mainVariant.text !== groupKey && mainVariant.occurrences >
        (group.variantTexts.find(v => v.text === groupKey)?.occurrences || 0)) {
      const oldGroup = { ...plateGroups.value[groupKey] }
      delete plateGroups.value[groupKey]

      plateGroups.value[mainVariant.text] = {
        mainText: mainVariant.text,
        totalOccurrences: oldGroup.totalOccurrences,
        variants: oldGroup.variants,
        variantTexts: oldGroup.variantTexts,
        confidenceMean: calculateGroupConfidence(oldGroup.variants),
      }
    }
  }

  function calculateGroupConfidence(variants: PlateRecord[]): number {
    if (!variants || variants.length === 0) return 0
    const sum = variants.reduce((total, v) => total + v.confidence, 0)
    return sum / variants.length
  }

  function removePlate(plateId: string): void {
    plates.value = plates.value.filter(p => p.id !== plateId)
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
    removePlate,
    clearPlates,
    clearConsecutiveDetections,
    setMode,
    MIN_CONFIRMATION_TIME,
    MIN_FAST_CONFIRMATION_TIME,
  }
})