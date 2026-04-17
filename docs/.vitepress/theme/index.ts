/* eslint-disable vue/multi-word-component-names */
import { h, nextTick, watch } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { createMermaidRenderer } from 'vitepress-mermaid-renderer'
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

let mermaidFullscreenObserverInitialized = false

const ensureMermaidFullscreenAutofit = () => {
  if (
    mermaidFullscreenObserverInitialized ||
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'attributes') {
        continue
      }

      const target = mutation.target
      if (!(target instanceof HTMLElement) || !target.classList.contains('mermaid-container')) {
        continue
      }

      const isDialogFullscreenActive = target.classList.contains('dialog-fullscreen-active')

      if (!isDialogFullscreenActive) {
        target.dataset.autofitApplied = 'false'
        continue
      }

      if (target.dataset.autofitApplied === 'true') {
        continue
      }

      target.dataset.autofitApplied = 'true'

      window.requestAnimationFrame(() => {
        const resetButton = target.querySelector<HTMLElement>(
          '.desktop-controls button[title="Reset View"], .mobile-controls button[title="Reset View"]',
        )

        resetButton?.click()
      })
    }
  })

  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  })

  mermaidFullscreenObserverInitialized = true
}

export default {
  extends: DefaultTheme,
  Layout() {
    const { isDark } = useData()

    const initMermaid = () => {
      const mermaidRenderer = createMermaidRenderer({
        theme: isDark.value ? 'dark' : 'default',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
        },
        sequence: {
          useMaxWidth: true,
        },
        journey: {
          useMaxWidth: true,
        },
      })

      mermaidRenderer.setToolbar({
        showLanguageLabel: false,
        downloadFormat: 'svg',
        fullscreenMode: 'dialog',
        desktop: {
          download: 'enabled',
          zoomIn: 'enabled',
          zoomOut: 'enabled',
          zoomLevel: 'enabled',
          positions: { vertical: 'top', horizontal: 'right' },
        },
        mobile: {
          zoomIn: 'enabled',
          zoomOut: 'enabled',
          zoomLevel: 'enabled',
          positions: { vertical: 'bottom', horizontal: 'right' },
        },
        fullscreen: {
          download: 'enabled',
          zoomIn: 'enabled',
          zoomOut: 'enabled',
          zoomLevel: 'enabled',
          positions: { vertical: 'top', horizontal: 'right' },
        },
      })

      ensureMermaidFullscreenAutofit()
    }

    nextTick(() => initMermaid())
    watch(
      () => isDark.value,
      () => {
        nextTick(() => initMermaid())
      },
    )

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
