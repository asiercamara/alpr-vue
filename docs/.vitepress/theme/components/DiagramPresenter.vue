<!--
  DiagramPresenter.vue
  ==================================================================
  VitePress component that elevates Mermaid diagrams to presentation
  quality, backed by GSAP timelines and a type-aware adapter system.

  Dependencies:
    - mermaid        (already installed via vitepress-mermaid-renderer)
    - gsap           (pnpm add gsap)
    - ./diagram-adapters.js  (ships next to this component)

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
    <header v-if="controls" class="dp-toolbar">
      <div class="dp-controls" role="group" aria-label="Controles de animación">
        <button type="button" class="dp-btn dp-btn-primary" :disabled="!canStart" @click="playAll">
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
          @click="cycleSpeed"
        >
          {{ speedLabel }}
        </button>
        <!-- Loop toggle -->
        <button
          type="button"
          class="dp-btn dp-btn-ghost"
          :class="{ 'dp-btn-active': isLooping }"
          title="Bucle continuo"
          @click="isLooping = !isLooping"
        >
          ⟲
        </button>
        <button
          v-if="isPlaying"
          type="button"
          class="dp-btn dp-btn-ghost"
          :title="isPaused ? 'Reanudar' : 'Pausar'"
          @click="togglePause"
        >
          {{ isPaused ? '▶' : '❚❚' }}
        </button>
        <button
          type="button"
          class="dp-btn dp-btn-ghost"
          :disabled="!ready || isPlaying"
          title="Reiniciar"
          @click="reset"
        >
          ↺
        </button>
        <button
          type="button"
          class="dp-btn dp-btn-ghost"
          :disabled="!ready"
          title="Maximizar"
          aria-label="Ver diagrama maximizado"
          @click="openMaximized"
        >
          ⛶
        </button>
      </div>
    </header>

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
          @wheel.passive="onModalWheel"
          @pointerdown="onModalPointerDown"
        >
          <!-- Modal toolbar -->
          <header class="dp-toolbar dp-modal-toolbar">
            <div class="dp-controls" role="group" aria-label="Controles de animación">
              <button
                type="button"
                class="dp-btn dp-btn-primary"
                :disabled="!canStart"
                @click="playAll"
              >
                <span class="dp-icon" aria-hidden="true">▶</span>
                <span>Reproducir</span>
              </button>
            </div>
            <div class="dp-toolbar-right">
              <span v-if="showBadge && adapterLabel" class="dp-badge">{{ adapterLabel }}</span>
              <button
                type="button"
                class="dp-btn dp-btn-ghost dp-speed-btn"
                :class="{ 'dp-btn-active': currentSpeed !== 'normal' }"
                :title="`Velocidad: ${speedLabel}`"
                @click="cycleSpeed"
              >
                {{ speedLabel }}
              </button>
              <button
                type="button"
                class="dp-btn dp-btn-ghost"
                :class="{ 'dp-btn-active': isLooping }"
                title="Bucle continuo"
                @click="isLooping = !isLooping"
              >
                ⟲
              </button>
              <button
                v-if="isPlaying"
                type="button"
                class="dp-btn dp-btn-ghost"
                :title="isPaused ? 'Reanudar' : 'Pausar'"
                @click="togglePause"
              >
                {{ isPaused ? '▶' : '❚❚' }}
              </button>
              <button
                type="button"
                class="dp-btn dp-btn-ghost"
                :disabled="!ready || isPlaying"
                title="Reiniciar"
                @click="reset"
              >
                ↺
              </button>
              <button
                type="button"
                class="dp-btn dp-btn-ghost"
                title="Restablecer zoom"
                @click="resetZoom"
              >
                ⊙
              </button>
              <button
                type="button"
                class="dp-btn dp-btn-ghost"
                title="Cerrar (Esc)"
                aria-label="Cerrar diagrama maximizado"
                @click="closeMaximized"
              >
                ✕
              </button>
            </div>
          </header>

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
            :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
          >
            <div
              class="dp-modal-canvas"
              :style="{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: '50% 50%',
              }"
            />
          </div>

          <!-- Zoom hint -->
          <footer class="dp-modal-hint">
            <span>Rueda para hacer zoom · Arrastra para mover · <kbd>Esc</kbd> para cerrar</span>
          </footer>
        </figure>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import mermaid from 'mermaid'
