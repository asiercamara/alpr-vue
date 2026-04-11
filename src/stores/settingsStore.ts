/**
 * User-configurable settings with automatic localStorage persistence.
 * All mutations call `persist()` internally.
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'alpr-settings'
const LEGACY_FEEDBACK_KEY = 'alpr-feedback-enabled'

/**
 * Theme preference.
 * - `'light'` — always use light mode.
 * - `'dark'` — always use dark mode.
 * - `'system'` — follows the OS `prefers-color-scheme` media query.
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/** Shape of the settings object stored in localStorage and used by the store. */
interface SettingsConfig {
  /** Whether audio/haptic feedback fires on plate confirmation. */
  feedbackEnabled: boolean
  /** Minimum mean OCR confidence (0–1) for a detection to be stored. */
  confidenceThreshold: number
  /** Seconds of continuous detection required to confirm a plate in normal mode. */
  confirmationTime: number
  /** Seconds of continuous detection required in fast-confirmation (high-confidence) mode. */
  fastConfirmationTime: number
  /** When `true`, the camera continues scanning after each confirmed plate. */
  continuousMode: boolean
  /** When `true`, plates whose text is already in history are silently skipped. */
  skipDuplicates: boolean
  /** Active theme mode; drives the `dark` class on `<html>` via `useTheme`. */
  theme: ThemeMode
}

/** Default values applied on first run or after `resetAll()`. */
export const DEFAULTS: SettingsConfig = {
  feedbackEnabled: true,
  confidenceThreshold: 0.7,
  confirmationTime: 3,
  fastConfirmationTime: 1,
  continuousMode: true,
  skipDuplicates: true,
  theme: 'system',
}

/**
 * Reads persisted settings from localStorage, merging over `DEFAULTS`.
 *
 * Migrates the legacy `'alpr-feedback-enabled'` key on first call and removes it.
 * Falls back silently to defaults on parse failure or when localStorage is unavailable.
 */
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

/**
 * Serializes `settings` to localStorage under `STORAGE_KEY`.
 *
 * Silently no-ops when localStorage is unavailable (e.g., private browsing with strict settings).
 */
function saveSettings(settings: SettingsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // localStorage not available
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const loaded = loadSettings()

  /** Whether audio/haptic feedback fires on plate confirmation. */
  const feedbackEnabled = ref(loaded.feedbackEnabled)
  /** Minimum mean OCR confidence (0–1) required to store a detection. */
  const confidenceThreshold = ref(loaded.confidenceThreshold)
  /** Confirmation window duration in seconds (normal mode). */
  const confirmationTime = ref(loaded.confirmationTime)
  /** Confirmation window duration in seconds (fast/high-confidence mode). */
  const fastConfirmationTime = ref(loaded.fastConfirmationTime)
  /** `true` when the camera keeps scanning after each confirmed plate. */
  const continuousMode = ref(loaded.continuousMode)
  /** `true` when already-seen plate texts are silently skipped. */
  const skipDuplicates = ref(loaded.skipDuplicates)
  /** Active theme preference; `useTheme` reacts to this value. */
  const theme = ref<ThemeMode>(loaded.theme)

  /** Millisecond equivalent of `confirmationTime`. Use in `setTimeout` and timing logic. */
  const confirmationTimeMs = computed(() => confirmationTime.value * 1000)
  /** Millisecond equivalent of `fastConfirmationTime`. Use in `setTimeout` and timing logic. */
  const fastConfirmationTimeMs = computed(() => fastConfirmationTime.value * 1000)

  /**
   * Serializes all current settings to localStorage.
   *
   * Called automatically by every setter — do not call manually from outside the store.
   */
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

  /**
   * Resets all 7 settings to `DEFAULTS` with a single `persist()` call.
   */
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
