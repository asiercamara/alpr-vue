import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { usePlateStore } from '@/stores/plateStore'
import PlateList from '@/components/ui/PlateList.vue'

/**
 * The list, the modal and the real plate store together. PlateModal.test.ts mocks the
 * store, so it cannot see whether what the modal shows follows an edit.
 */
function plateData(id: string, text: string, confidence = 0.95) {
  return {
    id,
    text,
    confidence,
    plateText: { text, confidence: Array.from(text, () => confidence) },
    timestamp: new Date(),
    croppedImage: null,
    boundingBox: null,
  }
}

describe('editing a plate from the list', () => {
  let store: ReturnType<typeof usePlateStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePlateStore()
  })

  const mountList = () =>
    mount(PlateList, {
      attachTo: document.body,
      global: {
        stubs: {
          Teleport: { template: '<div><slot/></div>' },
          Transition: { template: '<div><slot/></div>' },
          TransitionGroup: { template: '<div><slot/></div>' },
        },
      },
    })

  const button = (wrapper: ReturnType<typeof mountList>, title: string) =>
    wrapper.findAll('button').find((b) => b.attributes('title') === title)

  const openModal = async (wrapper: ReturnType<typeof mountList>) => {
    await wrapper.get('.card').trigger('click')
  }

  const editTo = async (wrapper: ReturnType<typeof mountList>, text: string) => {
    await button(wrapper, 'Editar')!.trigger('click')
    await wrapper.get('.modal-content input').setValue(text)
    await button(wrapper, 'Guardar')!.trigger('click')
  }

  it('shows the new text in the open modal as soon as the edit is saved', async () => {
    store.addPlate(plateData('p1', 'ABC123'))
    const wrapper = mountList()
    await openModal(wrapper)

    await editTo(wrapper, 'XYZ789')

    expect(wrapper.get('.modal-content .plate-text').text()).toBe('XYZ789')
    wrapper.unmount()
  })

  it('shows the new text in the list behind the modal', async () => {
    store.addPlate(plateData('p1', 'ABC123'))
    const wrapper = mountList()
    await openModal(wrapper)

    await editTo(wrapper, 'XYZ789')

    expect(wrapper.get('.card .plate-text').text()).toBe('XYZ789')
    wrapper.unmount()
  })

  it('keeps showing the edited plate after it moves to another group', async () => {
    store.addPlate(plateData('p1', 'ABC123', 0.9))
    store.addPlate(plateData('p2', 'ABC123', 0.8))
    const wrapper = mountList()
    await openModal(wrapper)

    await editTo(wrapper, 'QWE456')

    expect(wrapper.get('.modal-content .plate-text').text()).toBe('QWE456')
    wrapper.unmount()
  })

  it('edits the plate again from the text it now has', async () => {
    store.addPlate(plateData('p1', 'ABC123'))
    const wrapper = mountList()
    await openModal(wrapper)
    await editTo(wrapper, 'XYZ789')

    await button(wrapper, 'Editar')!.trigger('click')

    expect((wrapper.get('.modal-content input').element as HTMLInputElement).value).toBe('XYZ789')
    wrapper.unmount()
  })
})