import { gsap } from 'gsap'
import { useData } from 'vitepress'
import { pickAdapter } from './diagram-adapters.js'

const props = defineProps({
  code: { type: String, required: true },
  preset: { type: String, default: 'auto' }, // 'auto' | 'soft' | 'neon'
  controls: { type: Boolean, default: true },
  showBadge: { type: Boolean, default: false },
  autoPlay: { type: String, default: 'none' }, // 'none' | 'nodes' | 'edges' | 'all' | 'intersect'
  highlight: { type: Array, default: () => [] }, // node keys to pulse after playback
  highlightMode: { type: String, default: 'pulse' }, // 'pulse' (3 cycles) | 'glow' (persistent)
  speed: { type: String, default: 'normal' }, // 'slow' | 'normal' | 'fast'
  loop: { type: Boolean, default: false }, // replay animation continuously
  caption: { type: String, default: '' }, // optional figcaption below the diagram
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

const container = ref(null)
const ready = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const progress = ref(0)
const adapterLabel = ref('')

const timeline = shallowRef(null)
let adapter = null
let prepared = null
let loopTimer = null
let highlightTweens = []

/* Speed + loop runtime state (initialized from props, mutable via toolbar) */
const currentSpeed = ref(props.speed)
const isLooping = ref(props.loop)

const SPEED_CYCLE = ['slow', 'normal', 'fast']
const SPEED_LABELS = { slow: '½×', normal: '1×', fast: '2×' }
const SPEED_FACTORS = { slow: 2.2, normal: 1, fast: 0.35 }

const speedLabel = computed(() => SPEED_LABELS[currentSpeed.value] ?? '1×')

function cycleSpeed() {
  const idx = SPEED_CYCLE.indexOf(currentSpeed.value)
  currentSpeed.value = SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length]
}

function getEffectiveTiming() {
  const m = SPEED_FACTORS[currentSpeed.value] ?? 1
  const t = props.timing
  return {
    nodeDuration: t.nodeDuration * m,
    nodeStagger: t.nodeStagger * m,
    edgeDuration: t.edgeDuration * m,
    edgeStagger: t.edgeStagger * m,
    levelGap: t.levelGap * m,
  }
}

/* ================================================================
 * Maximize / fullscreen modal
 * ================================================================ */
const modalContainer = ref(null)
const isMaximized = ref(false)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)

let dragStartX = 0
let dragStartY = 0
let dragStartPanX = 0
let dragStartPanY = 0

function openMaximized() {
  isMaximized.value = true
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', handleModalKey)
  nextTick(() => {
    // Move the SVG DOM node into the modal canvas so GSAP refs remain valid
    const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
    const svgEl = container.value?.querySelector('svg')
    if (canvas && svgEl) canvas.appendChild(svgEl)
  })
}

function closeMaximized() {
  // Move SVG back to inline container
  const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
  const svgEl = canvas?.querySelector('svg')
  if (svgEl && container.value) container.value.appendChild(svgEl)
  isMaximized.value = false
  document.body.style.overflow = ''
  document.removeEventListener('keydown', handleModalKey)
}

function handleModalKey(e) {
  if (e.key === 'Escape') closeMaximized()
}

function resetZoom() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

