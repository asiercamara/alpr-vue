<!--
  DiagramViewportMap.vue
  ==================================================================
  Minimap overlay for DiagramPresenter — shown inside the fullscreen
  modal when the user has zoomed in beyond the fit level.

  Displays a thumbnail frame sized to the SVG aspect ratio and
  overlays a highlighted rectangle showing the currently visible
  viewport area. Purely informational: no pointer interaction.

  Props:
    viewportNorm  ({nx,ny,nw,nh})  Normalised viewport rect (0..1).
    svgW          (number)         SVG natural width from viewBox (px).
    svgH          (number)         SVG natural height from viewBox (px).
    visible       (boolean)        Whether to show the overlay.
-->
<template>
  <Transition name="dp-vmap">
    <div v-if="visible && svgW > 0 && svgH > 0" class="dp-vmap" aria-hidden="true">
      <div class="dp-vmap-inner">
        <!-- Thumbnail frame — respects the SVG aspect ratio -->
        <div class="dp-vmap-frame" :style="frameStyle">
          <!-- Scaled-down SVG clone so the full diagram is visible -->
          <div ref="svgContainer" class="dp-vmap-svg" :style="svgScaleStyle" />

          <!-- Dot grid over the thumbnail for a subtle canvas texture -->
          <div class="dp-vmap-grid" />

          <!-- Viewport rectangle -->
          <div class="dp-vmap-viewport" :style="viewportStyle" />
        </div>

        <!-- Tiny zoom label -->
        <div class="dp-vmap-label">{{ zoomPercent }}</div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'

/** Maximum minimap frame dimensions in pixels. */
const MAX_W = 144
const MAX_H = 96

const props = defineProps({
  /** Normalised viewport rectangle { nx, ny, nw, nh } (0..1 each). */
  viewportNorm: { type: Object, required: true },
  /** SVG natural width in pixels (from viewBox). */
  svgW: { type: Number, required: true },
  /** SVG natural height in pixels (from viewBox). */
  svgH: { type: Number, required: true },
  /** The live SVG DOM element to clone as the thumbnail. */
  svgEl: { type: Object, default: null },
  /** Current zoom level — used for the label only. */
  zoom: { type: Number, default: 1 },
  /** Whether the minimap is visible. */
  visible: { type: Boolean, default: false },
})

const svgContainer = ref(null)

/**
 * Pixel dimensions of the thumbnail frame, preserving the SVG aspect ratio
 * within the MAX_W × MAX_H bounding box.
 */
const frameSize = computed(() => {
  const aspect = props.svgW / props.svgH
  const maxAspect = MAX_W / MAX_H
  if (aspect >= maxAspect) {
    return { w: MAX_W, h: Math.round(MAX_W / aspect) }
  }
  return { w: Math.round(MAX_H * aspect), h: MAX_H }
})

const frameStyle = computed(() => ({
  width: `${frameSize.value.w}px`,
  height: `${frameSize.value.h}px`,
}))

/**
 * Scale the SVG clone down to fill the thumbnail frame.
 * The SVG renders at its natural size inside a wrapper that is then
 * shrunk via CSS transform so the whole diagram fits the frame.
 */
