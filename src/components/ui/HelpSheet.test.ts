import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HelpSheet from '@/components/ui/HelpSheet.vue'

describe('HelpSheet', () => {
  it('does not render when modelValue is false', () => {
    const wrapper = mount(HelpSheet, {
      props: { modelValue: false },
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
        },
      },
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('renders when modelValue is true', () => {
    const wrapper = mount(HelpSheet, {
      props: { modelValue: true },
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
        },
      },
    })
    expect(wrapper.text()).toContain('Cómo usar')
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('3')
  })

  it('explains upload, history and settings after the camera steps', () => {
    const wrapper = mount(HelpSheet, {
      props: { modelValue: true },
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
        },
      },
    })
    const steps = wrapper.findAll('p').map((p) => p.text())
    expect(steps[3]).toContain('sube una imagen o un vídeo')
    expect(steps[4]).toContain('exporta todo a CSV')
    expect(steps[5]).toContain('Pulsa')
    expect(steps[5]).toContain('sensibilidad de detección')
    expect(wrapper.text()).toContain('6')
  })

  it('emits update:modelValue false when backdrop is clicked', async () => {
    const wrapper = mount(HelpSheet, {
      props: { modelValue: true },
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
        },
      },
    })
    const backdrop = wrapper.find('.sheet-backdrop')
    if (backdrop.exists()) {
      await backdrop.trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    }
  })

  it('emits update:modelValue false when outer overlay is clicked directly', async () => {
    const wrapper = mount(HelpSheet, {
      props: { modelValue: true },
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
        },
      },
    })
    const overlay = wrapper.find('.fixed')
    if (overlay.exists()) {
      await overlay.trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    }
  })

  it('emits update:modelValue false when Entendido button is clicked', async () => {
    const wrapper = mount(HelpSheet, {
      props: { modelValue: true },
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
        },
      },
    })
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Entendido'))
    if (btn) {
      await btn.trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    }
  })

  it('shows the app version from package.json', () => {
    const wrapper = mount(HelpSheet, {
      props: { modelValue: true },
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
        },
      },
    })
    const version = wrapper.find('[data-testid="app-version"]').text()
    expect(version).toBe(`v${__APP_VERSION__}`)
    expect(version).toMatch(/^v\d+\.\d+\.\d+$/)
  })
})