/** Scroll-wheel zoom centered on the cursor position */
function onModalWheel(e) {
  e.preventDefault()
  const delta = -e.deltaY * 0.001
  const factor = Math.exp(delta * 2.5)
  const next = Math.min(Math.max(zoom.value * factor, 0.25), 8)
  // Adjust pan so zoom is centered on pointer
  const rect = e.currentTarget.getBoundingClientRect()
  const ox = e.clientX - rect.left - rect.width / 2
  const oy = e.clientY - rect.top - rect.height / 2
  panX.value = ox + (panX.value - ox) * (next / zoom.value)
  panY.value = oy + (panY.value - oy) * (next / zoom.value)
  zoom.value = next
}

function onModalPointerDown(e) {
  if (e.button !== 0) return
  isDragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartPanX = panX.value
  dragStartPanY = panY.value
  window.addEventListener('pointermove', onModalPointerMove)
  window.addEventListener('pointerup', onModalPointerUp, { once: true })
}

function onModalPointerMove(e) {
  if (!isDragging.value) return
  panX.value = dragStartPanX + (e.clientX - dragStartX)
  panY.value = dragStartPanY + (e.clientY - dragStartY)
}

function onModalPointerUp() {
  isDragging.value = false
  window.removeEventListener('pointermove', onModalPointerMove)
}

/** Resolved preset: 'auto' follows VitePress dark mode */
const resolvedPreset = computed(() => {
  if (props.preset !== 'auto') return props.preset
  return isDark.value ? 'neon' : 'soft'
})

const canStart = computed(() => ready.value && !isPlaying.value)

/* ================================================================
 * Intersection observer for autoPlay="intersect"
 * ================================================================ */
let intersectionObserver = null

function setupIntersectionObserver() {
  teardownIntersectionObserver()
  if (typeof IntersectionObserver === 'undefined') return

  let fired = false
  intersectionObserver = new IntersectionObserver(
    (entries) => {
      if (fired) return
      const entry = entries[0]
      if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
        fired = true
        teardownIntersectionObserver()
        // Small delay so the diagram is visually settled before animating
        setTimeout(() => playAll(), 100)
      }
    },
    { threshold: 0.3 },
  )

  // Observe the figure root for a larger intersection area
  const root = container.value?.closest('.dp-root') ?? container.value
  if (root) intersectionObserver.observe(root)
}

function teardownIntersectionObserver() {
  intersectionObserver?.disconnect()
  intersectionObserver = null
}

/* ================================================================
 * Lifecycle
 * ================================================================ */
onMounted(render)
onBeforeUnmount(() => {
  if (isMaximized.value) closeMaximized()
  killTimeline()
  killHighlightTweens()
  teardownIntersectionObserver()
  clearTimeout(loopTimer)
  window.removeEventListener('pointermove', onModalPointerMove)
})
watch(() => props.code, render)
watch(() => props.preset, render)
watch(isDark, render)
watch(
  () => props.highlight,
  () => {
    // Re-run highlight when the prop changes (e.g. parent updates the list)
    if (ready.value && props.highlight?.length) pulseHighlighted()
  },
  { deep: true },
)

/* ================================================================
 * Render — mermaid → SVG → adapter.prepare()
 * ================================================================ */
/** Returns concrete hex colors for mermaid themeVariables based on dark/preset. */
function getMermaidTheme(dark) {
  // Mermaid color parser only accepts real hex/rgb — no CSS vars or `currentColor`
  if (dark) {
    return {
      fontFamily: 'Inter, system-ui, sans-serif',
      primaryColor: '#1e293b',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#475569',
      lineColor: '#94a3b8',
      secondaryColor: '#0f172a',
      tertiaryColor: '#1e293b',
      background: '#0f172a',
      mainBkg: '#1e293b',
      nodeBorder: '#475569',
      clusterBkg: '#0f172a',
      titleColor: '#f1f5f9',
      edgeLabelBackground: '#1e293b',
      fontSize: '14px',
    }
  }
  return {
    fontFamily: 'Inter, system-ui, sans-serif',
    primaryColor: '#f1f5f9',
    primaryTextColor: '#1e293b',
    primaryBorderColor: '#94a3b8',
    lineColor: '#64748b',
    secondaryColor: '#e2e8f0',
    tertiaryColor: '#f8fafc',
    background: '#ffffff',
    mainBkg: '#f1f5f9',
    nodeBorder: '#94a3b8',
    clusterBkg: '#f8fafc',
    titleColor: '#0f172a',
    edgeLabelBackground: '#f8fafc',
    fontSize: '14px',
  }
}

