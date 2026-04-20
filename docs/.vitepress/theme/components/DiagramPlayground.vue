<template>
  <div class="playground">
    <aside class="playground-panel">
      <section class="panel-section">
        <h4 class="section-title">Feature presets</h4>
        <div class="preset-grid">
          <button
            v-for="preset in FEATURE_PRESETS"
            :key="preset.id"
            type="button"
            class="preset-btn"
            :class="{ active: activePresetId === preset.id }"
            @click="applyPreset(preset.id)"
          >
            <span class="preset-label">{{ preset.label }}</span>
            <span class="preset-copy">{{ preset.description }}</span>
          </button>
        </div>
      </section>

      <section class="panel-section">
        <h4 class="section-title">Diagram</h4>
        <div class="diagram-tabs" role="tablist">
          <button
            v-for="(diagram, key) in DIAGRAMS"
            :key="key"
            type="button"
            role="tab"
            :aria-selected="selectedDiagram === key"
            class="tab-btn"
            :class="{ active: selectedDiagram === key }"
            @click="selectDiagram(key)"
          >
            {{ diagram.label }}
          </button>
        </div>
      </section>

      <section class="panel-section">
        <h4 class="section-title">Style</h4>
        <label class="field">
          <span class="field-label">preset</span>
          <select v-model="props.preset" class="field-select">
            <option value="auto">auto</option>
            <option value="soft">soft</option>
            <option value="neon">neon</option>
          </select>
        </label>
      </section>

      <section class="panel-section">
        <h4 class="section-title">Animation</h4>
        <label class="field">
          <span class="field-label">autoPlay</span>
          <select v-model="props.autoPlay" class="field-select" :disabled="props.phaseNav">
            <option value="none">none</option>
            <option value="nodes">nodes</option>
            <option value="edges">edges</option>
            <option value="all">all</option>
            <option value="intersect">intersect</option>
          </select>
          <span v-if="props.phaseNav" class="field-hint">
            phaseNav uses manual step controls, so autoplay stays disabled here.
          </span>
        </label>
        <label class="field">
          <span class="field-label">speed</span>
          <select v-model="props.speed" class="field-select">
            <option value="slow">slow</option>
            <option value="normal">normal</option>
            <option value="fast">fast</option>
          </select>
        </label>
        <label class="field field-checkbox">
          <input
            v-model="props.loop"
            type="checkbox"
            class="field-check"
            :disabled="props.phaseNav"
          />
          <span class="field-label">loop</span>
        </label>
      </section>

      <section class="panel-section">
        <h4 class="section-title">Highlight</h4>
        <label class="field">
          <span class="field-label">highlight</span>
          <input
            v-model="highlightInput"
            type="text"
            class="field-input"
            :placeholder="DIAGRAMS[selectedDiagram].highlightSuggestion || 'NodeA,NodeB'"
          />
          <span class="field-hint">comma-separated node keys</span>
        </label>
        <label class="field">
          <span class="field-label">highlightMode</span>
          <select v-model="props.highlightMode" class="field-select">
            <option value="pulse">pulse</option>
            <option value="glow">glow</option>
          </select>
        </label>
      </section>

      <section class="panel-section">
        <h4 class="section-title">New features</h4>
        <label class="field field-checkbox">
          <input v-model="props.phaseNav" type="checkbox" class="field-check" />
          <span class="field-label">phaseNav</span>
        </label>
        <label class="field field-checkbox">
          <input v-model="props.spotlight" type="checkbox" class="field-check" />
          <span class="field-label">spotlight</span>
        </label>
        <p class="field-hint feature-hint">
          `phaseNav` is ideal for guided walkthroughs. `spotlight` works best on flowchart/state
          diagrams because they expose connectivity.
        </p>
      </section>

      <section class="panel-section">
        <h4 class="section-title">Display</h4>
        <label class="field field-checkbox">
          <input v-model="props.controls" type="checkbox" class="field-check" />
          <span class="field-label">controls</span>
        </label>
        <label class="field field-checkbox">
          <input v-model="props.showBadge" type="checkbox" class="field-check" />
          <span class="field-label">showBadge</span>
        </label>
        <label class="field">
          <span class="field-label">caption</span>
          <input
            v-model="props.caption"
            type="text"
            class="field-input"
            placeholder="Optional caption…"
          />
        </label>
      </section>

      <section class="panel-section">
        <details class="timing-details">
          <summary class="section-title timing-summary">
            Timing <span class="section-hint">(seconds)</span>
          </summary>
          <div class="timing-fields">
            <label v-for="key in TIMING_KEYS" :key="key" class="field">
              <span class="field-label">{{ key }}</span>
              <input
                v-model.number="props.timing[key]"
                type="number"
                step="0.05"
                min="0.05"
                class="field-input field-input-num"
              />
            </label>
          </div>
        </details>
      </section>

      <section class="panel-section">
        <h4 class="section-title">Current preview checklist</h4>
        <ul class="checklist">
          <li v-for="tip in previewTips" :key="tip">{{ tip }}</li>
        </ul>
      </section>

      <section class="panel-section snippet-section">
        <div class="snippet-header">
          <h4 class="section-title snippet-title">Usage</h4>
          <button
            type="button"
            class="copy-btn"
            :class="{ copied: copyState }"
            @click="copySnippet"
          >
            {{ copyState ? '✓ Copied' : 'Copy' }}
          </button>
        </div>
        <pre class="snippet-pre"><code>{{ generatedCode }}</code></pre>
      </section>
    </aside>

    <div class="playground-preview">
      <section class="preview-section">
        <div class="preview-header">
          <div>
            <h3 class="preview-title">Interactive preview</h3>
            <p class="preview-copy">
              Tune the props live, then open the modal to test keyboard shortcuts, zoom-to-node,
              minimap, and SVG export.
            </p>
          </div>
          <div class="preview-actions">
            <button type="button" class="action-btn" @click="playCurrentPreview">Play</button>
            <button type="button" class="action-btn" @click="resetCurrentPreview">Reset</button>
            <button
              type="button"
              class="action-btn action-btn-primary"
              @click="exportCurrentPreview"
            >
              Export SVG
            </button>
          </div>
        </div>

        <div class="tip-pills">
          <span v-for="tip in previewPills" :key="tip" class="tip-pill">{{ tip }}</span>
        </div>

        <DiagramPresenter
          ref="previewPresenterRef"
          :key="previewKey"
          :code="DIAGRAMS[selectedDiagram].code"
          :preset="props.preset"
          :controls="props.controls"
          :show-badge="props.showBadge"
          :auto-play="props.autoPlay"
          :highlight="parsedHighlight"
          :highlight-mode="props.highlightMode"
          :speed="props.speed"
          :loop="props.loop"
          :caption="resolvedCaption"
          :phase-nav="props.phaseNav"
          :spotlight="props.spotlight"
          :timing="nonDefaultTiming"
        />
      </section>

      <section class="preview-section">
        <div class="preview-header">
          <div>
            <h3 class="preview-title">Feature showcase</h3>
            <p class="preview-copy">
              These examples stay preconfigured so you can verify the new behaviors quickly without
              rebuilding the main preview from scratch.
            </p>
          </div>
        </div>

        <div class="showcase-grid">
          <article v-for="example in SHOWCASE_EXAMPLES" :key="example.id" class="showcase-card">
            <h4 class="showcase-title">{{ example.title }}</h4>
            <p class="showcase-copy">{{ example.description }}</p>
            <DiagramPresenter
              :code="example.code"
              :preset="example.presenterProps.preset"
              :controls="example.presenterProps.controls"
              :auto-play="example.presenterProps.autoPlay"
              :highlight="example.presenterProps.highlight"
              :highlight-mode="example.presenterProps.highlightMode"
              :caption="example.presenterProps.caption"
              :phase-nav="example.presenterProps.phaseNav"
              :spotlight="example.presenterProps.spotlight"
            />
          </article>
        </div>
      </section>

      <section class="preview-section">
        <div class="preview-header">
          <div>
            <h3 class="preview-title">Story mode pattern</h3>
            <p class="preview-copy">
              `DiagramPresenter` does not need an extra story API. Chain presenters with the
              existing `play-complete` event and exposed methods.
            </p>
          </div>
          <div class="preview-actions">
            <button type="button" class="action-btn action-btn-primary" @click="runStoryDemo">
              Run story demo
            </button>
          </div>
        </div>

        <div class="story-grid">
          <DiagramPresenter
            ref="storyLeadPresenterRef"
            :code="STORY_DIAGRAMS.intake"
            preset="soft"
            caption="Step 1 — Intake"
            @play-complete="playStoryFollowUp"
          />

          <DiagramPresenter
            ref="storyFollowPresenterRef"
            :code="STORY_DIAGRAMS.confirmation"
            preset="neon"
            :controls="false"
            :highlight="['Confirmed']"
            highlight-mode="glow"
            caption="Step 2 — Confirmation"
          />
        </div>

        <pre class="snippet-pre"><code>{{ storyModeSnippet }}</code></pre>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'

