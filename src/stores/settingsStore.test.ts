import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore, DEFAULTS } from '@/stores/settingsStore'

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('has correct default values', () => {
    const store = useSettingsStore()
    expect(store.feedbackEnabled).toBe(true)
    expect(store.confidenceThreshold).toBe(0.7)
    expect(store.confirmationTime).toBe(3)
    expect(store.fastConfirmationTime).toBe(1)
    expect(store.continuousMode).toBe(true)
    expect(store.skipDuplicates).toBe(true)
    expect(store.theme).toBe('system')
  })

  it('loads settings from localStorage', () => {
    localStorage.setItem(
      'alpr-settings',
      JSON.stringify({
        feedbackEnabled: false,
        confidenceThreshold: 0.85,
        confirmationTime: 5,
        continuousMode: false,
      }),
    )
    const store = useSettingsStore()
    expect(store.feedbackEnabled).toBe(false)
    expect(store.confidenceThreshold).toBe(0.85)
    expect(store.confirmationTime).toBe(5)
    expect(store.fastConfirmationTime).toBe(1)
    expect(store.continuousMode).toBe(false)
  })

  it('migrates legacy feedback key and removes it', () => {
    localStorage.setItem('alpr-feedback-enabled', 'false')
    const store = useSettingsStore()
    expect(store.feedbackEnabled).toBe(false)
    expect(localStorage.getItem('alpr-feedback-enabled')).toBeNull()
  })

  it('toggleFeedback flips and persists', () => {
    const store = useSettingsStore()
    expect(store.feedbackEnabled).toBe(true)
    store.toggleFeedback()
    expect(store.feedbackEnabled).toBe(false)
    const stored = JSON.parse(localStorage.getItem('alpr-settings')!)
    expect(stored.feedbackEnabled).toBe(false)
  })

  it('setConfidenceThreshold persists', () => {
    const store = useSettingsStore()
    store.setConfidenceThreshold(0.9)
    expect(store.confidenceThreshold).toBe(0.9)
    const stored = JSON.parse(localStorage.getItem('alpr-settings')!)
    expect(stored.confidenceThreshold).toBe(0.9)
  })

  it('setConfirmationTime persists', () => {
    const store = useSettingsStore()
    store.setConfirmationTime(7)
    expect(store.confirmationTime).toBe(7)
    const stored = JSON.parse(localStorage.getItem('alpr-settings')!)
    expect(stored.confirmationTime).toBe(7)
  })

  it('setFastConfirmationTime persists', () => {
    const store = useSettingsStore()
    store.setFastConfirmationTime(2)
    expect(store.fastConfirmationTime).toBe(2)
  })

  it('setContinuousMode persists', () => {
    const store = useSettingsStore()
    store.setContinuousMode(false)
    expect(store.continuousMode).toBe(false)
  })

  it('setSkipDuplicates persists', () => {
    const store = useSettingsStore()
    store.setSkipDuplicates(false)
    expect(store.skipDuplicates).toBe(false)
  })

  it('setTheme persists', () => {
    const store = useSettingsStore()
    store.setTheme('dark')
    expect(store.theme).toBe('dark')
    const stored = JSON.parse(localStorage.getItem('alpr-settings')!)
    expect(stored.theme).toBe('dark')
  })

  it('confirmationTimeMs computed returns milliseconds', () => {
    const store = useSettingsStore()
    store.setConfirmationTime(3)
    expect(store.confirmationTimeMs).toBe(3000)
  })

  it('fastConfirmationTimeMs computed returns milliseconds', () => {
    const store = useSettingsStore()
    store.setFastConfirmationTime(1)
    expect(store.fastConfirmationTimeMs).toBe(1000)
  })

  it('resetFeedbackEnabled restores default', () => {
    const store = useSettingsStore()
    store.setFeedbackEnabled(false)
    store.resetFeedbackEnabled()
    expect(store.feedbackEnabled).toBe(DEFAULTS.feedbackEnabled)
  })

  it('resetConfidenceThreshold restores default', () => {
    const store = useSettingsStore()
    store.setConfidenceThreshold(0.5)
    store.resetConfidenceThreshold()
    expect(store.confidenceThreshold).toBe(DEFAULTS.confidenceThreshold)
  })

  it('resetConfirmationTime restores default', () => {
    const store = useSettingsStore()
    store.setConfirmationTime(10)
    store.resetConfirmationTime()
    expect(store.confirmationTime).toBe(DEFAULTS.confirmationTime)
  })

  it('resetFastConfirmationTime restores default', () => {
    const store = useSettingsStore()
    store.setFastConfirmationTime(5)
    store.resetFastConfirmationTime()
    expect(store.fastConfirmationTime).toBe(DEFAULTS.fastConfirmationTime)
  })

  it('resetContinuousMode restores default', () => {
    const store = useSettingsStore()
    store.setContinuousMode(false)
    store.resetContinuousMode()
    expect(store.continuousMode).toBe(DEFAULTS.continuousMode)
  })

  it('resetSkipDuplicates restores default', () => {
    const store = useSettingsStore()
    store.setSkipDuplicates(false)
    store.resetSkipDuplicates()
    expect(store.skipDuplicates).toBe(DEFAULTS.skipDuplicates)
  })

  it('resetTheme restores default', () => {
    const store = useSettingsStore()
    store.setTheme('dark')
    store.resetTheme()
    expect(store.theme).toBe(DEFAULTS.theme)
  })

  it('resetAll restores all defaults', () => {
    const store = useSettingsStore()
    store.setFeedbackEnabled(false)
    store.setConfidenceThreshold(0.5)
    store.setConfirmationTime(10)
    store.setFastConfirmationTime(5)
    store.setContinuousMode(false)
    store.setSkipDuplicates(false)
    store.setTheme('dark')

    store.resetAll()

    expect(store.feedbackEnabled).toBe(DEFAULTS.feedbackEnabled)
    expect(store.confidenceThreshold).toBe(DEFAULTS.confidenceThreshold)
    expect(store.confirmationTime).toBe(DEFAULTS.confirmationTime)
    expect(store.fastConfirmationTime).toBe(DEFAULTS.fastConfirmationTime)
    expect(store.continuousMode).toBe(DEFAULTS.continuousMode)
    expect(store.skipDuplicates).toBe(DEFAULTS.skipDuplicates)
    expect(store.theme).toBe(DEFAULTS.theme)
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('alpr-settings', '{invalid json')
    const store = useSettingsStore()
    expect(store.feedbackEnabled).toBe(true)
    expect(store.confidenceThreshold).toBe(0.7)
  })

  it('partial localStorage settings merge with defaults', () => {
    localStorage.setItem('alpr-settings', JSON.stringify({ continuousMode: false }))
    const store = useSettingsStore()
    expect(store.continuousMode).toBe(false)
    expect(store.feedbackEnabled).toBe(true)
    expect(store.confidenceThreshold).toBe(0.7)
  })
})