async function render() {
  if (!container.value) return

  // If the SVG is currently in the modal canvas, move it back before re-rendering
  if (isMaximized.value) {
    const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
    const svgEl = canvas?.querySelector('svg')
    if (svgEl) container.value.appendChild(svgEl)
  }

  killTimeline()
  killHighlightTweens()
  teardownIntersectionObserver()
  ready.value = false
  progress.value = 0

  const dark = isDark.value
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    flowchart: {
      curve: 'basis',
      htmlLabels: true,
      nodeSpacing: 70,
      rankSpacing: 90,
      wrappingWidth: 320,
    },
    stateDiagram: { useMaxWidth: false },
    sequence: { useMaxWidth: false, mirrorActors: false },
    themeVariables: getMermaidTheme(dark),
  })

  try {
    const id = 'dp-' + Math.random().toString(36).slice(2, 10)
    const { svg } = await mermaid.render(id, props.code.trim())
    container.value.innerHTML = svg
    await nextTick()

    const svgEl = container.value.querySelector('svg')
    if (!svgEl) return

    svgEl.removeAttribute('style')
    svgEl.style.maxWidth = '100%'
    svgEl.style.height = 'auto'

    adapter = pickAdapter(svgEl)
    prepared = adapter.prepare(svgEl)
    adapterLabel.value = adapter.label || adapter.name

    ready.value = true
    emit('ready', {
      adapter: adapter.name,
      nodes: prepared.nodes.length,
      edges: prepared.edges.length,
      phases: prepared.phases.length,
    })

    if (props.autoPlay === 'nodes') playNodes()
    else if (props.autoPlay === 'edges') playEdges()
    else if (props.autoPlay === 'all') playAll()
    else if (props.autoPlay === 'intersect') setupIntersectionObserver()
    else if (props.highlight?.length) pulseHighlighted()

    // If the modal was open during a re-render, put the new SVG back in the modal canvas
    if (isMaximized.value) {
      await nextTick()
      const canvas = modalContainer.value?.querySelector('.dp-modal-canvas')
      const newSvg = container.value?.querySelector('svg')
      if (canvas && newSvg) canvas.appendChild(newSvg)
    }
  } catch (err) {
    container.value.innerHTML = `<pre class="dp-error">${escapeHtml(err?.message || String(err))}</pre>`
    console.error('[DiagramPresenter]', err)
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
}

/* ================================================================
 * Visual state helpers
 * ================================================================ */

function hideNodes() {
  if (!prepared) return
  gsap.set(prepared.nodes, { opacity: 0 })
}

function showAllNodes() {
  if (!prepared) return
  gsap.set(prepared.nodes, { opacity: 1 })
}

function hideEdges() {
  if (!prepared) return
  prepared.edges.forEach((e) => {
    const len = safeLength(e.path)
    if (!len) return
    e.path.style.strokeDasharray = len
    e.path.style.strokeDashoffset = len
    const me = e.path.getAttribute('marker-end')
    if (me && me !== 'none') {
      e.path.dataset.dpMarkerEnd = me
      e.path.setAttribute('marker-end', 'none')
    }
  })
  const labels = container.value?.querySelectorAll('svg .edgeLabel') || []
  gsap.set([...labels], { opacity: 0 })
}