const DIAGRAMS = {
  flowchart: {
    label: 'Flowchart',
    highlightSuggestion: 'Process,Done',
    defaultHighlight: 'Process,Done',
    code: `flowchart TD
    Start([▶ Start]) --> Input[/User Input/]
    Input --> Validate{Valid?}
    Validate -->|Yes| Process[Process Data]
    Validate -->|No| Error[Show Error]
    Error --> Input
    Process --> Done([✓ Done])`,
  },
  state: {
    label: 'State Diagram',
    highlightSuggestion: 'Active,Done',
    defaultHighlight: 'Active,Done',
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Active: Start
    Active --> Paused: Pause
    Paused --> Active: Resume
    Active --> Done: Complete
    Done --> [*]
    Done --> Idle: Reset`,
  },
  sequence: {
    label: 'Sequence',
    highlightSuggestion: '',
    defaultHighlight: '',
    code: `sequenceDiagram
    participant U as User
    participant A as App
    participant W as Worker
    participant S as Store

    U->>A: Upload file
    A->>W: processFrame()
    W-->>A: detections[]
    A->>S: confirmPlate()
    S-->>A: plateAdded
    A-->>U: Show result`,
  },
}

const SHOWCASE_EXAMPLES = [
  {
    id: 'phase-nav',
    title: 'Phase navigation',
    description: 'Guided walkthrough with Prev/Next buttons and animated phase dots.',
    code: `flowchart TD
    Camera[Camera Frame] --> Detect{Plate found?}
    Detect -->|Yes| Confirm[Confirm result]
    Detect -->|No| Retry[Keep scanning]
    Confirm --> Save[Save in history]
    Retry --> Camera`,
    presenterProps: {
      autoPlay: 'none',
      caption: 'Phase-by-phase walkthrough',
      controls: true,
      highlight: [],
      highlightMode: 'pulse',
      phaseNav: true,
      preset: 'soft',
      spotlight: false,
    },
  },
  {
    id: 'spotlight',
    title: 'Hover spotlight',
    description: 'Hover any node to dim unrelated branches and reveal the local context.',
    code: `flowchart TD
    Start([Entry]) --> Parse[Parse frame]
    Parse --> Quality{Readable plate?}
    Quality -->|Yes| OCR[OCR]
    Quality -->|No| Reject[Discard frame]
    OCR --> Match[Deduplicate]
    Match --> Save[Save result]
    Reject --> Start`,
    presenterProps: {
      autoPlay: 'none',
      caption: 'Contextual spotlight on connected nodes',
      controls: true,
      highlight: [],
      highlightMode: 'pulse',
      phaseNav: false,
      preset: 'soft',
      spotlight: true,
    },
  },
  {
    id: 'neon',
    title: 'Neon presentation',
    description: 'Dark preset with highlight glow and post-play edge emphasis.',
    code: `stateDiagram-v2
    [*] --> Waiting
    Waiting --> Processing: Plate seen
    Processing --> Confirmed: Confidence OK
    Processing --> Waiting: Discard
    Confirmed --> Archived: Persisted
    Archived --> [*]`,
    presenterProps: {
      autoPlay: 'all',
      caption: 'Neon preset + glow highlight',
      controls: true,
      highlight: ['Processing', 'Confirmed'],
      highlightMode: 'glow',
      phaseNav: false,
      preset: 'neon',
      spotlight: false,
    },
  },
]

const STORY_DIAGRAMS = {
  intake: `flowchart TD
  Upload[Upload frame] --> Queue[Queue job]
  Queue --> Worker[Worker starts OCR]
  Worker --> Result[Emit result]`,
  confirmation: `stateDiagram-v2
  [*] --> Candidate
  Candidate --> Confirmed: Confidence threshold met
  Confirmed --> Stored: Added to history
  Stored --> [*]`,
}

const TIMING_KEYS = ['nodeDuration', 'nodeStagger', 'edgeDuration', 'edgeStagger', 'levelGap']

const TIMING_DEFAULTS = {
  nodeDuration: 0.45,
  nodeStagger: 0.11,
  edgeDuration: 0.7,
  edgeStagger: 0.09,
  levelGap: 0.1,
}

const FEATURE_PRESETS = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Default flowchart playground with all runtime controls enabled.',
    diagramKey: 'flowchart',
    highlight: 'Process,Done',
    props: {
      preset: 'auto',
      controls: true,
      showBadge: false,
      autoPlay: 'none',
      highlightMode: 'pulse',
      speed: 'normal',
      loop: false,
      caption: '',
      phaseNav: false,
      spotlight: false,
      timing: {},
    },
  },
  {
    id: 'phase-nav',
    label: 'Phase nav',
    description: 'Switch the main preview into guided walkthrough mode.',
    diagramKey: 'flowchart',
    highlight: '',
    props: {
      preset: 'soft',
      controls: true,
      showBadge: true,
      autoPlay: 'none',
      highlightMode: 'pulse',
      speed: 'normal',
      loop: false,
      caption: 'Guided phase navigation demo',
      phaseNav: true,
      spotlight: false,
      timing: {},
    },
  },
  {
    id: 'spotlight',
    label: 'Spotlight',
    description: 'Use hover spotlight to isolate connected branches.',
    diagramKey: 'flowchart',
    highlight: 'Validate,Process',
    props: {
      preset: 'soft',
      controls: true,
      showBadge: false,
      autoPlay: 'none',
      highlightMode: 'pulse',
      speed: 'normal',
      loop: false,
      caption: 'Hover any node to focus the branch',
      phaseNav: false,
      spotlight: true,
      timing: {},
    },
  },
  {
    id: 'neon',
    label: 'Neon',
    description: 'Stress-test highlight, modal controls, and edge glow in the dark preset.',
    diagramKey: 'state',
    highlight: 'Active,Done',
    props: {
      preset: 'neon',
      controls: true,
      showBadge: false,
      autoPlay: 'all',
      highlightMode: 'glow',
      speed: 'normal',
      loop: false,
      caption: 'Neon preset with persistent highlight',
      phaseNav: false,
      spotlight: false,
      timing: {},
    },
  },
]

function createDefaultProps() {
  return {
    preset: 'auto',
    controls: true,
    showBadge: false,
    autoPlay: 'none',
    highlightMode: 'pulse',
    speed: 'normal',
    loop: false,
    caption: '',
    phaseNav: false,
    spotlight: false,
    timing: { ...TIMING_DEFAULTS },
  }
}

const props = reactive(createDefaultProps())

const selectedDiagram = ref('flowchart')
const activePresetId = ref('balanced')
const highlightInput = ref(DIAGRAMS.flowchart.defaultHighlight)
const copyState = ref(false)
const previewPresenterRef = ref(null)
const storyLeadPresenterRef = ref(null)
const storyFollowPresenterRef = ref(null)

let copyTimer = null
let storyTimer = null

function resetProps(overrides = {}) {
  const defaults = createDefaultProps()
  Object.assign(props, defaults, { ...overrides, timing: undefined })
  props.timing = { ...TIMING_DEFAULTS, ...(overrides.timing ?? {}) }
}

function applyPreset(presetId) {
  const preset = FEATURE_PRESETS.find((entry) => entry.id === presetId)
  if (!preset) return
  activePresetId.value = preset.id
  selectedDiagram.value = preset.diagramKey
  highlightInput.value = preset.highlight
  resetProps(preset.props)
}

function selectDiagram(key) {
  selectedDiagram.value = key
  activePresetId.value = null
  highlightInput.value = DIAGRAMS[key].defaultHighlight
}

watch(
  () => props.phaseNav,
  (enabled) => {
    if (!enabled) return
    props.loop = false
    props.autoPlay = 'none'
  },
)

const parsedHighlight = computed(() =>
  highlightInput.value
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

const nonDefaultTiming = computed(() => {
  const overrides = {}
  for (const key of TIMING_KEYS) {
    if (props.timing[key] !== TIMING_DEFAULTS[key]) {
      overrides[key] = props.timing[key]
    }
  }
  return Object.keys(overrides).length ? overrides : undefined
})

const resolvedCaption = computed(
  () => props.caption || `${DIAGRAMS[selectedDiagram.value].label} preview`,
)

const previewKey = computed(() =>
  JSON.stringify({
    code: selectedDiagram.value,
    preset: props.preset,
    controls: props.controls,
    showBadge: props.showBadge,
    autoPlay: props.autoPlay,
    highlight: parsedHighlight.value,
    highlightMode: props.highlightMode,
    speed: props.speed,
    loop: props.loop,
    caption: resolvedCaption.value,
    phaseNav: props.phaseNav,
    spotlight: props.spotlight,
    timing: nonDefaultTiming.value,
  }),
)

const previewTips = computed(() => {
  const tips = [
    'Double-click the diagram to open the fullscreen modal.',
    'Use Space, ←/→, 1/2/3, R, F and Esc inside the modal.',
    'Export uses SVG so the result stays faithful to Mermaid labels and theme styling.',
  ]
  if (props.phaseNav) {
    tips.push('phaseNav replaces continuous playback with Prev/Next stepping.')
  } else {
    tips.push('Drag the scrubber or use arrow keys on it for manual seeking.')
  }
  if (props.spotlight) {
    tips.push('Hover spotlight is clearest on flowchart and state diagrams.')
  }
  return tips
})

const previewPills = computed(() => {
  const pills = ['Modal shortcuts', 'SVG export', 'Zoom-to-node']
  pills.push(props.phaseNav ? 'Phase navigation' : 'Scrubber seek')
  if (props.spotlight) pills.push('Hover spotlight')
  if (props.preset === 'neon') pills.push('Neon glow')
  return pills
})

const generatedCode = computed(() => {
  const code = DIAGRAMS[selectedDiagram.value].code
  const attrs = []

  if (props.preset !== 'auto') attrs.push(`preset="${props.preset}"`)
  if (!props.controls) attrs.push(`:controls="false"`)
  if (props.showBadge) attrs.push('showBadge')
  if (props.autoPlay !== 'none') attrs.push(`autoPlay="${props.autoPlay}"`)
  if (parsedHighlight.value.length) {
    attrs.push(`:highlight="[${parsedHighlight.value.map((key) => `'${key}'`).join(', ')}]"`)
  }
  if (props.highlightMode !== 'pulse') attrs.push(`highlightMode="${props.highlightMode}"`)
  if (props.speed !== 'normal') attrs.push(`speed="${props.speed}"`)
  if (props.loop) attrs.push('loop')
  if (props.caption) attrs.push(`caption="${props.caption}"`)
  if (props.phaseNav) attrs.push('phaseNav')
  if (props.spotlight) attrs.push('spotlight')
  if (nonDefaultTiming.value) {
    const entries = Object.entries(nonDefaultTiming.value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
    attrs.push(`:timing="{ ${entries} }"`)
  }

  const tag = attrs.length
    ? `<DiagramPresenter\n  :code="myDiagram"\n  ${attrs.join('\n  ')}\n/>`
    : '<DiagramPresenter :code="myDiagram" />'

  return `<script setup>\nconst myDiagram = \`\n${code}\n\`\n</` + `script>\n\n${tag}`
})

