import { createPinia, setActivePinia } from 'pinia'
import { config } from '@vue/test-utils'
import { i18n } from '@/i18n'

// Use Spanish locale in tests so existing text assertions stay valid
i18n.global.locale.value = 'es'

config.global.plugins = [i18n]

beforeEach(() => {
  setActivePinia(createPinia())
})

// jsdom does not implement HTMLMediaElement methods — silence the warnings
window.HTMLMediaElement.prototype.load = vi.fn()
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
window.HTMLMediaElement.prototype.pause = vi.fn()

globalThis.createImageBitmap = vi.fn().mockResolvedValue({
  width: 100,
  height: 100,
  close: vi.fn(),
})

globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test')
globalThis.URL.revokeObjectURL = vi.fn()
