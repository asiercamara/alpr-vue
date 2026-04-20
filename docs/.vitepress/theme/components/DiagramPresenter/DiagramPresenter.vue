<!--
  DiagramPresenter — index.vue
  ==================================================================
  VitePress component that elevates Mermaid diagrams to presentation
  quality, backed by GSAP timelines and a type-aware adapter system.

  Architecture (all files live in this same DiagramPresenter/ folder):
    index.vue               ← this file — orchestrator only
    DiagramToolbar.vue      ← shared toolbar (inline + modal)
    diagram-adapters.js     ← adapter registry (flowchart, sequence, …)
    useRenderer.js          ← mermaid initialization + SVG rendering
    usePlayback.js          ← GSAP timeline, playback actions, highlight
    useModalZoom.js         ← fullscreen modal, pan, zoom, drag
    useIntersectionAutoplay.js  ← one-shot IntersectionObserver

  Dependencies:
    - mermaid        (already installed via vitepress-mermaid-renderer)
    - gsap           (pnpm add gsap)

  Usage in markdown:
    Add a script setup block with your Mermaid code as a template literal,
    then use DiagramPresenter with :code binding, preset, autoPlay, and highlight props.

  Props:
    code          (string, required)    Mermaid source
    preset        (string, 'auto')      'auto' | 'soft' | 'neon'
    controls      (boolean, true)       Show animation toolbar
    showBadge     (boolean, false)      Show adapter name badge (useful for debugging)
    autoPlay      (string, 'none')      'none' | 'nodes' | 'edges' | 'all' | 'intersect'
    highlight     (string[], [])        Node keys to animate after playback completes
    highlightMode (string, 'pulse')     'pulse' (3 cycles, then off) | 'glow' (persistent)
    speed         (string, 'normal')    'slow' | 'normal' | 'fast'  (runtime-changeable via toolbar)
    loop          (boolean, false)      Replay animation continuously (runtime-toggleable)
    caption       (string, '')          Optional figcaption text shown below the diagram
    timing        (object, {...})       Duration overrides in seconds (base values, before speed multiplier)

  Public API (via defineExpose):
    play()          — runs "full flow"
    playNodes()
    playEdges()
    pause()
    resume()
    togglePause()
    reset()
    seek(0..1)      — move timeline to a progress point
    setSpeed(s)     — programmatically set speed: 'slow' | 'normal' | 'fast'
    setLoop(v)      — programmatically enable/disable loop
    getTimeline()   — raw GSAP timeline for power users
    getAdapter()    — name of the active adapter
-->
<template>
  <figure
    class="dp-root"
    :class="[
      `dp-preset-${resolvedPreset}`,
      { 'dp-is-playing': isPlaying, 'dp-is-paused': isPaused },
    ]"
  >
    <DiagramToolbar
      v-if="controls"
      :can-start="canStart"
      :is-playing="isPlaying"
      :is-paused="isPaused"
      :speed-label="speedLabel"
      :current-speed="currentSpeed"
      :is-looping="isLooping"
      :show-badge="showBadge"
      :adapter-label="adapterLabel"
      :ready="ready"
      :is-modal="false"
      @play="playAll"
      @cycle-speed="cycleSpeed"
      @toggle-pause="togglePause"
      @toggle-loop="isLooping = !isLooping"
      @reset="reset"
      @maximize="openMaximized"
    />

    <div
      v-if="controls && (isPlaying || progress > 0)"
      class="dp-progress"
      role="progressbar"
      :aria-valuenow="Math.round(progress * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="dp-progress-bar" :style="{ width: `${progress * 100}%` }" />
    </div>

    <div
      ref="container"
      class="dp-stage"
      aria-live="polite"
      title="Doble clic para maximizar"
      @dblclick="openMaximized"
    />

    <figcaption v-if="caption" class="dp-caption">{{ caption }}</figcaption>
  </figure>

  <!-- Fullscreen modal — teleported to body so it escapes any overflow/z-index -->
  <Teleport to="body">
    <Transition name="dp-modal">
      <div
        v-if="isMaximized"
        class="dp-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Diagrama maximizado"
        @click.self="closeMaximized"
      >
        <figure
          class="dp-modal-figure dp-root"
          :class="`dp-preset-${resolvedPreset}`"
          @wheel="onModalWheel"
        >
          <DiagramToolbar
            :can-start="canStart"
            :is-playing="isPlaying"
            :is-paused="isPaused"
            :speed-label="speedLabel"
            :current-speed="currentSpeed"
            :is-looping="isLooping"
            :show-badge="showBadge"
            :adapter-label="adapterLabel"
            :ready="ready"
            :is-modal="true"
            @play="playAll"
            @cycle-speed="cycleSpeed"
            @toggle-pause="togglePause"
            @toggle-loop="isLooping = !isLooping"
            @reset="reset"
            @reset-zoom="resetZoom"
            @close="closeMaximized"
          />

          <!-- Progress bar (modal) -->
          <div
            v-if="isPlaying || progress > 0"
            class="dp-progress"
            role="progressbar"
            :aria-valuenow="Math.round(progress * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="dp-progress-bar" :style="{ width: `${progress * 100}%` }" />
          </div>

          <!-- Stage: hosts the SVG (moved from inline container while modal is open) -->
          <div
            ref="modalContainer"
            class="dp-stage dp-modal-stage"
            :style="{ cursor: isPinching ? 'default' : isDragging ? 'grabbing' : 'grab' }"
            @pointerdown="onStagePointerDown"
            @pointermove="onStagePointerMove"
            @pointerup="onStagePointerUp"
            @pointercancel="onStagePointerUp"
          >
            <div
              class="dp-modal-canvas"
              :style="{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: '50% 50%',
                transition: isDragging || isPinching ? 'none' : undefined,
              }"
            />
          </div>

          <!-- Zoom hint -->
          <footer class="dp-modal-hint">
            <span
              >Pellizca o rueda para zoom · Arrastra para mover · <kbd>Esc</kbd> para cerrar</span
            >
          </footer>
        </figure>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useData } from 'vitepress'