const storyModeSnippet = computed(
  () =>
    `<script setup>\nimport { ref } from 'vue'\n\nconst first = ref(null)\nconst second = ref(null)\n\nconst playSecondStep = () => {\n  setTimeout(() => second.value?.play?.(), 400)\n}\n</` +
    `script>\n\n<DiagramPresenter\n  ref="first"\n  :code="firstDiagram"\n  @play-complete="playSecondStep"\n/>\n\n<DiagramPresenter\n  ref="second"\n  :code="secondDiagram"\n  :controls="false"\n/>`,
)

async function copySnippet() {
  try {
    await navigator.clipboard.writeText(generatedCode.value)
    copyState.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copyState.value = false
    }, 2000)
  } catch {
    /* clipboard unavailable */
  }
}

function playCurrentPreview() {
  previewPresenterRef.value?.play?.()
}

function resetCurrentPreview() {
  previewPresenterRef.value?.reset?.()
}

function exportCurrentPreview() {
  previewPresenterRef.value?.exportDiagram?.('svg')
}

function playStoryFollowUp() {
  clearTimeout(storyTimer)
  storyTimer = setTimeout(() => {
    storyFollowPresenterRef.value?.reset?.()
    storyFollowPresenterRef.value?.play?.()
  }, 400)
}

async function runStoryDemo() {
  clearTimeout(storyTimer)
  storyLeadPresenterRef.value?.reset?.()
  storyFollowPresenterRef.value?.reset?.()
  await nextTick()
  storyLeadPresenterRef.value?.play?.()
}

