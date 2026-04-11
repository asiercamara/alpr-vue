import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SettingsSheet from '@/components/ui/SettingsSheet.vue'
import { useSettingsStore } from '@/stores/settingsStore'

describe('SettingsSheet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function mountSheet(props = { modelValue: true }) {
    return mount(SettingsSheet, {
      props,
      attachTo: document.body,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })
  }

  it('renders settings title when open', () => {
    const wrapper = mountSheet()
    expect(wrapper.text()).toContain('Configuración')
  })

  it('does not render content when modelValue is false', () => {
    const wrapper = mountSheet({ modelValue: false })
    expect(wrapper.find('[role="switch"]').exists()).toBe(false)
  })

  it('displays current confidence threshold percentage', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setConfidenceThreshold(0.85)
    const wrapper = mountSheet()
    expect(wrapper.text()).toContain('85%')
  })

  it('displays current confirmation time', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setConfirmationTime(5)
    const wrapper = mountSheet()
    expect(wrapper.text()).toContain('5s')
  })

  it('displays current fast confirmation time', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setFastConfirmationTime(2)
    const wrapper = mountSheet()
    expect(wrapper.text()).toContain('2s')
  })

  it('renders all three theme buttons', () => {
    const wrapper = mountSheet()
    expect(wrapper.text()).toContain('Claro')
    expect(wrapper.text()).toContain('Oscuro')
    expect(wrapper.text()).toContain('Sistema')
  })

  it('renders all slider inputs', () => {
    const wrapper = mountSheet()
    const inputs = wrapper.findAll('input[type="range"]')
    expect(inputs.length).toBe(3)
  })

  it('renders all toggle switches', () => {
    const wrapper = mountSheet()
    const switches = wrapper.findAll('[role="switch"]')
    expect(switches.length).toBe(3)
  })

  it('sets theme to dark when Oscuro is clicked', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()

    const buttons = wrapper.findAll('button')
    const darkBtn = buttons.find((b) => b.text().includes('Oscuro'))
    expect(darkBtn).toBeDefined()
    await darkBtn!.trigger('click')

    expect(settingsStore.theme).toBe('dark')
  })

  it('sets theme to light when Claro is clicked', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()

    const buttons = wrapper.findAll('button')
    const lightBtn = buttons.find((b) => b.text().includes('Claro'))
    await lightBtn!.trigger('click')

    expect(settingsStore.theme).toBe('light')
  })

  it('sets theme to system when Sistema is clicked', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('dark')

    const buttons = wrapper.findAll('button')
    const systemBtn = buttons.find((b) => b.text().includes('Sistema'))
    await systemBtn!.trigger('click')

    expect(settingsStore.theme).toBe('system')
  })

  it('toggles feedbackEnabled when toggle clicked', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()
    const initialValue = settingsStore.feedbackEnabled

    const toggle = wrapper.findAll('[role="switch"]')[0]
    await toggle.trigger('click')

    expect(settingsStore.feedbackEnabled).toBe(!initialValue)
  })

  it('toggles continuousMode', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()
    const initialValue = settingsStore.continuousMode

    const toggle = wrapper.findAll('[role="switch"]')[1]
    await toggle.trigger('click')

    expect(settingsStore.continuousMode).toBe(!initialValue)
  })

  it('toggles skipDuplicates', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()
    const initialValue = settingsStore.skipDuplicates

    const toggle = wrapper.findAll('[role="switch"]')[2]
    await toggle.trigger('click')

    expect(settingsStore.skipDuplicates).toBe(!initialValue)
  })

  it('resets all settings via Restaurar todo button', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.setFeedbackEnabled(false)
    settingsStore.setConfidenceThreshold(0.9)
    settingsStore.setTheme('dark')

    const wrapper = mountSheet()
    const buttons = wrapper.findAll('button')
    const resetBtn = buttons.find((b) => b.text().includes('Restaurar todo'))
    await resetBtn!.trigger('click')

    expect(settingsStore.feedbackEnabled).toBe(true)
    expect(settingsStore.confidenceThreshold).toBe(0.7)
    expect(settingsStore.theme).toBe('system')
  })

  it('shows reset button when setting differs from default', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setFeedbackEnabled(false)

    const wrapper = mountSheet()
    expect(wrapper.html()).toContain('Restaurar valor por defecto')
  })

  it('hides reset button when setting matches default', () => {
    const settingsStore = useSettingsStore()
    settingsStore.resetAll()

    const wrapper = mountSheet()
    const resetButtons = wrapper.findAll('.reset-btn')
    expect(resetButtons.length).toBe(0)
  })

  it('emits update:modelValue false when Cerrar button is clicked', async () => {
    const wrapper = mountSheet()
    const buttons = wrapper.findAll('button')
    const closeBtn = buttons.find((b) => b.text().includes('Cerrar'))
    await closeBtn!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('updates confidence threshold via slider', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()
    const inputs = wrapper.findAll('input[type="range"]')

    await inputs[0].setValue('0.85')

    expect(settingsStore.confidenceThreshold).toBe(0.85)
  })

  it('updates confirmation time via slider', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()
    const inputs = wrapper.findAll('input[type="range"]')

    await inputs[1].setValue('5')

    expect(settingsStore.confirmationTime).toBe(5)
  })

  it('updates fast confirmation time via slider', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()
    const inputs = wrapper.findAll('input[type="range"]')

    await inputs[2].setValue('2')

    expect(settingsStore.fastConfirmationTime).toBe(2)
  })

  it('renders the three language selector buttons', () => {
    const wrapper = mountSheet()
    expect(wrapper.text()).toContain('Auto')
    expect(wrapper.text()).toContain('EN')
    expect(wrapper.text()).toContain('ES')
  })

  it('sets language to en when EN button is clicked', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()

    const enBtn = wrapper
      .findAll('button')
      .find((b) => b.text().replace(/\s+/g, ' ').trim().endsWith('EN'))
    expect(enBtn).toBeDefined()
    await enBtn!.trigger('click')

    expect(settingsStore.language).toBe('en')
  })

  it('sets language to es when ES button is clicked', async () => {
    const wrapper = mountSheet()
    const settingsStore = useSettingsStore()

    const esBtn = wrapper
      .findAll('button')
      .find((b) => b.text().replace(/\s+/g, ' ').trim().endsWith('ES'))
    expect(esBtn).toBeDefined()
    await esBtn!.trigger('click')

    expect(settingsStore.language).toBe('es')
  })

  it('sets language to auto when Auto button is clicked', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.setLanguage('en')

    const wrapper = mountSheet()
    const autoBtn = wrapper.findAll('button').find((b) => b.text().includes('Auto'))
    expect(autoBtn).toBeDefined()
    await autoBtn!.trigger('click')

    expect(settingsStore.language).toBe('auto')
  })

  it('shows reset language button when language differs from default', () => {
    const settingsStore = useSettingsStore()
    settingsStore.setLanguage('en')

    const wrapper = mountSheet()
    const resetBtns = wrapper.findAll('.reset-btn')
    expect(resetBtns.length).toBeGreaterThan(0)
  })

  it('resets language when its reset button is clicked', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.setLanguage('en')

    const wrapper = mountSheet()
    const resetBtns = wrapper.findAll('.reset-btn')
    // Last reset button corresponds to language section
    await resetBtns[resetBtns.length - 1].trigger('click')

    expect(settingsStore.language).toBe('auto')
  })

  it('resets theme when its reset button is clicked', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.setTheme('dark')

    const wrapper = mountSheet()
    const resetBtns = wrapper.findAll('.reset-btn')
    expect(resetBtns.length).toBeGreaterThan(0)
    await resetBtns[0].trigger('click')

    expect(settingsStore.theme).toBe('system')
  })

  it('resets confidence threshold when its reset button is clicked', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.setConfidenceThreshold(0.9)

    const wrapper = mountSheet()
    const resetBtns = wrapper.findAll('.reset-btn')
    expect(resetBtns.length).toBeGreaterThan(0)
    // Find the reset button next to the confidence display
    const confidenceReset = resetBtns.find((_b, i) => i === 0)
    await confidenceReset!.trigger('click')

    expect(settingsStore.confidenceThreshold).toBe(0.7)
  })

  it('resets confirmation time when its reset button is clicked', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.setConfirmationTime(8)

    const wrapper = mountSheet()
    const resetBtns = wrapper.findAll('.reset-btn')
    // Click any reset btn — all should reset their own setting
    await resetBtns[0].trigger('click')

    expect(settingsStore.confirmationTime).toBe(3)
  })

  it('resets fast confirmation time when its reset button is clicked', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.setFastConfirmationTime(4)

    const wrapper = mountSheet()
    const resetBtns = wrapper.findAll('.reset-btn')
    await resetBtns[0].trigger('click')

    expect(settingsStore.fastConfirmationTime).toBe(1)
  })

  it('resets continuousMode when its reset button is clicked', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.setContinuousMode(false)

    const wrapper = mountSheet()
    const resetBtns = wrapper.findAll('.reset-btn')
    expect(resetBtns.length).toBeGreaterThan(0)
    await resetBtns[0].trigger('click')

    expect(settingsStore.continuousMode).toBe(true)
  })

  it('resets skipDuplicates when its reset button is clicked', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.setSkipDuplicates(false)

    const wrapper = mountSheet()
    const resetBtns = wrapper.findAll('.reset-btn')
    expect(resetBtns.length).toBeGreaterThan(0)
    await resetBtns[0].trigger('click')

    expect(settingsStore.skipDuplicates).toBe(true)
  })
})
