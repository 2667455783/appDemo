<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type * as MonacoNS from 'monaco-editor'
import { languageForPath, pathToUri, setupMonaco } from '@/views/programming/monaco/setupMonaco'

const props = defineProps<{
  modelValue: string
  path?: string
  /** 项目全部文件，用于 TS/JS 跨文件类型推断 */
  files?: Record<string, string>
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const hostRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')
const langId = ref('javascript')
const editor = shallowRef<MonacoNS.editor.IStandaloneCodeEditor | null>(null)

let monacoApi: typeof MonacoNS | null = null
let applyingExternal = false
let contentSub: MonacoNS.IDisposable | null = null
const modelPaths = new Set<string>()

type SymBtn =
  | { id: string; label: string; kind: 'text'; text: string }
  | { id: string; label: string; kind: 'pair'; left: string; right: string }
  | { id: string; label: string; kind: 'snippet'; insert: string }
  | { id: string; label: string; kind: 'tab' }
  | { id: string; label: string; kind: 'move'; delta: number }
  | { id: string; label: string; kind: 'suggest' }

const SYMBOL_BTNS: SymBtn[] = [
  { id: 'tab', label: 'Tab', kind: 'tab' },
  { id: 'suggest', label: '提示', kind: 'suggest' },
  { id: 'paren', label: '()', kind: 'pair', left: '(', right: ')' },
  { id: 'brace', label: '{}', kind: 'pair', left: '{', right: '}' },
  { id: 'bracket', label: '[]', kind: 'pair', left: '[', right: ']' },
  { id: 'eq', label: '=', kind: 'text', text: '=' },
  { id: 'bang', label: '!', kind: 'text', text: '!' },
  { id: 'and', label: '&&', kind: 'text', text: '&&' },
  { id: 'or', label: '||', kind: 'text', text: '||' },
  { id: 'colon', label: ':', kind: 'text', text: ':' },
  { id: 'dot', label: '.', kind: 'text', text: '.' },
  { id: 'dquote', label: '"', kind: 'pair', left: '"', right: '"' },
  { id: 'squote', label: "'", kind: 'pair', left: "'", right: "'" },
  { id: 'semi', label: ';', kind: 'text', text: ';' },
  { id: 'arrow', label: '=>', kind: 'text', text: '=>' },
  { id: 'if', label: 'if', kind: 'snippet', insert: 'if (|) {\n  \n}' },
  { id: 'left', label: '←', kind: 'move', delta: -1 },
  { id: 'right', label: '→', kind: 'move', delta: 1 },
]

function isDarkTheme() {
  return document.documentElement.dataset.theme === 'dark' || document.documentElement.classList.contains('dark')
}

function resolveInsert(insert: string): { text: string; cursorOffset: number } {
  const at = insert.indexOf('|')
  if (at < 0) return { text: insert, cursorOffset: insert.length }
  return { text: insert.slice(0, at) + insert.slice(at + 1), cursorOffset: at }
}

function syncProjectModels(files: Record<string, string> | undefined, activePath: string, activeValue: string) {
  if (!monacoApi) return
  const map: Record<string, string> = { ...(files || {}) }
  if (activePath) map[activePath] = activeValue

  const nextPaths = new Set(Object.keys(map))
  for (const p of [...modelPaths]) {
    if (nextPaths.has(p)) continue
    monacoApi.editor.getModel(pathToUri(p))?.dispose()
    modelPaths.delete(p)
  }

  for (const [p, text] of Object.entries(map)) {
    const uri = pathToUri(p)
    let model = monacoApi.editor.getModel(uri)
    if (!model) {
      model = monacoApi.editor.createModel(text, languageForPath(p), uri)
      modelPaths.add(p)
      continue
    }
    // 非当前编辑文件：跟外部 files 对齐；当前文件由 bindActiveModel / v-model 管
    if (p !== activePath && model.getValue() !== text) {
      model.setValue(text)
    }
  }
}

function bindActiveModel(path: string, value: string) {
  if (!monacoApi || !editor.value) return
  const key = path || 'untitled.js'
  const lang = languageForPath(key)
  const uri = pathToUri(key)
  let model = monacoApi.editor.getModel(uri)
  if (!model) {
    model = monacoApi.editor.createModel(value, lang, uri)
    modelPaths.add(key)
  } else if (model.getLanguageId() !== lang) {
    monacoApi.editor.setModelLanguage(model, lang)
  }

  applyingExternal = true
  if (model.getValue() !== value) model.setValue(value)
  if (editor.value.getModel() !== model) editor.value.setModel(model)
  langId.value = model.getLanguageId()
  applyingExternal = false

  contentSub?.dispose()
  contentSub = model.onDidChangeContent(() => {
    if (applyingExternal) return
    emit('update:modelValue', model!.getValue())
  })
}

async function boot() {
  loading.value = true
  loadError.value = ''
  try {
    // setupMonaco 内静态依赖 monaco；本组件由 LocalRunPanel defineAsyncComponent 懒加载
    monacoApi = setupMonaco()
    await nextTick()
    if (!hostRef.value) throw new Error('编辑器容器未就绪')

    syncProjectModels(props.files, props.path || '', props.modelValue)

    const ed = monacoApi.editor.create(hostRef.value, {
      model: null,
      theme: isDarkTheme() ? 'app-soft-dark' : 'app-soft',
      automaticLayout: true,
      fontSize: 13,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'off',
      tabSize: 2,
      insertSpaces: true,
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      snippetSuggestions: 'inline',
      wordBasedSuggestions: 'off',
      autoClosingBrackets: 'languageDefined',
      parameterHints: { enabled: true },
      hover: { enabled: true },
      folding: true,
      padding: { top: 8, bottom: 8 },
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      overviewRulerLanes: 0,
      renderLineHighlight: 'line',
      // 避免被父级 overflow:hidden 裁掉补全框
      fixedOverflowWidgets: true,
    })
    editor.value = ed
    bindActiveModel(props.path || 'untitled.js', props.modelValue)

    // 部分环境（尤其手机 WebView）不会自动出建议：输入 `.` 或标签字母时主动唤起
    ed.onDidChangeModelContent((e) => {
      if (applyingExternal) return
      const last = e.changes[e.changes.length - 1]
      const text = last?.text ?? ''
      if (text === '.') {
        triggerSuggestSoon()
        return
      }
      // vue/html：输入标签名字母时弹出（template / style / script 等）
      const lang = ed.getModel()?.getLanguageId()
      if ((lang === 'vue' || lang === 'html') && /^[A-Za-z]$/.test(text)) {
        triggerSuggestSoon()
      }
    })

    loading.value = false
    await nextTick()
    ed.layout()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err)
    loading.value = false
  }
}