import DiagramToolbar from './DiagramToolbar.vue'
import { useRenderer } from './useRenderer.js'
import { usePlayback } from './usePlayback.js'
import { useModalZoom } from './useModalZoom.js'
import { useIntersectionAutoplay } from './useIntersectionAutoplay.js'

const props = defineProps({
  code: { type: String, required: true },
  preset: { type: String, default: 'auto' }, // 'auto' | 'soft' | 'neon'
  controls: { type: Boolean, default: true },
  showBadge: { type: Boolean, default: false },
  autoPlay: { type: String, default: 'none' }, // 'none' | 'nodes' | 'edges' | 'all' | 'intersect'
  highlight: { type: Array, default: () => [] },
  highlightMode: { type: String, default: 'pulse' }, // 'pulse' | 'glow'
  speed: { type: String, default: 'normal' }, // 'slow' | 'normal' | 'fast'
  loop: { type: Boolean, default: false },
  caption: { type: String, default: '' },
  timing: {
    type: Object,
    default: () => ({
      nodeDuration: 0.45,
      nodeStagger: 0.11,
      edgeDuration: 0.7,
      edgeStagger: 0.09,
      levelGap: 0.1,
    }),
  },
})

const emit = defineEmits(['ready', 'play-start', 'play-complete'])

const { isDark } = useData()

/* ----------------------------------------------------------------
 * Stage refs
 * ---------------------------------------------------------------- */
const container = ref(null)
const modalContainer = ref(null)

/* ----------------------------------------------------------------
 * Local reactive state
 * ---------------------------------------------------------------- */
const ready = ref(false)
const adapterLabel = ref('')

/** Resolved preset: 'auto' follows VitePress dark mode. */
const resolvedPreset = computed(() => {
  if (props.preset !== 'auto') return props.preset
  return isDark.value ? 'neon' : 'soft'
})

const canStart = computed(() => ready.value && !isPlaying.value)

/* ----------------------------------------------------------------
 * Composables
 * ---------------------------------------------------------------- */

let adapter = null

const {
  isMaximized,
  zoom,
  panX,
  panY,
  isDragging,
  isPinching,
  openMaximized,
  closeMaximized,
  resetZoom,
  onModalWheel,
  onStagePointerDown,
  onStagePointerMove,
  onStagePointerUp,
  cleanupListeners,
} = useModalZoom({ container, modalContainer })

const {
  currentSpeed,
  speedLabel,
  isLooping,
  isPlaying,
  isPaused,
  progress,
  timeline,
  cycleSpeed,
  setPrepared,
  playAll,
  playNodes,
  playEdges,
  togglePause,
  seek,
  killTimeline,
  killHighlightTweens,
  pulseHighlighted,
} = usePlayback({
  container,
  props,
  emitPlayStart: () => emit('play-start'),
  emitPlayComplete: () => emit('play-complete'),
})