function showAllEdges() {
  if (!prepared) return
  prepared.edges.forEach((e) => {
    e.path.style.strokeDasharray = 'none'
    e.path.style.strokeDashoffset = '0'
    restoreMarker(e.path)
  })
  const labels = container.value?.querySelectorAll('svg .edgeLabel') || []
  gsap.set([...labels], { opacity: 1 })
}

function restoreMarker(path) {
  if (path.dataset.dpMarkerEnd) {
    path.setAttribute('marker-end', path.dataset.dpMarkerEnd)
    delete path.dataset.dpMarkerEnd
  }
}

function safeLength(path) {
  try {
    return path.getTotalLength()
  } catch {
    return 0
  }
}

/* ================================================================
 * Timeline primitives
 * ================================================================ */

function tweenNodes(tl, elements, position) {
  if (!elements.length) return tl
  const t = getEffectiveTiming()
  tl.to(
    elements,
    {
      opacity: 1,
      duration: t.nodeDuration,
      stagger: t.nodeStagger,
      ease: 'power2.out',
    },
    position,
  )
  return tl
}

function tweenEdges(tl, paths, position) {
  const t = getEffectiveTiming()
  paths.forEach((path, i) => {
    const len = safeLength(path)
    if (!len) return
    tl.to(
      path,
      {
        strokeDashoffset: 0,
        duration: t.edgeDuration,
        ease: 'power2.inOut',
        onComplete: () => restoreMarker(path),
      },
      i === 0 ? position : `<+${t.edgeStagger}`,
    )
  })
  return tl
}

function tweenLabelsIn(tl, position) {
  const labels = [...(container.value?.querySelectorAll('svg .edgeLabel') || [])]
  if (!labels.length) return tl
  tl.to(labels, { opacity: 1, duration: 0.3, stagger: 0.04 }, position)
  return tl
}

/* ================================================================
 * Public playback actions
 * ================================================================ */

function playNodes() {
  if (!ready.value || isPlaying.value) return
  killTimeline()

  hideNodes()
  showAllEdges()

  const tl = gsap.timeline()
  tweenNodes(tl, prepared.nodes, 0)
  startTimeline(tl)
}

function playEdges() {
  if (!ready.value || isPlaying.value) return
  killTimeline()

  showAllNodes()
  hideEdges()

  const tl = gsap.timeline()
  tweenEdges(
    tl,
    prepared.edges.map((e) => e.path),
    0,
  )
  tweenLabelsIn(tl, '>-0.2')
  startTimeline(tl)
}

function playAll() {
  if (!ready.value || isPlaying.value) return
  killTimeline()

  hideNodes()
  hideEdges()

  const t = getEffectiveTiming()
  const tl = gsap.timeline()
  prepared.phases.forEach((phase, i) => {
    const pos = i === 0 ? 0 : `>-${t.levelGap}`
    if (phase.kind === 'nodes') tweenNodes(tl, phase.elements, pos)
    else if (phase.kind === 'edges') tweenEdges(tl, phase.elements, pos)
  })
  tweenLabelsIn(tl, '>-0.3')
  startTimeline(tl)
}

/* ================================================================
 * Timeline orchestration
 * ================================================================ */

function startTimeline(tl) {
  tl.eventCallback('onUpdate', () => {
    progress.value = tl.progress()
  })
  tl.eventCallback('onStart', () => {
    emit('play-start')
  })
  tl.eventCallback('onComplete', () => {
    isPlaying.value = false
    isPaused.value = false
    progress.value = 1
    emit('play-complete')
    if (props.highlight?.length) pulseHighlighted()
    if (isLooping.value) {
      loopTimer = setTimeout(() => {
        if (isLooping.value && ready.value) playAll()
      }, 1500)
    }
  })
  timeline.value = tl
  isPlaying.value = true
  isPaused.value = false
}

function killTimeline() {
  clearTimeout(loopTimer)
  loopTimer = null
  timeline.value?.kill()
  timeline.value = null
  isPlaying.value = false
  isPaused.value = false
}