onBeforeUnmount(() => {
  clearTimeout(copyTimer)
  clearTimeout(storyTimer)
})

applyPreset('balanced')
</script>

<style scoped>
.playground {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  margin: 1.5rem 0;
  font-family: var(--vp-font-family-base);
}

.playground-panel {
  width: 340px;
  flex-shrink: 0;
  position: sticky;
  top: 4rem;
  max-height: calc(100vh - 5rem);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 0.25rem 0;
}

.panel-section {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.panel-section:last-child {
  border-bottom: none;
}

.section-title {
  margin: 0 0 0.65rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.section-hint {
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--vp-c-text-3);
  opacity: 0.75;
}

.preset-grid {
  display: grid;
  gap: 0.55rem;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 9px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s,
    transform 0.15s;
  cursor: pointer;
}

.preset-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
  transform: translateY(-1px);
}

.preset-btn.active {
  border-color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-bg));
  color: var(--vp-c-text-1);
}

.preset-label {
  font-size: 0.82rem;
  font-weight: 600;
}

.preset-copy {
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--vp-c-text-3);
}

.diagram-tabs {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  font-family: var(--vp-font-family-base);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  line-height: 1.4;
}

.tab-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.tab-btn.active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.5rem;
}

.field:last-child {
  margin-bottom: 0;
}

