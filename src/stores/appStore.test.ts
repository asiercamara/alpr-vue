import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/stores/appStore'

describe('appStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('has correct initial state', () => {
    const store = useAppStore()
    expect(store.cameraError).toBeNull()
    expect(store.modelError).toBeNull()
    expect(store.isModelLoading).toBe(true)
  })

  it('setCameraError sets the message', () => {
    const store = useAppStore()
    store.setCameraError('Permiso denegado')
    expect(store.cameraError).toBe('Permiso denegado')
  })

  it('setCameraError(null) clears the error', () => {
    const store = useAppStore()
    store.setCameraError('error')
    store.setCameraError(null)
    expect(store.cameraError).toBeNull()
  })

  it('setModelError sets the message', () => {
    const store = useAppStore()
    store.setModelError('Model failed')
    expect(store.modelError).toBe('Model failed')
  })

  it('setModelReady sets isModelLoading false and clears modelError', () => {
    const store = useAppStore()
    store.setModelError('some error')
    store.setModelReady()
    expect(store.isModelLoading).toBe(false)
    expect(store.modelError).toBeNull()
  })

  it('feedbackEnabled defaults to true when localStorage is empty', () => {
    const store = useAppStore()
    expect(store.feedbackEnabled).toBe(true)
  })

  it('feedbackEnabled is false when localStorage has "false"', () => {
    localStorage.setItem('alpr-feedback-enabled', 'false')
    const store = useAppStore()
    expect(store.feedbackEnabled).toBe(false)
  })

  it('toggleFeedback flips feedbackEnabled and persists to localStorage', () => {
    const store = useAppStore()
    expect(store.feedbackEnabled).toBe(true)

    store.toggleFeedback()
    expect(store.feedbackEnabled).toBe(false)
    expect(localStorage.getItem('alpr-feedback-enabled')).toBe('false')

    store.toggleFeedback()
    expect(store.feedbackEnabled).toBe(true)
    expect(localStorage.getItem('alpr-feedback-enabled')).toBe('true')
  })
})