function togglePause() {
  const tl = timeline.value
  if (!tl) return
  if (isPaused.value) {
    tl.play()
    isPaused.value = false
  } else {
    tl.pause()
    isPaused.value = true
  }
}

function reset() {
  render()
}

function seek(t) {
  timeline.value?.progress(Math.max(0, Math.min(1, t)))
}

/* ================================================================
 * Highlight — post-animation visual emphasis on specific node keys
 * Uses GSAP directly on SVG shapes so there is no CSS-scoping issue.
 * Reads --dp-accent via getComputedStyle so var() is resolved by the
 * browser (GSAP cannot interpolate CSS custom properties).
 * ================================================================ */

function killHighlightTweens() {
  highlightTweens.forEach((t) => t.kill())
  highlightTweens = []
}

function pulseHighlighted() {
  if (!prepared) return
  const keys = new Set(props.highlight)
  const targets = prepared.nodes.filter((n) => keys.has(n.dataset.dpKey) || keys.has(n.id))
  if (!targets.length) return

  killHighlightTweens()

  // Resolve the accent colour from the CSS custom property so we have a
  // concrete value GSAP can interpolate (var() in filter strings is not supported by GSAP).
  const rootEl = container.value
  // getComputedStyle returns the raw token — for custom props that reference
  // another var() (like `var(--vp-c-brand-1, #3451b2)`), the browser doesn't
  // resolve it further. So we test if it's a plain hex and fall back to a
  // safe default. The neon preset always stores a plain hex directly.
  let accent = rootEl ? getComputedStyle(rootEl).getPropertyValue('--dp-accent').trim() : '#818cf8'
  if (!accent || accent.startsWith('var(')) {
    // Resolve the fallback: try reading the vp-c-brand color, then hardcode
    accent = rootEl ? getComputedStyle(rootEl).getPropertyValue('--vp-c-brand-1').trim() : ''
    if (!accent || accent.startsWith('var(')) accent = '#818cf8'
  }
  const infinite = props.highlightMode === 'glow'
  // pulse: 5 yoyo half-cycles ≈ 2.5 full cycles (~4 s total), then restore
  const repeatCount = infinite ? -1 : 4

  targets.forEach((gNode, i) => {
    const shapes = [...gNode.querySelectorAll('rect, polygon, circle, ellipse')]
    shapes.forEach((shape) => {
      const origStroke = shape.style.stroke || shape.getAttribute('stroke') || 'none'
      const origWidth = parseFloat(
        shape.style.strokeWidth || shape.getAttribute('stroke-width') || '1',
      )

      // Apply accent stroke immediately, then animate the glow filter
      gsap.set(shape, {
        attr: { stroke: accent, 'stroke-width': Math.max(origWidth, 1.5) + 2 },
      })

      const tween = gsap.to(shape, {
        filter: `drop-shadow(0 0 14px ${accent})`,
        duration: 0.75,
        ease: 'sine.inOut',
        repeat: repeatCount,
        yoyo: true,
        delay: i * 0.09,
        onComplete: infinite
          ? undefined
          : () => {
              // Restore original stroke after pulse finishes
              gsap.to(shape, {
                filter: 'none',
                attr: { stroke: origStroke, 'stroke-width': origWidth },
                duration: 0.35,
                ease: 'power2.in',
              })
            },
      })
      highlightTweens.push(tween)
    })
  })
}

/* ================================================================
 * Public API
 * ================================================================ */
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
 * Toolbar
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
 * Maximize modal
 * ================================================================ */
.dp-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 1.5rem;
}

.dp-modal-figure {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(1200px, calc(100vw - 3rem));
  max-height: calc(100vh - 3rem);
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 32px 80px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.06);
}

.dp-modal-toolbar {
  border-radius: 0;
  flex-shrink: 0;
}

.dp-modal-stage {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 320px;
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
  width: auto;
  height: auto;
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
