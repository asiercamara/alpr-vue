<!--
  DiagramToolbar.vue
  ==================================================================
  Shared toolbar for DiagramPresenter — used both in the inline view
  and inside the fullscreen modal.

  The `isModal` prop controls the extra buttons that only make sense
  in the modal context (reset zoom and close).

  Props:
    canStart      (boolean)  — whether the Play button is enabled
    isPlaying     (boolean)  — animation is currently running
    isPaused      (boolean)  — animation is paused
    speedLabel    (string)   — human-readable speed label ('½×' / '1×' / '2×')
    currentSpeed  (string)   — current speed key: 'slow' | 'normal' | 'fast'
    isLooping     (boolean)  — loop mode is active
    showBadge     (boolean)  — show the adapter name badge
    adapterLabel  (string)   — adapter name to display in the badge
    ready         (boolean)  — diagram is fully rendered
    isModal       (boolean)  — true → show resetZoom + close buttons

  Emits:
    play          — user clicked Play
    cycleSpeed    — user clicked the speed button
    togglePause   — user clicked Pause / Resume
    toggleLoop    — user clicked the loop button
    reset         — user clicked Reset (↺)
    maximize      — user clicked Maximize (inline only, isModal=false)
    resetZoom     — user clicked Reset Zoom (modal only, isModal=true)
    close         — user clicked Close (modal only, isModal=true)
-->
<template>
  <header class="dp-toolbar" :class="{ 'dp-modal-toolbar': isModal }">
    <div class="dp-controls" role="group" aria-label="Controles de animación">
      <button
        type="button"
        class="dp-btn dp-btn-primary"
        :disabled="!canStart"
        @click="$emit('play')"
      >
        <span class="dp-icon" aria-hidden="true">▶</span>
        <span>Reproducir</span>
      </button>
    </div>

    <div class="dp-toolbar-right">
      <span v-if="showBadge && adapterLabel" class="dp-badge" :title="`Adapter: ${adapterLabel}`">
        {{ adapterLabel }}
      </span>

      <!-- Speed cycle -->
      <button
        type="button"
        class="dp-btn dp-btn-ghost dp-speed-btn"
        :class="{ 'dp-btn-active': currentSpeed !== 'normal' }"
        :title="`Velocidad: ${speedLabel}`"
        @click="$emit('cycleSpeed')"
      >
        {{ speedLabel }}
      </button>

      <!-- Loop toggle -->
      <button
        type="button"
        class="dp-btn dp-btn-ghost"
        :class="{ 'dp-btn-active': isLooping }"
        title="Bucle continuo"
        @click="$emit('toggleLoop')"
      >
        ⟲
      </button>

      <!-- Pause / Resume (only visible while playing) -->
      <button
        v-if="isPlaying"
        type="button"
        class="dp-btn dp-btn-ghost"
        :title="isPaused ? 'Reanudar' : 'Pausar'"
        @click="$emit('togglePause')"
      >
        {{ isPaused ? '▶' : '❚❚' }}
      </button>

      <!-- Reset -->
      <button
        type="button"
        class="dp-btn dp-btn-ghost"
        :disabled="!ready || isPlaying"
        title="Reiniciar"
        @click="$emit('reset')"
      >
        ↺
      </button>

      <!-- Maximize — inline toolbar only -->
      <button
        v-if="!isModal"
        type="button"
        class="dp-btn dp-btn-ghost"
        :disabled="!ready"
        title="Maximizar"
        aria-label="Ver diagrama maximizado"
        @click="$emit('maximize')"
      >
        ⛶
      </button>

      <!-- Reset zoom — modal toolbar only -->
      <button
        v-if="isModal"
        type="button"
        class="dp-btn dp-btn-ghost"
        title="Restablecer zoom"
        @click="$emit('resetZoom')"
      >
        ⊙
      </button>

      <!-- Close — modal toolbar only -->
      <button
        v-if="isModal"
        type="button"
        class="dp-btn dp-btn-ghost"
        title="Cerrar (Esc)"
        aria-label="Cerrar diagrama maximizado"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  canStart: { type: Boolean, required: true },
  isPlaying: { type: Boolean, required: true },
  isPaused: { type: Boolean, required: true },
  speedLabel: { type: String, required: true },
  currentSpeed: { type: String, required: true },
  isLooping: { type: Boolean, required: true },
  showBadge: { type: Boolean, default: false },
  adapterLabel: { type: String, default: '' },
  ready: { type: Boolean, required: true },
  isModal: { type: Boolean, default: false },
})

defineEmits([
  'play',
  'cycleSpeed',
  'togglePause',
  'toggleLoop',
  'reset',
  'maximize',
  'resetZoom',
  'close',
])
</script>

<style scoped>
/* ================================================================
 * Toolbar layout
 * ================================================================ */
.dp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--dp-border);
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--dp-bg-raised) 60%, transparent),
    transparent
  );
  flex-wrap: wrap;
}
.dp-modal-toolbar {
  border-radius: 0;
  flex-shrink: 0;
}
.dp-controls {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.2rem;
  background: var(--dp-bg-raised);
  border: 1px solid var(--dp-border);
  border-radius: 10px;
}
.dp-toolbar-right {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

/* ================================================================
 * Buttons
 * ================================================================ */
.dp-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--dp-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s,
    transform 0.1s;
  line-height: 1;
}
.dp-btn:hover:not(:disabled) {
  color: var(--dp-text);
  background: var(--dp-accent-soft);
}
.dp-btn:active:not(:disabled) {
  transform: translateY(1px);
}
.dp-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.dp-btn-primary {
  color: var(--dp-accent);
  background: var(--dp-accent-soft);
}
.dp-btn-primary:hover:not(:disabled) {
  color: var(--dp-text);
  background: color-mix(in srgb, var(--dp-accent) 20%, var(--dp-accent-soft));
}
.dp-btn-ghost {
  width: 2.1rem;
  height: 2.1rem;
  padding: 0;
  justify-content: center;
  font-size: 0.95rem;
  border: 1px solid var(--dp-border);
  border-radius: 8px;
}
.dp-btn-active {
  color: var(--dp-accent) !important;
  background: var(--dp-accent-soft) !important;
}
.dp-speed-btn {
  font-variant-numeric: tabular-nums;
  min-width: 2.4em;
  text-align: center;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
}
.dp-icon {
  display: inline-block;
  width: 0.9em;
  text-align: center;
  color: var(--dp-accent);
  font-weight: 700;
}
.dp-badge {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dp-text-muted);
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--dp-border);
  border-radius: 999px;
}
</style>
