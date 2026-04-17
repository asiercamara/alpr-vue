<template>
  <div v-show="ctx.activeTab.value === myIndex" role="tabpanel" class="doc-tab-panel">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue'
import type { Ref } from 'vue'

const props = defineProps<{ title: string }>()

const ctx = inject<{ activeTab: Ref<number>; register: (title: string) => number }>('doc-tabs')!
const myIndex = ref(ctx.register(props.title))
</script>
