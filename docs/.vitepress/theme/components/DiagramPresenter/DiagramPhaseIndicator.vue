<!--
  DiagramPhaseIndicator.vue
  ==================================================================
  Visual dot indicator showing current phase position in phaseNav mode.
  One dot per phase; the active dot scales up with a GSAP spring.

  Props:
    total         (number)  — total number of phases
    currentIndex  (number)  — current active phase index (-1 = none)
-->
<template>
  <div v-if="total > 0" class="dp-phase-indicator" role="tablist" aria-label="Fases del diagrama">
    <button
      v-for="i in total"
      :key="i"
      :ref="(el) => setDotRef(el, i - 1)"
      type="button"
      role="tab"
      class="dp-phase-dot"
      :class="{
        'dp-phase-dot--done': i - 1 < currentIndex,
        'dp-phase-dot--active': i - 1 === currentIndex,
      }"
      :aria-label="`Fase ${i} de ${total}`"
      :aria-selected="i - 1 === currentIndex"
    />
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUpdate } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  total: { type: Number, required: true },
  currentIndex: { type: Number, required: true },
})

const dotRefs = ref([])

function setDotRef(el, i) {
  if (el) dotRefs.value[i] = el
}

onBeforeUpdate(() => {
  dotRefs.value = []
})

watch(
  () => props.currentIndex,
  (newIdx, oldIdx) => {
    if (oldIdx >= 0 && dotRefs.value[oldIdx]) {
      gsap.to(dotRefs.value[oldIdx], { scale: 1, duration: 0.2, ease: 'power2.out' })
    }
    if (newIdx >= 0 && dotRefs.value[newIdx]) {
      gsap.to(dotRefs.value[newIdx], { scale: 1.5, duration: 0.35, ease: 'elastic.out(1, 0.5)' })
    }
  },
)
</script>

<style scoped>
.dp-phase-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0.3rem 0.75rem;
  flex-shrink: 0;
}

.dp-phase-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dp-border);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}

.dp-phase-dot--done {
  background: color-mix(in srgb, var(--dp-accent) 50%, var(--dp-border));
}

.dp-phase-dot--active {
  background: var(--dp-accent);
}

.dp-phase-dot:hover {
  background: var(--dp-accent);
  opacity: 0.7;
}
</style>
