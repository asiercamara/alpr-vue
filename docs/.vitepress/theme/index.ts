/* eslint-disable vue/multi-word-component-names */
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'

import DocPageHeader from './components/DocPageHeader.vue'
import DocCardGroup from './components/DocCardGroup.vue'
import DocCard from './components/DocCard.vue'
import DocNote from './components/DocNote.vue'
import DocTip from './components/DocTip.vue'
import DocWarning from './components/DocWarning.vue'
import DocInfo from './components/DocInfo.vue'
import DocCheck from './components/DocCheck.vue'
import DocSteps from './components/DocSteps.vue'
import DocStep from './components/DocStep.vue'
import DocTabs from './components/DocTabs.vue'
import DocTab from './components/DocTab.vue'
import DocAccordionGroup from './components/DocAccordionGroup.vue'
import DocAccordion from './components/DocAccordion.vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(DocPageHeader),
    })
  },
  enhanceApp({ app }) {
    app.component('CardGroup', DocCardGroup)
    app.component('Card', DocCard)
    app.component('Note', DocNote)
    app.component('Tip', DocTip)
    app.component('Warning', DocWarning)
    app.component('Info', DocInfo)
    app.component('Check', DocCheck)
    app.component('Steps', DocSteps)
    app.component('Step', DocStep)
    app.component('Tabs', DocTabs)
    app.component('Tab', DocTab)
    app.component('AccordionGroup', DocAccordionGroup)
    app.component('Accordion', DocAccordion)
  },
} satisfies Theme
