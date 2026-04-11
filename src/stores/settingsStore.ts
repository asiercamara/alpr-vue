import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'alpr-settings'
const LEGACY_FEEDBACK_KEY = 'alpr-feedback-enabled'

export type ThemeMode = 'light' | 'dark' | 'system'

interface SettingsConfig {
  feedbackEnabled: boolean
  confidenceThreshold: number
  confirmationTime: number
  fastConfirmationTime: number
  continuousMode: boolean
  skipDuplicates: boolean
  theme: ThemeMode
}

export const DEFAULTS: SettingsConfig = {
  feedbackEnabled: true,
  confidenceThreshold: 0.7,
  confirmationTime: 3,
  fastConfirmationTime: 1,
  continuousMode: true,
  skipDuplicates: true,
  theme: 'system',
}

function loadSettings(): SettingsConfig {
  const defaults = { ...DEFAULTS }

  try {
    const legacyFeedback = localStorage.getItem(LEGACY_FEEDBACK_KEY)
    if (legacyFeedback !== null) {
      defaults.feedbackEnabled = legacyFeedback !== 'false'
      localStorage.removeItem(LEGACY_FEEDBACK_KEY)
    }
  } catch {
    // localStorage not available
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaults
    const parsed = JSON.parse(stored)
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

function saveSettings(settings: SettingsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // localStorage not available
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const loaded = loadSettings()

  const feedbackEnabled = ref(loaded.feedbackEnabled)
  const confidenceThreshold = ref(loaded.confidenceThreshold)
  const confirmationTime = ref(loaded.confirmationTime)
  const fastConfirmationTime = ref(loaded.fastConfirmationTime)
  const continuousMode = ref(loaded.continuousMode)
  const skipDuplicates = ref(loaded.skipDuplicates)
  const theme = ref<ThemeMode>(loaded.theme)

  const confirmationTimeMs = computed(() => confirmationTime.value * 1000)
  const fastConfirmationTimeMs = computed(() => fastConfirmationTime.value * 1000)

  function persist(): void {
    saveSettings({
      feedbackEnabled: feedbackEnabled.value,
      confidenceThreshold: confidenceThreshold.value,
      confirmationTime: confirmationTime.value,
      fastConfirmationTime: fastConfirmationTime.value,
      continuousMode: continuousMode.value,
      skipDuplicates: skipDuplicates.value,
      theme: theme.value,
    })
  }

  function toggleFeedback(): void {
    feedbackEnabled.value = !feedbackEnabled.value
    persist()
  }

  function setFeedbackEnabled(value: boolean): void {
    feedbackEnabled.value = value
    persist()
  }

  function setConfidenceThreshold(value: number): void {
    confidenceThreshold.value = value
    persist()
  }

  function setConfirmationTime(value: number): void {
    confirmationTime.value = value
    persist()
  }

  function setFastConfirmationTime(value: number): void {
    fastConfirmationTime.value = value
    persist()
  }

  function setContinuousMode(value: boolean): void {
    continuousMode.value = value
    persist()
  }

  function setSkipDuplicates(value: boolean): void {
    skipDuplicates.value = value
    persist()
  }

  function setTheme(value: ThemeMode): void {
    theme.value = value
    persist()
  }

  function resetFeedbackEnabled(): void {
    feedbackEnabled.value = DEFAULTS.feedbackEnabled
    persist()
  }

  function resetConfidenceThreshold(): void {
    confidenceThreshold.value = DEFAULTS.confidenceThreshold
    persist()
  }

  function resetConfirmationTime(): void {
    confirmationTime.value = DEFAULTS.confirmationTime
    persist()
  }

  function resetFastConfirmationTime(): void {
    fastConfirmationTime.value = DEFAULTS.fastConfirmationTime
    persist()
  }

  function resetContinuousMode(): void {
    continuousMode.value = DEFAULTS.continuousMode
    persist()
  }

  function resetSkipDuplicates(): void {
    skipDuplicates.value = DEFAULTS.skipDuplicates
    persist()
  }

  function resetTheme(): void {
    theme.value = DEFAULTS.theme
    persist()
  }

  function resetAll(): void {
    feedbackEnabled.value = DEFAULTS.feedbackEnabled
    confidenceThreshold.value = DEFAULTS.confidenceThreshold
    confirmationTime.value = DEFAULTS.confirmationTime
    fastConfirmationTime.value = DEFAULTS.fastConfirmationTime
    continuousMode.value = DEFAULTS.continuousMode
    skipDuplicates.value = DEFAULTS.skipDuplicates
    theme.value = DEFAULTS.theme
    persist()
  }

  return {
    feedbackEnabled,
    confidenceThreshold,
    confirmationTime,
    fastConfirmationTime,
    continuousMode,
    skipDuplicates,
    theme,
    confirmationTimeMs,
    fastConfirmationTimeMs,
    defaults: DEFAULTS,
    toggleFeedback,
    setFeedbackEnabled,
    setConfidenceThreshold,
    setConfirmationTime,
    setFastConfirmationTime,
    setContinuousMode,
    setSkipDuplicates,
    setTheme,
    resetFeedbackEnabled,
    resetConfidenceThreshold,
    resetConfirmationTime,
    resetFastConfirmationTime,
    resetContinuousMode,
    resetSkipDuplicates,
    resetTheme,
    resetAll,
  }
})
