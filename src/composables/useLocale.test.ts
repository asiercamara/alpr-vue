import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '@/stores/settingsStore'

const mockLocale = ref('en')

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { useLocale } from '@/composables/useLocale'

describe('useLocale', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockLocale.value = 'en'
  })

  it('sets locale to en immediately when language is auto and navigator is english', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    useLocale()
    expect(mockLocale.value).toBe('en')
  })

  it('sets locale to es immediately when language is auto and navigator is spanish', () => {
    vi.stubGlobal('navigator', { language: 'es-ES' })
    useLocale()
    expect(mockLocale.value).toBe('es')
  })

  it('sets locale to en when language is explicitly en regardless of navigator', () => {
    vi.stubGlobal('navigator', { language: 'es-ES' })
    const settingsStore = useSettingsStore()
    settingsStore.setLanguage('en')
    useLocale()
    expect(mockLocale.value).toBe('en')
  })

  it('sets locale to es when language is explicitly es regardless of navigator', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    const settingsStore = useSettingsStore()
    settingsStore.setLanguage('es')
    useLocale()
    expect(mockLocale.value).toBe('es')
  })

  it('updates locale reactively when settingsStore.language changes to es', async () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    const settingsStore = useSettingsStore()
    settingsStore.setLanguage('auto')
    useLocale()
    expect(mockLocale.value).toBe('en')

    settingsStore.setLanguage('es')
    await nextTick()
    expect(mockLocale.value).toBe('es')
  })

  it('updates locale reactively when settingsStore.language changes back to auto', async () => {
    vi.stubGlobal('navigator', { language: 'es-MX' })
    const settingsStore = useSettingsStore()
    settingsStore.setLanguage('en')
    useLocale()
    expect(mockLocale.value).toBe('en')

    settingsStore.setLanguage('auto')
    await nextTick()
    expect(mockLocale.value).toBe('es')
  })

  it('detects es-AR as spanish in auto mode', () => {
    vi.stubGlobal('navigator', { language: 'es-AR' })
    useLocale()
    expect(mockLocale.value).toBe('es')
  })
})
