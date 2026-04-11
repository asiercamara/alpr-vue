<template>
  <section>
    <div :class="['flex items-center justify-between', $slots.below ? 'mb-2' : '']">
      <div>
        <p class="text-sm font-medium text-surface-800 dark:text-white/90">{{ title }}</p>
        <p class="text-xs text-surface-500 dark:text-white/50 mt-0.5">{{ description }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="displayValue"
          class="text-xs font-semibold text-brand-600 dark:text-brand-400 tabular-nums"
        >
          {{ displayValue }}
        </span>
        <button v-if="isDirty" class="reset-btn" :title="resetTitle" @click="$emit('reset')">
          <IconReset class="w-3.5 h-3.5" />
        </button>
        <slot />
      </div>
    </div>
    <slot name="below" />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconReset from '@/components/icons/IconReset.vue'

interface Props {
  title: string
  description: string
  isDirty: boolean
  /** Optional value display shown before the reset button (e.g. "42%" or "3s"). */
  displayValue?: string
}

defineProps<Props>()
defineEmits<{ reset: [] }>()

const { t } = useI18n()
const resetTitle = t('settings.resetDefault')
</script>

<style scoped>
.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--color-surface-300);
  color: var(--color-surface-400);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
  flex-shrink: 0;
}
:root.dark .reset-btn {
  border-color: var(--color-surface-600);
  color: var(--color-surface-400);
}
.reset-btn:hover {
  border-color: var(--color-brand-500);
  color: var(--color-brand-600);
  background: var(--color-brand-50);
}
:root.dark .reset-btn:hover {
  border-color: var(--color-brand-500);
  color: var(--color-brand-400);
  background: rgba(139, 92, 246, 0.15);
}
</style>