const svgScaleStyle = computed(() => {
  if (props.svgW <= 0 || props.svgH <= 0) return {}
  const scale = Math.min(frameSize.value.w / props.svgW, frameSize.value.h / props.svgH)
  return {
    width: `${props.svgW}px`,
    height: `${props.svgH}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }
})

/** Position the viewport rectangle using CSS percentages over the frame. */
const viewportStyle = computed(() => {
  const { nx, ny, nw, nh } = props.viewportNorm
  return {
    left: `${nx * 100}%`,
    top: `${ny * 100}%`,
    width: `${nw * 100}%`,
    height: `${nh * 100}%`,
  }
})

/** Formatted zoom label, e.g. "2.4×". */
const zoomPercent = computed(() => `${props.zoom.toFixed(1)}×`)

/**
 * Clone the live SVG into the thumbnail container whenever the minimap
 * becomes visible or the source element changes.
 * Using a clone keeps the thumbnail static (no live GSAP updates) and
 * avoids duplicate-ID issues with filters/gradients in complex diagrams.
 */
watch([() => props.svgEl, () => props.visible], async ([el, vis]) => {
  await nextTick()
  if (!svgContainer.value) return
  svgContainer.value.innerHTML = ''
  if (!el || !vis) return
  const clone = el.cloneNode(true)
  clone.setAttribute('width', String(props.svgW))
  clone.setAttribute('height', String(props.svgH))
  clone.style.display = 'block'
  svgContainer.value.appendChild(clone)
})
</script>

<style scoped>
/* ================================================================
 * Wrapper — positioned in the bottom-right of the modal figure,
 * above the hint footer (≈ 36 px tall). Sits outside the stage
 * div (which has overflow:hidden) so it is never clipped.
 * ================================================================ */
.dp-vmap {
  position: absolute;
  bottom: 50px;
  right: 14px;
  z-index: 10;
  pointer-events: none;
  /* Glass card */
  background: color-mix(in srgb, var(--dp-bg) 82%, transparent);
  border: 1px solid color-mix(in srgb, var(--dp-border) 75%, transparent);
  border-radius: 10px;
  padding: 6px;
  backdrop-filter: blur(10px) saturate(1.4);
  -webkit-backdrop-filter: blur(10px) saturate(1.4);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.35),
    0 0 0 0.5px rgba(255, 255, 255, 0.06) inset;
}

.dp-vmap-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

/* ================================================================
 * Thumbnail frame
 * ================================================================ */
.dp-vmap-frame {
  position: relative;
  border-radius: 5px;
  overflow: hidden;
  background: color-mix(in srgb, var(--dp-text) 5%, var(--dp-bg));
  border: 1px solid color-mix(in srgb, var(--dp-border) 60%, transparent);
  flex-shrink: 0;
}

/* ================================================================
 * SVG clone container — scaled down to fill the frame
 * ================================================================ */
.dp-vmap-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  /* Children (the SVG) are naturally sized; the transform scales them down */
}

.dp-vmap-svg :deep(svg) {
  display: block;
  max-width: none !important;
}

/* ================================================================
 * Dot-grid — gives a gentle sense of the canvas extent
 * ================================================================ */
.dp-vmap-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    circle,
    color-mix(in srgb, var(--dp-text-muted) 35%, transparent) 0.6px,
    transparent 0
  );
  background-size: 8px 8px;
  pointer-events: none;
}

/* ================================================================
 * Viewport rectangle
 * ================================================================ */
.dp-vmap-viewport {
  position: absolute;
  border-radius: 3px;
  border: 1.5px solid var(--dp-accent);
  background: color-mix(in srgb, var(--dp-accent) 18%, transparent);
  box-shadow:
    0 0 0 0.5px color-mix(in srgb, var(--dp-accent) 30%, transparent),
    0 0 6px color-mix(in srgb, var(--dp-accent) 25%, transparent);
  /* Minimum size so the rect stays visible even on extreme zoom */
  min-width: 6px;
  min-height: 6px;
}

/* Neon preset: brighter glow on the viewport rect */
:global(.dp-preset-neon) .dp-vmap-viewport {
  box-shadow:
    0 0 0 0.5px color-mix(in srgb, var(--dp-accent) 50%, transparent),
    0 0 8px color-mix(in srgb, var(--dp-accent) 50%, transparent);
}

/* ================================================================
 * Zoom label
 * ================================================================ */
.dp-vmap-label {
  font-size: 0.62rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: var(--dp-text-muted);
  line-height: 1;
  text-align: center;
}

/* ================================================================
 * Enter / leave transition
 * ================================================================ */
.dp-vmap-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dp-vmap-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.dp-vmap-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(4px);
}
.dp-vmap-leave-to {
  opacity: 0;
  transform: scale(0.92);
}

@media (prefers-reduced-motion: reduce) {
  .dp-vmap-enter-active,
  .dp-vmap-leave-active {
    transition: opacity 0.12s ease;
  }
  .dp-vmap-enter-from,
  .dp-vmap-leave-to {
    transform: none;
  }
}
</style>
