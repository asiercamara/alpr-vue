/**
 * Keeps the vue-i18n locale in sync with `settingsStore.language`.
 *
 * Call once in the root component (`App.vue`), mirroring the pattern of `useTheme`.
 * When the user selects `'auto'`, the locale is resolved from `navigator.language`.
 */
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Detects the preferred locale from the browser's `navigator.language`.
 *
 * Returns `'es'` for any Spanish variant, `'en'` otherwise.
 */
function detectLocale(): 'en' | 'es' {
  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('es')) return 'es'
  return 'en'
}

export function useLocale(): void {
  const settingsStore = useSettingsStore()
  const { locale } = useI18n()

  watch(
    () => settingsStore.language,
    (lang) => {
      locale.value = lang === 'auto' ? detectLocale() : lang
    },
    { immediate: true },
  )
}
