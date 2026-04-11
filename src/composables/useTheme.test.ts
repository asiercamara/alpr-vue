import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTheme } from '@/composables/useTheme'

function mountWithTheme() {
  const Wrapper = defineComponent({
    setup() {
      const { isDark } = useTheme()
      return { isDark }
    },
    render() {
      return h('div', { 'data-is-dark': this.isDark })
    },
  })
  return mount(Wrapper, { global: { plugins: [createPinia()] } })
}

describe('useTheme', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
    vi.restoreAllMocks()
  })

  it('applies dark class when theme is dark', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('dark')

    mountWithTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class when theme is light', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('light')

    mountWithTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('applies dark class when system prefers dark', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('system')

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )

    mountWithTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    vi.restoreAllMocks()
  })

  it('does not apply dark when system prefers light', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('system')

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )

    mountWithTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(false)

    vi.restoreAllMocks()
  })

  it('reacts to theme change from light to dark', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('light')

    const Wrapper = defineComponent({
      setup() {
        const { isDark } = useTheme()
        return { isDark }
      },
      render() {
        return h('div', { 'data-is-dark': this.isDark })
      },
    })
    mount(Wrapper, { global: { plugins: [pinia] } })
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    settingsStore.setTheme('dark')
    await nextTick()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('returns isDark as true when dark mode is active', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('dark')

    const wrapper = mountWithTheme()

    expect(wrapper.vm.isDark).toBe(true)
  })

  it('returns isDark as false when light mode is active', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('light')

    const wrapper = mountWithTheme()

    expect(wrapper.vm.isDark).toBe(false)
  })

  it('registers media query listener for system theme', () => {
    const addEventListener = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener,
        removeEventListener: vi.fn(),
      }),
    )

    const settingsStore = useSettingsStore()
    settingsStore.setTheme('system')

    mountWithTheme()

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    vi.restoreAllMocks()
  })

  it('applies dark when system media query fires dark change', async () => {
    const matchMediaHandler = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(matchMediaHandler))

    const pinia = createPinia()
    setActivePinia(pinia)
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('system')

    const Wrapper = defineComponent({
      setup() {
        const { isDark } = useTheme()
        return { isDark }
      },
      render() {
        return h('div', { 'data-is-dark': this.isDark })
      },
    })
    const wrapper = mount(Wrapper, { global: { plugins: [pinia] } })

    expect(matchMediaHandler.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    const changeHandler = matchMediaHandler.addEventListener.mock.calls[0][1]

    matchMediaHandler.matches = true
    changeHandler({ matches: true } as MediaQueryListEvent)
    await nextTick()

    expect(wrapper.vm.isDark).toBe(true)

    vi.restoreAllMocks()
  })

  it('does not apply dark when system media fires dark but theme is not system', () => {
    const matchMediaHandler = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(matchMediaHandler))

    const settingsStore = useSettingsStore()
    settingsStore.setTheme('light')

    mountWithTheme()

    if (matchMediaHandler.addEventListener.mock.calls.length > 0) {
      const changeHandler = matchMediaHandler.addEventListener.mock.calls[0][1]
      changeHandler({ matches: true })
    }

    expect(document.documentElement.classList.contains('dark')).toBe(false)

    vi.restoreAllMocks()
  })

  it('handles missing matchMedia gracefully', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('system')

    vi.stubGlobal('matchMedia', undefined)

    mountWithTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(false)

    vi.restoreAllMocks()
  })

  it('removes media query listener on unmount', () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener,
        removeEventListener,
      }),
    )

    const settingsStore = useSettingsStore()
    settingsStore.setTheme('system')

    const wrapper = mountWithTheme()

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    wrapper.unmount()

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    vi.restoreAllMocks()
  })
})
