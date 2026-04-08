import { createPinia, setActivePinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
})

globalThis.createImageBitmap = vi.fn().mockResolvedValue({
  width: 100,
  height: 100,
  close: vi.fn(),
})

globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test')
globalThis.URL.revokeObjectURL = vi.fn()