.field-checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono, monospace);
}

.field-hint {
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
}

.feature-hint {
  margin: 0.4rem 0 0;
  line-height: 1.5;
}

.field-select,
.field-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.35rem 0.55rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.8rem;
  font-family: var(--vp-font-family-base);
  transition: border-color 0.15s;
}

.field-select:focus,
.field-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.field-select:disabled,
.field-input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.field-input-num {
  max-width: 100px;
}

.field-check {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  cursor: pointer;
  accent-color: var(--vp-c-brand-1);
}

.timing-details {
  margin: 0;
}

.timing-summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-bottom: 0;
  user-select: none;
}

.timing-summary::-webkit-details-marker {
  display: none;
}

.timing-summary::before {
  content: '▶';
  font-size: 0.55rem;
  color: var(--vp-c-text-3);
  transition: transform 0.15s;
  display: inline-block;
}

details[open] > .timing-summary::before {
  transform: rotate(90deg);
}

.timing-fields {
  margin-top: 0.6rem;
  display: flex;
  flex-direction: column;
}

.checklist {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.4rem;
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  line-height: 1.45;
}

.snippet-section {
  flex-shrink: 0;
}

.snippet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.snippet-title {
  margin-bottom: 0;
}

.copy-btn,
.action-btn {
  font-family: var(--vp-font-family-base);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s,
    transform 0.15s;
}

.copy-btn {
  font-size: 0.72rem;
  padding: 0.2rem 0.6rem;
  border-radius: 5px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.copy-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.copy-btn.copied {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}

.snippet-pre {
  margin: 0;
  overflow-x: auto;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 9px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font-size: 0.72rem;
  line-height: 1.6;
  white-space: pre;
}

.snippet-pre code {
  padding: 0;
  background: none;
  font-family: var(--vp-font-family-mono, monospace);
}

.playground-preview {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 1.25rem;
}

.preview-section {
  display: grid;
  gap: 1rem;
}

.preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.preview-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.preview-copy {
  margin: 0.35rem 0 0;
  max-width: 56rem;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

.preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.action-btn {
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  font-weight: 600;
}

.action-btn:hover {
  transform: translateY(-1px);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.action-btn-primary {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}

.action-btn-primary:hover {
  color: #fff;
}

.tip-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tip-pill {
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  line-height: 1.3;
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.showcase-card {
  display: grid;
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.showcase-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.showcase-copy {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  line-height: 1.5;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .playground {
    flex-direction: column;
  }

  .playground-panel {
    width: 100%;
    position: static;
    max-height: none;
  }
}
</style>
