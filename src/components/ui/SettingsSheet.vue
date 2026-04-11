<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="sheet-backdrop" @click="$emit('update:modelValue', false)"></div>
        <div
          class="sheet-content absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-white dark:bg-surface-900 rounded-t-2xl p-6 shadow-[0_-4px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_-4px_30px_rgba(0,0,0,0.35)]"
        >
          <div class="w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-600 mx-auto mb-5"></div>

          <div class="flex items-center gap-2 mb-6">
            <div class="w-1 h-5 bg-brand-500 rounded-full"></div>
            <h2
              class="heading-display text-sm font-semibold text-surface-700 dark:text-surface-200 uppercase tracking-wider"
            >
              {{ t('settings.title') }}
            </h2>
          </div>

          <div class="flex flex-col gap-5">
            <!-- Sonido y vibración -->
            <section>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-surface-800 dark:text-white/90">
                    {{ t('settings.sound.title') }}
                  </p>
                  <p class="text-xs text-surface-500 dark:text-white/50 mt-0.5">
                    {{ t('settings.sound.desc') }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    v-if="settingsStore.feedbackEnabled !== defaults.feedbackEnabled"
                    class="reset-btn"
                    :title="t('settings.resetDefault')"
                    @click="settingsStore.resetFeedbackEnabled()"
                  >
                    <IconReset class="w-3.5 h-3.5" />
                  </button>
                  <button
                    :class="[
                      'toggle-track',
                      settingsStore.feedbackEnabled ? 'toggle-track-on' : 'toggle-track-off',
                    ]"
                    role="switch"
                    :aria-checked="settingsStore.feedbackEnabled"
                    @click="settingsStore.toggleFeedback()"
                  >
                    <span
                      :class="[
                        'toggle-thumb',
                        settingsStore.feedbackEnabled ? 'toggle-thumb-on' : 'toggle-thumb-off',
                      ]"
                    ></span>
                  </button>
                </div>
              </div>
            </section>

            <div class="border-t border-surface-200 dark:border-surface-700"></div>

            <!-- Umbral de confianza -->
            <section>
              <div class="flex items-center justify-between mb-2">
                <div>
                  <p class="text-sm font-medium text-surface-800 dark:text-white/90">
                    {{ t('settings.confidence.title') }}
                  </p>
                  <p class="text-xs text-surface-500 dark:text-white/50 mt-0.5">
                    {{ t('settings.confidence.desc') }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs font-semibold text-brand-600 dark:text-brand-400 tabular-nums"
                  >
                    {{ (settingsStore.confidenceThreshold * 100).toFixed(0) }}%
                  </span>
                  <button
                    v-if="settingsStore.confidenceThreshold !== defaults.confidenceThreshold"
                    class="reset-btn"
                    :title="t('settings.resetDefault')"
                    @click="settingsStore.resetConfidenceThreshold()"
                  >
                    <IconReset class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                :min="0.5"
                :max="0.95"
                :step="0.05"
                :value="settingsStore.confidenceThreshold"
                class="range-input"
                @input="
                  settingsStore.setConfidenceThreshold(
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
            </section>

            <!-- Tiempo de confirmación -->
            <section>
              <div class="flex items-center justify-between mb-2">
                <div>
                  <p class="text-sm font-medium text-surface-800 dark:text-white/90">
                    {{ t('settings.confirmTime.title') }}
                  </p>
                  <p class="text-xs text-surface-500 dark:text-white/50 mt-0.5">
                    {{ t('settings.confirmTime.desc') }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs font-semibold text-brand-600 dark:text-brand-400 tabular-nums"
                  >
                    {{ settingsStore.confirmationTime }}s
                  </span>
                  <button
                    v-if="settingsStore.confirmationTime !== defaults.confirmationTime"
                    class="reset-btn"
                    :title="t('settings.resetDefault')"
                    @click="settingsStore.resetConfirmationTime()"
                  >
                    <IconReset class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                :min="1"
                :max="10"
                :step="0.5"
                :value="settingsStore.confirmationTime"
                class="range-input"
                @input="
                  settingsStore.setConfirmationTime(
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
            </section>

            <!-- Confirmación rápida -->
            <section>
              <div class="flex items-center justify-between mb-2">
                <div>
                  <p class="text-sm font-medium text-surface-800 dark:text-white/90">
                    {{ t('settings.fastConfirm.title') }}
                  </p>
                  <p class="text-xs text-surface-500 dark:text-white/50 mt-0.5">
                    {{ t('settings.fastConfirm.desc') }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs font-semibold text-brand-600 dark:text-brand-400 tabular-nums"
                  >
                    {{ settingsStore.fastConfirmationTime }}s
                  </span>
                  <button
                    v-if="settingsStore.fastConfirmationTime !== defaults.fastConfirmationTime"
                    class="reset-btn"
                    :title="t('settings.resetDefault')"
                    @click="settingsStore.resetFastConfirmationTime()"
                  >
                    <IconReset class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                :min="0.5"
                :max="5"
                :step="0.5"
                :value="settingsStore.fastConfirmationTime"
                class="range-input"
                @input="
                  settingsStore.setFastConfirmationTime(
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
            </section>

            <div class="border-t border-surface-200 dark:border-surface-700"></div>

            <!-- Escaneo continuo -->
            <section>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-surface-800 dark:text-white/90">
                    {{ t('settings.continuousScan.title') }}
                  </p>
                  <p class="text-xs text-surface-500 dark:text-white/50 mt-0.5">
                    {{ t('settings.continuousScan.desc') }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    v-if="settingsStore.continuousMode !== defaults.continuousMode"
                    class="reset-btn"
                    :title="t('settings.resetDefault')"
                    @click="settingsStore.resetContinuousMode()"
                  >
                    <IconReset class="w-3.5 h-3.5" />
                  </button>
                  <button
                    :class="[
                      'toggle-track',
                      settingsStore.continuousMode ? 'toggle-track-on' : 'toggle-track-off',
                    ]"
                    role="switch"
                    :aria-checked="settingsStore.continuousMode"
                    @click="settingsStore.setContinuousMode(!settingsStore.continuousMode)"
                  >
                    <span
                      :class="[
                        'toggle-thumb',
                        settingsStore.continuousMode ? 'toggle-thumb-on' : 'toggle-thumb-off',
                      ]"
                    ></span>
                  </button>
                </div>
              </div>
            </section>

            <!-- No alertar duplicados -->
            <section>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-surface-800 dark:text-white/90">
                    {{ t('settings.skipDuplicates.title') }}
                  </p>
                  <p class="text-xs text-surface-500 dark:text-white/50 mt-0.5">
                    {{ t('settings.skipDuplicates.desc') }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    v-if="settingsStore.skipDuplicates !== defaults.skipDuplicates"
                    class="reset-btn"
                    :title="t('settings.resetDefault')"
                    @click="settingsStore.resetSkipDuplicates()"
                  >
                    <IconReset class="w-3.5 h-3.5" />
                  </button>
                  <button
                    :class="[
                      'toggle-track',
                      settingsStore.skipDuplicates ? 'toggle-track-on' : 'toggle-track-off',
                    ]"
                    role="switch"
                    :aria-checked="settingsStore.skipDuplicates"
                    @click="settingsStore.setSkipDuplicates(!settingsStore.skipDuplicates)"
                  >
                    <span
                      :class="[
                        'toggle-thumb',
                        settingsStore.skipDuplicates ? 'toggle-thumb-on' : 'toggle-thumb-off',
                      ]"
                    ></span>
                  </button>
                </div>
              </div>
            </section>

            <div class="border-t border-surface-200 dark:border-surface-700"></div>

            <!-- Tema -->
            <section>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-surface-800 dark:text-white/90">
                    {{ t('settings.theme.title') }}
                  </p>
                  <p class="text-xs text-surface-500 dark:text-white/50 mt-0.5">
                    {{ t('settings.theme.desc') }}
                  </p>
                </div>
                <button
                  v-if="settingsStore.theme !== defaults.theme"
                  class="reset-btn"
                  :title="t('settings.resetDefault')"
                  @click="settingsStore.resetTheme()"
                >
                  <IconReset class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="flex gap-2 mt-3">
                <button
                  :class="[
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-colors border',
                    settingsStore.theme === 'light'
                      ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-500 text-brand-700 dark:text-brand-400'
                      : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-white/60 hover:border-surface-300 dark:hover:border-surface-600',
                  ]"
                  @click="settingsStore.setTheme('light')"
                >
                  <IconSun class="w-4 h-4 mx-auto mb-0.5" />
                  {{ t('settings.buttons.light') }}
                </button>
                <button
                  :class="[
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-colors border',
                    settingsStore.theme === 'dark'
                      ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-500 text-brand-700 dark:text-brand-400'
                      : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-white/60 hover:border-surface-300 dark:hover:border-surface-600',
                  ]"
                  @click="settingsStore.setTheme('dark')"
                >
                  <IconMoon class="w-4 h-4 mx-auto mb-0.5" />
                  {{ t('settings.buttons.dark') }}
                </button>
                <button
                  :class="[
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-colors border',
                    settingsStore.theme === 'system'
                      ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-500 text-brand-700 dark:text-brand-400'
                      : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-white/60 hover:border-surface-300 dark:hover:border-surface-600',
                  ]"
                  @click="settingsStore.setTheme('system')"
                >
                  <IconMonitor class="w-4 h-4 mx-auto mb-0.5" />
                  {{ t('settings.buttons.system') }}
                </button>
              </div>
            </section>

            <div class="border-t border-surface-200 dark:border-surface-700"></div>

            <!-- Idioma -->
            <section>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-surface-800 dark:text-white/90">
                    {{ t('settings.language.title') }}
                  </p>
                  <p class="text-xs text-surface-500 dark:text-white/50 mt-0.5">
                    {{ t('settings.language.desc') }}
                  </p>
                </div>
                <button
                  v-if="settingsStore.language !== defaults.language"
                  class="reset-btn"
                  :title="t('settings.resetDefault')"
                  @click="settingsStore.resetLanguage()"
                >
                  <IconReset class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="flex gap-2 mt-3">
                <button
                  :class="[
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-colors border',
                    settingsStore.language === 'auto'
                      ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-500 text-brand-700 dark:text-brand-400'
                      : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-white/60 hover:border-surface-300 dark:hover:border-surface-600',
                  ]"
                  @click="settingsStore.setLanguage('auto')"
                >
                  <IconMonitor class="w-4 h-4 mx-auto mb-0.5" />
                  {{ t('settings.buttons.auto') }}
                </button>
                <button
                  :class="[
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-colors border',
                    settingsStore.language === 'en'
                      ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-500 text-brand-700 dark:text-brand-400'
                      : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-white/60 hover:border-surface-300 dark:hover:border-surface-600',
                  ]"
                  @click="settingsStore.setLanguage('en')"
                >
                  <span class="block text-base leading-none mb-0.5">🇬🇧</span>
                  EN
                </button>
                <button
                  :class="[
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-colors border',
                    settingsStore.language === 'es'
                      ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-500 text-brand-700 dark:text-brand-400'
                      : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-white/60 hover:border-surface-300 dark:hover:border-surface-600',
                  ]"
                  @click="settingsStore.setLanguage('es')"
                >
                  <span class="block text-base leading-none mb-0.5">🇪🇸</span>
                  ES
                </button>
              </div>
            </section>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              class="flex-1 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-white/70 font-medium text-sm hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors"
              @click="$emit('update:modelValue', false)"
            >
              {{ t('settings.buttons.close') }}
            </button>
            <button
              class="py-2.5 px-4 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-500 dark:text-white/50 text-sm font-medium hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              @click="settingsStore.resetAll()"
            >
              {{ t('settings.buttons.resetAll') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSettingsStore, DEFAULTS } from '@/stores/settingsStore'
import IconReset from '@/components/icons/IconReset.vue'
import IconSun from '@/components/icons/IconSun.vue'
import IconMoon from '@/components/icons/IconMoon.vue'
import IconMonitor from '@/components/icons/IconMonitor.vue'

defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
const settingsStore = useSettingsStore()
const defaults = DEFAULTS
</script>

<style scoped>
.sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.sheet-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-leave-active {
  transition: all 0.2s ease-in;
}
.sheet-enter-from .sheet-backdrop,
.sheet-leave-to .sheet-backdrop {
  opacity: 0;
}
.sheet-enter-from .sheet-content,
.sheet-leave-to .sheet-content {
  transform: translateY(100%);
}

.toggle-track {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  transition: background-color 0.2s;
  flex-shrink: 0;
  cursor: pointer;
  border: none;
  padding: 0;
}
.toggle-track-on {
  background-color: var(--color-brand-600);
}
.toggle-track-off {
  background-color: var(--color-surface-300);
}
:root.dark .toggle-track-off {
  background-color: var(--color-surface-600);
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.toggle-thumb-on {
  left: 22px;
}
.toggle-thumb-off {
  left: 2px;
}

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

.range-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--color-surface-200);
  outline: none;
  cursor: pointer;
}
:root.dark .range-input {
  background: var(--color-surface-700);
}
.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-brand-600);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.range-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-brand-600);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
</style>
