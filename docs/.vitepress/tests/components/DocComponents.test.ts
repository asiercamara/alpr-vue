import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DocAccordion from '@docs-theme/components/DocAccordion.vue'
import DocAccordionGroup from '@docs-theme/components/DocAccordionGroup.vue'
import DocCard from '@docs-theme/components/DocCard.vue'
import DocCardGroup from '@docs-theme/components/DocCardGroup.vue'
import DocCheck from '@docs-theme/components/DocCheck.vue'
import DocInfo from '@docs-theme/components/DocInfo.vue'
import DocNote from '@docs-theme/components/DocNote.vue'
import DocPageHeader from '@docs-theme/components/DocPageHeader.vue'
import DocStep from '@docs-theme/components/DocStep.vue'
import DocSteps from '@docs-theme/components/DocSteps.vue'
import DocTip from '@docs-theme/components/DocTip.vue'
import DocWarning from '@docs-theme/components/DocWarning.vue'
import { vitepressData } from '@docs-tests/mocks/runtime'

describe('theme simple components', () => {
  it('renders accordion title and body slot', () => {
    const wrapper = mount(DocAccordion, {
      props: { title: 'Advanced notes' },
      slots: { default: '<p>Body content</p>' },
    })

    expect(wrapper.find('details.doc-accordion').exists()).toBe(true)
    expect(wrapper.find('summary').text()).toContain('Advanced notes')
    expect(wrapper.html()).toContain('Body content')
    expect(wrapper.find('.doc-accordion-chevron').exists()).toBe(true)
  })

  it('renders accordion and steps group wrappers', () => {
    const accordionGroup = mount(DocAccordionGroup, {
      slots: { default: '<section>Group content</section>' },
    })
    const steps = mount(DocSteps, {
      slots: { default: '<div>Step list</div>' },
    })

    expect(accordionGroup.find('.doc-accordion-group').text()).toContain('Group content')
    expect(steps.find('.doc-steps').text()).toContain('Step list')
  })

  it('renders doc card as link with icon when href and icon are provided', () => {
    const wrapper = mount(DocCard, {
      props: {
        title: 'Quick start',
        href: '/quickstart',
        icon: 'rocket',
      },
      slots: { default: '<p>Launch the docs</p>' },
    })

    expect(wrapper.find('a.doc-card').attributes('href')).toBe('/quickstart')
    expect(wrapper.find('.doc-card-title').text()).toBe('Quick start')
    expect(wrapper.find('.doc-card-icon').exists()).toBe(true)
    expect(wrapper.text()).toContain('Launch the docs')
  })

  it('renders doc card as plain container without icon for unknown icon key', () => {
    const wrapper = mount(DocCard, {
      props: {
        title: 'Plain card',
        icon: 'unknown-icon',
      },
    })

    expect(wrapper.find('div.doc-card').exists()).toBe(true)
    expect(wrapper.find('a.doc-card').exists()).toBe(false)
    expect(wrapper.find('.doc-card-icon').exists()).toBe(false)
  })

  it('applies card group column class with numeric fallback', () => {
    const threeCols = mount(DocCardGroup, {
      props: { cols: 3 },
      slots: { default: '<div>Cards</div>' },
    })
    const fallbackCols = mount(DocCardGroup, {
      props: { cols: 'invalid' },
    })

    expect(threeCols.classes()).toContain('cols-3')
    expect(fallbackCols.classes()).toContain('cols-2')
  })

  it('renders step title and content', () => {
    const wrapper = mount(DocStep, {
      props: { title: 'Install dependencies' },
      slots: { default: '<p>Run pnpm install</p>' },
    })

    expect(wrapper.find('.doc-step-title').text()).toBe('Install dependencies')
    expect(wrapper.text()).toContain('Run pnpm install')
    expect(wrapper.find('.doc-step-number').attributes('aria-hidden')).toBe('true')
  })

  it.each([
    ['note', DocNote, 'note'],
    ['tip', DocTip, undefined],
    ['warning', DocWarning, 'alert'],
    ['info', DocInfo, 'note'],
    ['check', DocCheck, undefined],
  ])('renders %s callout with slot content', (_name, component, role) => {
    const wrapper = mount(component, {
      slots: { default: '<strong>Helpful content</strong>' },
    })

    if (role) {
      expect(wrapper.attributes('role')).toBe(role)
    }
    expect(wrapper.find('.callout-icon').exists()).toBe(true)
    expect(wrapper.text()).toContain('Helpful content')
  })

  it('shows page header from VitePress frontmatter', () => {
    vitepressData.frontmatter.value = {
      title: 'Diagram Presenter',
      description: 'Animation controls and export flow.',
    }

    const wrapper = mount(DocPageHeader)

    expect(wrapper.find('.doc-page-title').text()).toBe('Diagram Presenter')
    expect(wrapper.find('.doc-page-description').text()).toContain('Animation controls')
  })

  it('hides page header when frontmatter has no title', () => {
    vitepressData.frontmatter.value = {}

    const wrapper = mount(DocPageHeader)

    expect(wrapper.find('.doc-page-header').exists()).toBe(false)
  })
})
