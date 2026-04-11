import { describe, it, expect, beforeEach, vi } from 'vitest'
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
    expect(store.isUploadMode).toBe(false)
    expect(store.uploadMediaType).toBeNull()
    expect(store.uploadMediaUrl).toBeNull()
    expect(store.uploadFile).toBeNull()
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

  describe('upload media state', () => {
    it('setUploadMedia sets type, url and file', () => {
      const store = useAppStore()
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      const url = 'blob:http://localhost/test'

      store.setUploadMedia('image', url, file)

      expect(store.uploadMediaType).toBe('image')
      expect(store.uploadMediaUrl).toBe(url)
      expect(store.uploadFile).toBe(file)
      expect(store.isUploadMode).toBe(true)
    })

    it('clearUploadMedia revokes URL and resets state', () => {
      const store = useAppStore()
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      const url = 'blob:http://localhost/test'

      store.setUploadMedia('video', url, file)
      store.clearUploadMedia()

      expect(store.uploadMediaType).toBeNull()
      expect(store.uploadMediaUrl).toBeNull()
      expect(store.uploadFile).toBeNull()
      expect(store.isUploadMode).toBe(false)
      expect(revokeSpy).toHaveBeenCalledWith(url)
      revokeSpy.mockRestore()
    })

    it('clearUploadMedia does nothing when no URL is set', () => {
      const store = useAppStore()
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')

      store.clearUploadMedia()

      expect(revokeSpy).not.toHaveBeenCalled()
      revokeSpy.mockRestore()
    })

    it('isUploadMode is false when only type is set without url', () => {
      const store = useAppStore()
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      store.uploadMediaType = 'image'
      store.uploadMediaUrl = null
      store.uploadFile = file

      expect(store.isUploadMode).toBe(false)
    })

    it('isUploadMode is false when only url is set without type', () => {
      const store = useAppStore()
      store.uploadMediaType = null
      store.uploadMediaUrl = 'blob:test'
      store.uploadFile = null

      expect(store.isUploadMode).toBe(false)
    })
  })
})
