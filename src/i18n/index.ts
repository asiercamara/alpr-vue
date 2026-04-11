/**
 * Vue I18n instance with automatic locale detection.
 *
 * Locale resolution order:
 * 1. Persisted `language` setting from `alpr-settings` localStorage key (if not `'auto'`).
 * 2. Browser `navigator.language` — uses `'es'` when it starts with `es`, `'en'` otherwise.
 */
import { createI18n } from 'vue-i18n'
import en from './locales/en'
import es from './locales/es'

/** Shape of every locale message file. */
export type MessageSchema = typeof en

const STORAGE_KEY = 'alpr-settings'

/**
 * Reads the locale preference from localStorage before Pinia is available.
 *
 * Returns `'es'` or `'en'` based on the stored `language` setting or the browser locale.
 */
function getInitialLocale(): 'en' | 'es' {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: Record<string, unknown> = JSON.parse(stored)
      if (parsed.language === 'es' || parsed.language === 'en') {
        return parsed.language
      }
    }
  } catch {
    /* localStorage unavailable */
  }
  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('es')) return 'es'
  return 'en'
}

export const i18n = createI18n<[MessageSchema], 'en' | 'es'>({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages: { en, es },
})