const { setupIntersectionObserver, teardownIntersectionObserver } = useIntersectionAutoplay()

const { render } = useRenderer({
  container,
  modalContainer,
  isDark,
  isMaximized,
  props,
  state: { ready, adapterLabel },
  onAdapterReady(resolvedAdapter, prepared) {
    adapter = resolvedAdapter
    setPrepared(prepared, ready)
    killTimeline()
    killHighlightTweens()
    teardownIntersectionObserver()
  },
  onAutoPlay(mode) {
    if (mode === 'nodes') playNodes()
    else if (mode === 'edges') playEdges()
    else if (mode === 'all') playAll()
    else if (mode === 'intersect') setupIntersectionObserver(container, () => playAll())
    else if (props.highlight?.length) pulseHighlighted()
  },
  emitReady: (payload) => emit('ready', payload),
})

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */
onMounted(render)
onBeforeUnmount(() => {
  if (isMaximized.value) closeMaximized()
  killTimeline()
  killHighlightTweens()
  teardownIntersectionObserver()
  cleanupListeners()
})
watch(() => props.code, render)
watch(() => props.preset, render)
watch(isDark, render)
watch(
  () => props.highlight,
  () => {
    if (ready.value && props.highlight?.length) pulseHighlighted()
  },
  { deep: true },
)

/* ----------------------------------------------------------------
 * Reset — re-render from scratch
 * ---------------------------------------------------------------- */
function reset() {
  render()
}

/* ----------------------------------------------------------------
 * Public API
 * ---------------------------------------------------------------- */
defineExpose({
  play: playAll,
  playNodes,
  playEdges,
  pause: () => timeline.value?.pause(),
  resume: () => timeline.value?.resume(),
  togglePause,
  reset,
  seek,
  setSpeed: (s) => {
    currentSpeed.value = s
  },
  setLoop: (v) => {
    isLooping.value = v
  },
  getTimeline: () => timeline.value,
  getAdapter: () => adapter?.name,
})
</script>

<style scoped>
/* ================================================================
 * Tokens — override per preset via CSS vars
 * ================================================================ */
.dp-root {
  --dp-radius: 14px;
  --dp-bg: var(--vp-c-bg-soft, #f6f8fa);
  --dp-bg-raised: var(--vp-c-bg-elv, #ffffff);
  --dp-border: var(--vp-c-divider, rgba(60, 60, 60, 0.12));
  --dp-text: var(--vp-c-text-1, #1f2937);
  --dp-text-muted: var(--vp-c-text-2, #64748b);
  --dp-accent: var(--vp-c-brand-1, #3451b2);
  --dp-accent-soft: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.1));

  --dp-process-fill: var(--dp-bg-raised);
  --dp-process-stroke: var(--dp-accent);
  --dp-decision-fill: color-mix(in srgb, #eab308 10%, var(--dp-bg-raised));
  --dp-decision-stroke: #eab308;
  --dp-terminus-fill: color-mix(in srgb, #8b5cf6 10%, var(--dp-bg-raised));
  --dp-terminus-stroke: #8b5cf6;

  --dp-edge: var(--dp-accent);
  --dp-edge-label-bg: var(--dp-bg-raised);

  margin: 1.5rem 0;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius);
  background: var(--dp-bg);
  color: var(--dp-text);
  overflow: hidden;
  font-family: var(--vp-font-family-base), Inter, system-ui, sans-serif;
  position: relative;
}

/* ----------------------------------------------------------------
   Preset: soft — clean, product-style with subtle depth
   ---------------------------------------------------------------- */
.dp-preset-soft {
  --dp-process-fill: linear-gradient(
    145deg,
    color-mix(in srgb, var(--dp-accent) 8%, var(--dp-bg-raised)),
    var(--dp-bg-raised)
  );
}

/* ----------------------------------------------------------------
   Preset: neon — deep dark, high-contrast cyan/violet
   ---------------------------------------------------------------- */
.dp-preset-neon {
  --dp-bg: #0b1030;
  --dp-bg-raised: #141c42;
  --dp-border: rgba(148, 163, 220, 0.18);
  --dp-text: #eaf0ff;
  --dp-text-muted: #8b95c5;
  --dp-accent: #67e8f9;
  --dp-accent-soft: rgba(103, 232, 249, 0.14);

  --dp-process-fill: #141c42;
  --dp-process-stroke: #67e8f9;
  --dp-decision-fill: #2a1f08;
  --dp-decision-stroke: #fbbf24;
  --dp-terminus-fill: #1f1440;
  --dp-terminus-stroke: #a78bfa;

  --dp-edge: #a78bfa;
  --dp-edge-label-bg: rgba(14, 21, 48, 0.92);
}

/* ================================================================
 * Progress bar
 * ================================================================ */
.dp-progress {
  height: 2px;
  background: var(--dp-border);
  overflow: hidden;
}
.dp-progress-bar {
  height: 100%;
  background: var(--dp-accent);
  transition: width 0.05s linear;
}

/* ================================================================
 * Stage + SVG styling
 * ================================================================ */
.dp-stage {
  padding: 1.25rem;
  background:
    radial-gradient(
      ellipse at top,
      color-mix(in srgb, var(--dp-accent) 6%, transparent),
      transparent 70%
    ),
    var(--dp-bg);
  display: grid;
  place-items: center;
  min-height: 260px;
  overflow: auto;
  cursor: zoom-in;
}
.dp-preset-neon .dp-stage {
  background:
    radial-gradient(ellipse at top, rgba(103, 232, 249, 0.06), transparent 60%),
    radial-gradient(ellipse at bottom right, rgba(167, 139, 250, 0.05), transparent 50%),
    var(--dp-bg);
}

.dp-root :deep(svg) {
  max-width: 100%;
  height: auto;
  color: var(--dp-text);
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.08));
}
.dp-preset-neon :deep(svg) {
  filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.35));
}