watch(
  () => props.path,
  (path) => {
    if (!editor.value) return
    syncProjectModels(props.files, path || '', props.modelValue)
    bindActiveModel(path || 'untitled.js', props.modelValue)
  },
)

watch(
  () => props.modelValue,
  (val) => {
    const ed = editor.value
    const model = ed?.getModel()
    if (!model || applyingExternal) return
    if (model.getValue() === val) return
    applyingExternal = true
    const pos = ed!.getPosition()
    model.setValue(val)
    if (pos) ed!.setPosition(pos)
    applyingExternal = false
  },
)

watch(
  () => props.files,
  (files) => {
    if (!editor.value) return
    syncProjectModels(files, props.path || '', props.modelValue)
  },
  { deep: true },
)

function openSearch(_focusReplace = false, presetQuery?: string) {
  const ed = editor.value
  if (!ed) return
  if (presetQuery) {
    const model = ed.getModel()
    if (model) {
      const matches = model.findMatches(presetQuery, true, false, false, null, false)
      if (matches[0]) {
        ed.setSelection(matches[0].range)
        ed.revealRangeInCenter(matches[0].range)
      }
    }
  }
  void ed.getAction('actions.find')?.run()
}

function onSymPointerDown(ev: Event) {
  ev.preventDefault()
}

function triggerSuggestSoon() {
  const ed = editor.value
  if (!ed) return
  window.setTimeout(() => {
    void ed.getAction('editor.action.triggerSuggest')?.run()
  }, 30)
}

function insertText(text: string, cursorOffset = text.length) {
  const ed = editor.value
  if (!ed) return
  ed.focus()
  const sel = ed.getSelection()
  // 单字符尽量走 type，才能打到 suggestOnTriggerCharacters
  if ((!sel || sel.isEmpty()) && text.length === 1) {
    ed.trigger('keyboard', 'type', { text })
    if (text === '.') triggerSuggestSoon()
    return
  }
  if (!sel) {
    ed.trigger('keyboard', 'type', { text })
    return
  }
  ed.executeEdits('symbol-bar', [{ range: sel, text, forceMoveMarkers: true }])
  const start = sel.getStartPosition()
  const before = text.slice(0, cursorOffset)
  const lines = before.split('\n')
  const lineNumber = start.lineNumber + lines.length - 1
  const column = lines.length === 1 ? start.column + lines[0]!.length : lines[lines.length - 1]!.length + 1
  ed.setPosition({ lineNumber, column })
  if (text.endsWith('.') || text === '.') triggerSuggestSoon()
}

