<template>
  <div class="doc-tabs">
    <div class="doc-tabs-header" role="tablist">
      <button
        v-for="(tab, i) in tabs"
        :key="tab"
        role="tab"
        :class="['doc-tab-btn', { active: activeTab === i }]"
        :aria-selected="activeTab === i"
        @click="activeTab = i"
      >
        {{ tab }}
      </button>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'

const activeTab = ref(0)
const tabs = ref<string[]>([])

provide('doc-tabs', {
  activeTab,
  register(title: string): number {
    const existing = tabs.value.indexOf(title)
    if (existing !== -1) return existing
    tabs.value.push(title)
    return tabs.value.length - 1
  },
})
</script>