/* Default node styling (process) */
.dp-root :deep(svg g.node > rect),
.dp-root :deep(svg g.node > polygon),
.dp-root :deep(svg g.node > circle),
.dp-root :deep(svg g.node > ellipse) {
  fill: var(--dp-process-fill);
  stroke: var(--dp-process-stroke);
  stroke-width: 1.6;
  rx: 10;
  ry: 10;
  transition: filter 0.2s;
}
.dp-root :deep(svg g.node[data-dp-kind='decision'] > polygon),
.dp-root :deep(svg g.node[data-dp-kind='decision'] > rect) {
  fill: var(--dp-decision-fill);
  stroke: var(--dp-decision-stroke);
}
.dp-root :deep(svg g.node[data-dp-kind='terminus'] > rect),
.dp-root :deep(svg g.node[data-dp-kind='terminus'] > circle),
.dp-root :deep(svg g.node[data-dp-kind='terminus'] > ellipse) {
  fill: var(--dp-terminus-fill);
  stroke: var(--dp-terminus-stroke);
}

.dp-root :deep(svg g.node:hover > rect),
.dp-root :deep(svg g.node:hover > polygon),
.dp-root :deep(svg g.node:hover > circle),
.dp-root :deep(svg g.node:hover > ellipse) {
  filter: brightness(1.1);
}

/* Node label text — !important required to pierce foreignObject HTML context */
.dp-root :deep(svg g.node foreignObject) {
  overflow: visible;
}
.dp-root :deep(svg g.node foreignObject div),
.dp-root :deep(svg g.node foreignObject span),
.dp-root :deep(svg g.node foreignObject p) {
  color: var(--dp-text) !important;
  font-family: Inter, 'Segoe UI', system-ui, sans-serif !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  line-height: 1.4 !important;
  text-align: center !important;
  word-break: normal !important;
  overflow-wrap: break-word !important;
  hyphens: none !important; /* no CSS hyphenation — Mermaid wraps at word boundaries */
  white-space: normal !important;
  background: transparent !important;
}
.dp-root :deep(svg g.node .label),
.dp-root :deep(svg g.node .nodeLabel) {
  color: var(--dp-text);
  fill: var(--dp-text);
  font-weight: 700;
  font-size: 14px;
}

/* Edges */
.dp-root :deep(svg .edgePath path),
.dp-root :deep(svg path.flowchart-link),
.dp-root :deep(svg path.transition) {
  stroke: var(--dp-edge);
  stroke-width: 1.8;
  fill: none;
}
.dp-preset-neon :deep(svg .edgePath path),
.dp-preset-neon :deep(svg path.flowchart-link),
.dp-preset-neon :deep(svg path.transition) {
  stroke-width: 2.2;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--dp-edge) 40%, transparent));
}
.dp-root :deep(svg marker path),
.dp-root :deep(svg .arrowheadPath),
.dp-root :deep(svg .marker path) {
  fill: var(--dp-edge);
  stroke: var(--dp-edge);
}

