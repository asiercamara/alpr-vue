import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useSettingsStore, type ThemeMode } from '@/stores/settingsStore'

export function useTheme() {
  const settingsStore = useSettingsStore()
  const isDark = ref(false)

  let mediaQuery: MediaQueryList | null = null
  let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null

  function applyDark(dark: boolean): void {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    isDark.value = dark
  }

  function resolveTheme(theme: ThemeMode): boolean {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }

  function syncTheme(): void {
    applyDark(resolveTheme(settingsStore.theme))
  }

  watch(() => settingsStore.theme, syncTheme)

  onMounted(() => {
    syncTheme()
    if (typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaHandler = () => {
        if (settingsStore.theme === 'system') {
          applyDark(mediaQuery!.matches)
        }
      }
      mediaQuery.addEventListener('change', mediaHandler)
    }
  })

  onUnmounted(() => {
    if (mediaQuery && mediaHandler) {
      mediaQuery.removeEventListener('change', mediaHandler)
    }
  })

  return { isDark }
}
