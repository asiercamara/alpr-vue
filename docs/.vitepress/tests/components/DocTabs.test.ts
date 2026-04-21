import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import DocTab from '@docs-theme/components/DocTab.vue'
import DocTabs from '@docs-theme/components/DocTabs.vue'

const TabsFixture = defineComponent({
  components: {
    DocTab,
    DocTabs,
  },
  template: `
    <DocTabs>
      <DocTab title="Overview">Overview content</DocTab>
      <DocTab title="Details">Details content</DocTab>
    </DocTabs>
  `,
})

describe('DocTabs', () => {
  it('registers tab buttons from child panels and switches active panel on click', async () => {
    const wrapper = mount(TabsFixture)
    await nextTick()

    const buttons = wrapper.findAll('[role="tab"]')
    const panels = wrapper.findAll('.doc-tab-panel')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toBe('Overview')
    expect(buttons[1].text()).toBe('Details')
    expect(buttons[0].attributes('aria-selected')).toBe('true')
    expect((panels[0].element as HTMLElement).style.display).not.toBe('none')
    expect((panels[1].element as HTMLElement).style.display).toBe('none')

    await buttons[1].trigger('click')

    expect(buttons[1].attributes('aria-selected')).toBe('true')
    expect((panels[0].element as HTMLElement).style.display).toBe('none')
    expect((panels[1].element as HTMLElement).style.display).not.toBe('none')
  })

  it('deduplicates identical tab titles through the provided register function', async () => {
    const DuplicateTabsFixture = defineComponent({
      setup() {
        return () =>
          h(DocTabs, null, {
            default: () => [
              h(DocTab, { title: 'Shared' }, () => 'First'),
              h(DocTab, { title: 'Shared' }, () => 'Second'),
            ],
          })
      },
    })

    const wrapper = mount(DuplicateTabsFixture)
    await nextTick()
    const buttons = wrapper.findAll('[role="tab"]')

    expect(buttons).toHaveLength(1)
    expect(buttons[0].text()).toBe('Shared')
  })
})
