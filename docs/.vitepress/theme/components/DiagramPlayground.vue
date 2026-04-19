<template>
  <div class="playground">
    <!-- Left panel: controls -->
    <aside class="playground-panel">
      <!-- Diagram selector -->
      <section class="panel-section">
        <h4 class="section-title">Diagram</h4>
        <div class="diagram-tabs" role="tablist">
          <button
            v-for="(diagram, key) in DIAGRAMS"
            :key="key"
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

      <!-- Style -->
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

      <!-- Animation -->
      <section class="panel-section">
        <h4 class="section-title">Animation</h4>
        <label class="field">
          <span class="field-label">autoPlay</span>
          <select v-model="props.autoPlay" class="field-select">
            <option value="none">none</option>
            <option value="nodes">nodes</option>
            <option value="edges">edges</option>
            <option value="all">all</option>
            <option value="intersect">intersect</option>
          </select>
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
          <input v-model="props.loop" type="checkbox" class="field-check" />
          <span class="field-label">loop</span>
        </label>
      </section>

      <!-- Highlight -->
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

      <!-- Display -->
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

      <!-- Timing (collapsed by default) -->
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

      <!-- Generated code snippet -->
      <section class="panel-section snippet-section">
        <div class="snippet-header">
          <h4 class="section-title snippet-title">Usage</h4>
          <button class="copy-btn" :class="{ copied: copyState }" @click="copySnippet">
            {{ copyState ? '✓ Copied' : 'Copy' }}
          </button>
        </div>
        <pre class="snippet-pre"><code>{{ generatedCode }}</code></pre>
      </section>
    </aside>

    <!-- Right panel: live preview -->
    <div class="playground-preview">
      <DiagramPresenter
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
        :caption="props.caption"
        :timing="nonDefaultTiming"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const DIAGRAMS = {
  flowchart: {
    label: 'Flowchart',
    highlightSuggestion: 'Process,Done',
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

const TIMING_KEYS = ['nodeDuration', 'nodeStagger', 'edgeDuration', 'edgeStagger', 'levelGap']

const TIMING_DEFAULTS = {
  nodeDuration: 0.45,
  nodeStagger: 0.11,
  edgeDuration: 0.7,
  edgeStagger: 0.09,
  levelGap: 0.1,
}

const selectedDiagram = ref('flowchart')
const highlightInput = ref('')
const copyState = ref(false)

const props = reactive({
  preset: 'auto',
  controls: true,
  showBadge: false,
  autoPlay: 'none',
  highlightMode: 'pulse',
  speed: 'normal',
  loop: false,
  caption: '',
  timing: { ...TIMING_DEFAULTS },
})

function selectDiagram(key) {
  selectedDiagram.value = key
  highlightInput.value = ''
}

/** Parsed highlight array from comma-separated input. */
const parsedHighlight = computed(() =>
  highlightInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

/** Only pass timing object if any value differs from defaults. */
const nonDefaultTiming = computed(() => {
  const overrides = {}
  for (const key of TIMING_KEYS) {
    if (props.timing[key] !== TIMING_DEFAULTS[key]) {
      overrides[key] = props.timing[key]
    }
  }
  return Object.keys(overrides).length ? overrides : undefined
})

/** Force remount when diagram type or preset changes. */
const previewKey = computed(() => `${selectedDiagram.value}-${props.preset}`)

/** Builds the copyable usage snippet with only non-default props. */
const generatedCode = computed(() => {
  const diagramKey = selectedDiagram.value
  const code = DIAGRAMS[diagramKey].code
  const attrs = []

  if (props.preset !== 'auto') attrs.push(`preset="${props.preset}"`)
  if (!props.controls) attrs.push(`:controls="false"`)
  if (props.showBadge) attrs.push(`showBadge`)
  if (props.autoPlay !== 'none') attrs.push(`autoPlay="${props.autoPlay}"`)
  if (parsedHighlight.value.length) {
    attrs.push(`:highlight="[${parsedHighlight.value.map((k) => `'${k}'`).join(', ')}]"`)
  }
  if (props.highlightMode !== 'pulse') attrs.push(`highlightMode="${props.highlightMode}"`)
  if (props.speed !== 'normal') attrs.push(`speed="${props.speed}"`)
  if (props.loop) attrs.push(`loop`)
  if (props.caption) attrs.push(`caption="${props.caption}"`)
  if (nonDefaultTiming.value) {
    const entries = Object.entries(nonDefaultTiming.value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    attrs.push(`:timing="{ ${entries} }"`)
  }

  const tag = attrs.length
    ? `<DiagramPresenter\n  :code="myDiagram"\n  ${attrs.join('\n  ')}\n/>`
    : `<DiagramPresenter :code="myDiagram" />`

  return `<script setup>\nconst myDiagram = \`\n${code}\n\`\n</` + `script>\n\n${tag}`
})

async function copySnippet() {
  try {
    await navigator.clipboard.writeText(generatedCode.value)
    copyState.value = true
    setTimeout(() => {
      copyState.value = false
    }, 2000)
  } catch {
    /* clipboard unavailable */
  }
}
</script>

<style scoped>
.playground {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  font-family: var(--vp-font-family-base);
  margin: 1.5rem 0;
}

/* Left panel */
.playground-panel {
  width: 340px;
  flex-shrink: 0;
  position: sticky;
  top: 4rem;
  max-height: calc(100vh - 5rem);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  padding: 0.25rem 0;
}

.panel-section {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.panel-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  margin: 0 0 0.6rem;
}

.section-hint {
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--vp-c-text-3);
  opacity: 0.75;
}

/* Diagram tabs */
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

/* Form fields */
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

.field-select,
.field-input {
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.8rem;
  font-family: var(--vp-font-family-base);
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.field-select:focus,
.field-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.field-input-num {
  max-width: 100px;
}

.field-check {
  accent-color: var(--vp-c-brand-1);
  width: 14px;
  height: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

/* Timing collapsible */
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
  gap: 0;
}

/* Snippet */
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

.copy-btn {
  font-size: 0.72rem;
  padding: 0.2rem 0.6rem;
  border-radius: 5px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  font-family: var(--vp-font-family-base);
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
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 7px;
  padding: 0.65rem 0.8rem;
  margin: 0;
  overflow-x: auto;
  font-size: 0.72rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  white-space: pre;
}

.snippet-pre code {
  font-family: var(--vp-font-family-mono, monospace);
  background: none;
  padding: 0;
}

/* Right panel */
.playground-preview {
  flex: 1;
  min-width: 0;
}

/* Mobile: stack vertically */
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
