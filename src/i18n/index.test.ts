import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Tests for getInitialLocale() — the function runs at module-load time,
 * so each test must reset the module registry and re-import.
 */
describe('i18n getInitialLocale', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('returns en by default when navigator language is english', async () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    const { i18n } = await import('@/i18n')
    expect(i18n.global.locale.value).toBe('en')
  })

  it('returns es when navigator language starts with es', async () => {
    vi.stubGlobal('navigator', { language: 'es-ES' })
    const { i18n } = await import('@/i18n')
    expect(i18n.global.locale.value).toBe('es')
  })

  it('returns es for any es-* navigator language variant', async () => {
    vi.stubGlobal('navigator', { language: 'es-MX' })
    const { i18n } = await import('@/i18n')
    expect(i18n.global.locale.value).toBe('es')
  })

  it('returns stored language es from localStorage (overrides navigator)', async () => {
    localStorage.setItem('alpr-settings', JSON.stringify({ language: 'es' }))
    vi.stubGlobal('navigator', { language: 'en-US' })
    const { i18n } = await import('@/i18n')
    expect(i18n.global.locale.value).toBe('es')
  })

  it('returns stored language en from localStorage (overrides navigator)', async () => {
    localStorage.setItem('alpr-settings', JSON.stringify({ language: 'en' }))
    vi.stubGlobal('navigator', { language: 'es-ES' })
    const { i18n } = await import('@/i18n')
    expect(i18n.global.locale.value).toBe('en')
  })

  it('falls back to navigator when stored language is auto', async () => {
    localStorage.setItem('alpr-settings', JSON.stringify({ language: 'auto' }))
    vi.stubGlobal('navigator', { language: 'es-AR' })
    const { i18n } = await import('@/i18n')
    expect(i18n.global.locale.value).toBe('es')
  })

  it('falls back to navigator when localStorage has no language key', async () => {
    localStorage.setItem('alpr-settings', JSON.stringify({ theme: 'dark' }))
    vi.stubGlobal('navigator', { language: 'es-CO' })
    const { i18n } = await import('@/i18n')
    expect(i18n.global.locale.value).toBe('es')
  })

  it('handles corrupted localStorage gracefully and falls back to navigator', async () => {
    localStorage.setItem('alpr-settings', 'not valid json{')
    vi.stubGlobal('navigator', { language: 'en-GB' })
    const { i18n } = await import('@/i18n')
    expect(i18n.global.locale.value).toBe('en')
  })

  it('exports MessageSchema type via en locale shape', async () => {
    const mod = await import('@/i18n')
    // Verify the instance has both locales registered
    expect(mod.i18n.global.availableLocales).toContain('en')
    expect(mod.i18n.global.availableLocales).toContain('es')
  })
})