function onSymbol(btn: SymBtn) {
  const ed = editor.value
  ed?.focus()
  if (!ed) return

  if (btn.kind === 'suggest') {
    void ed.getAction('editor.action.triggerSuggest')?.run()
    return
  }
  if (btn.kind === 'tab') {
    ed.trigger('keyboard', 'tab', {})
    return
  }
  if (btn.kind === 'move') {
    const pos = ed.getPosition()
    if (!pos) return
    ed.setPosition({ lineNumber: pos.lineNumber, column: Math.max(1, pos.column + btn.delta) })
    return
  }
  if (btn.kind === 'text') {
    insertText(btn.text)
    return
  }
  if (btn.kind === 'pair') {
    const sel = ed.getSelection()
    const selected = sel && !sel.isEmpty() ? ed.getModel()?.getValueInRange(sel) || '' : ''
    const { text, cursorOffset } = resolveInsert(`${btn.left}${selected || '|'}${btn.right}`)
    insertText(text, cursorOffset)
    return
  }
  if (btn.kind === 'snippet') {
    const { text, cursorOffset } = resolveInsert(btn.insert)
    insertText(text, cursorOffset)
  }
}

onMounted(() => {
  void boot()
})

onBeforeUnmount(() => {
  contentSub?.dispose()
  contentSub = null
  editor.value?.dispose()
  editor.value = null
  if (monacoApi) {
    for (const p of [...modelPaths]) {
      monacoApi.editor.getModel(pathToUri(p))?.dispose()
    }
  }
  modelPaths.clear()
  monacoApi = null
})

defineExpose({ openSearch })
</script>

<template>
  <div class="mce">
    <div class="mce-stage">
      <div v-if="loading" class="mce-boot">正在加载智能编辑器（首次稍慢）…</div>
      <div v-else-if="loadError" class="mce-boot err">编辑器加载失败：{{ loadError }}</div>
      <div ref="hostRef" class="mce-host" />
    </div>
    <div class="mce-syms" role="toolbar" aria-label="常用符号">
      <button
        v-for="btn in SYMBOL_BTNS"
        :key="btn.id"
        type="button"
        class="mce-sym"
        :title="btn.label"
        :disabled="loading || !!loadError"
        @pointerdown="onSymPointerDown"
        @click="onSymbol(btn)"
      >
        {{ btn.label }}
      </button>
    </div>
    <footer class="mce-status">
      <span>Monaco · {{ langId }}</span>
      <span>{{ path || 'untitled' }}</span>
    </footer>
  </div>
</template>

<style scoped>
.mce {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--paper-2);
  color: var(--ink);
}

.mce-stage {
  position: relative;
  flex: 1;
  min-height: 0;
}

.mce-boot {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--paper-2);
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.mce-boot.err {
  color: var(--coral, #e11d48);
}

.mce-host {
  position: absolute;
  inset: 0;
}

.mce-syms {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-top: 1px solid var(--line);
  background: var(--paper);
  scrollbar-width: thin;
}

.mce-sym {
  flex: 0 0 auto;
  height: 32px;
  min-width: 36px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper-2);
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  white-space: nowrap;
  touch-action: manipulation;
}

.mce-sym:disabled {
  opacity: 0.4;
}

.mce-sym:active:not(:disabled) {
  background: color-mix(in srgb, var(--forest) 18%, var(--paper-2));
  border-color: color-mix(in srgb, var(--forest) 40%, var(--line));
}

.mce-status {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  height: 22px;
  padding: 0 10px;
  border-top: 1px solid var(--line);
  background: var(--paper);
  color: var(--muted);
  font-size: 11px;
  line-height: 22px;
}
</style>

<style>
/* Monaco 补全挂到 body，提高层级，避免被 App 壳层挡住 */
.monaco-editor .suggest-widget,
.monaco-editor .parameter-hints-widget,
.editor-widget.suggest-widget {
  z-index: 12000 !important;
}
</style>