/* Edge labels as pills
 * NOTE: foreignObject creates a separate HTML context — !important is required
 * to override Mermaid's own inline/generated styles that set color/background. */
.dp-root :deep(svg .edgeLabel foreignObject) {
  overflow: visible;
}
.dp-root :deep(svg .edgeLabel foreignObject div),
.dp-root :deep(svg .edgeLabel foreignObject span),
.dp-root :deep(svg .edgeLabel foreignObject p) {
  color: var(--dp-text) !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  font-family: Inter, system-ui, sans-serif !important;
  border-radius: 999px !important;
  background: var(--dp-edge-label-bg) !important;
  border: 1px solid var(--dp-border) !important;
  white-space: nowrap !important;
  display: inline-block !important;
}
/* Hide any rect/path that Mermaid renders as label background (redundant with our pill) */
.dp-root :deep(svg .edgeLabel rect),
.dp-root :deep(svg .edgeLabel > g > path) {
  display: none !important;
}

/* Sequence diagram actor boxes */
.dp-root :deep(svg .actor rect),
.dp-root :deep(svg .actor-top rect),
.dp-root :deep(svg .actor-bottom rect) {
  fill: var(--dp-process-fill);
  stroke: var(--dp-process-stroke);
  stroke-width: 1.6;
}
.dp-root :deep(svg .actor text) {
  fill: var(--dp-text);
  font-weight: 600;
}
.dp-root :deep(svg .messageLine0),
.dp-root :deep(svg .messageLine1) {
  stroke: var(--dp-edge);
  stroke-width: 1.8;
}
.dp-root :deep(svg .messageText) {
  fill: var(--dp-text);
}
.dp-root :deep(svg .note rect) {
  fill: var(--dp-decision-fill);
  stroke: var(--dp-decision-stroke);
  stroke-width: 1.4;
}
.dp-root :deep(svg .noteText) {
  fill: var(--dp-text);
}

/* Error display */
.dp-error {
  color: #ef4444;
  padding: 1rem;
  font-family: ui-monospace, monospace;
  white-space: pre-wrap;
}

/* ================================================================
 * Maximize modal — true fullscreen overlay
 * ================================================================ */
.dp-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: stretch;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.dp-modal-figure {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: 0;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.dp-modal-stage {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  user-select: none;
}

.dp-modal-canvas {
  /* GSAP will animate the SVG child; this wrapper handles CSS transform for pan/zoom */
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
  transition: transform 0.04s linear;
}

.dp-modal-canvas :deep(svg) {
  max-width: none !important;
  display: block;
}

.dp-modal-hint {
  flex-shrink: 0;
  padding: 0.4rem 0.75rem;
  font-size: 0.72rem;
  color: var(--dp-text-muted);
  text-align: center;
  border-top: 1px solid var(--dp-border);
  background: var(--dp-bg);
  letter-spacing: 0.02em;
}

.dp-modal-hint kbd {
  display: inline-block;
  padding: 0.05em 0.35em;
  font-size: 0.85em;
  border: 1px solid var(--dp-border);
  border-radius: 4px;
  background: var(--dp-bg-raised);
  font-family: ui-monospace, monospace;
}

/* ================================================================
 * Figcaption
 * ================================================================ */
.dp-caption {
  padding: 0.4rem 1.25rem 0.6rem;
  font-size: 0.82rem;
  color: var(--dp-text-muted);
  text-align: center;
  border-top: 1px solid var(--dp-border);
  font-style: italic;
  line-height: 1.5;
}

/* Highlight animation is handled entirely by GSAP in pulseHighlighted().
   No CSS class rules are needed here. */

.dp-modal-enter-active,
.dp-modal-leave-active {
  transition:
    opacity 0.22s ease,
    backdrop-filter 0.22s ease;
}
.dp-modal-enter-active .dp-modal-figure,
.dp-modal-leave-active .dp-modal-figure {
  transition:
    transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.22s ease;
}
.dp-modal-enter-from,
.dp-modal-leave-to {
  opacity: 0;
}
.dp-modal-enter-from .dp-modal-figure {
  transform: scale(0.93) translateY(16px);
  opacity: 0;
}
.dp-modal-leave-to .dp-modal-figure {
  transform: scale(0.96);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .dp-root :deep(svg) {
    transition: none !important;
  }
  .dp-modal-enter-active,
  .dp-modal-leave-active,
  .dp-modal-enter-active .dp-modal-figure,
  .dp-modal-leave-active .dp-modal-figure {
    transition: none !important;
  }
}
</style>
