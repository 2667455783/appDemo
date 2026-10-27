<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { findMatches, languageLabel, renderHighlighted, type SearchOpts } from '@/domains/programming/localrun/highlight'

const props = defineProps<{
  modelValue: string
  path?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const LINE = 20
const taRef = ref<HTMLTextAreaElement | null>(null)
const preRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const replaceRef = ref<HTMLInputElement | null>(null)
const searchOpen = ref(false)
const query = ref('')
const replaceText = ref('')
const caseSensitive = ref(false)
const useRegex = ref(false)
const wholeWord = ref(false)
const active = ref(0)
const caret = ref(0)
const scrollTop = ref(0)
const replacing = ref(false)

const opts = computed<SearchOpts>(() => ({
  caseSensitive: caseSensitive.value,
  regex: useRegex.value,
  wholeWord: wholeWord.value,
}))

const found = computed(() => findMatches(props.modelValue, query.value, opts.value))
const matches = computed(() => found.value.ranges)
const html = computed(() => renderHighlighted(props.modelValue, props.path || '', matches.value, active.value))
const lineCount = computed(() => Math.max(1, props.modelValue.split('\n').length))
const gutterPx = computed(() => Math.max(2, String(lineCount.value).length) * 8 + 18)
const caretPos = computed(() => {
  const slice = props.modelValue.slice(0, Math.min(caret.value, props.modelValue.length))
  const lines = slice.split('\n')
  return { line: lines.length, col: (lines[lines.length - 1]?.length ?? 0) + 1 }
})
const countLabel = computed(() => {
  if (found.value.invalid) return '无效'
  if (!query.value) return ''
  if (!matches.value.length) return '0/0'
  return `${active.value + 1}/${matches.value.length}`
})

watch(matches, (list) => {
  if (active.value >= list.length) active.value = Math.max(0, list.length - 1)
  if (searchOpen.value && list.length && !replacing.value) void reveal(active.value)
})

watch(
  () => props.path,
  () => {
    caret.value = 0
    active.value = 0
    scrollTop.value = 0
  },
)

function syncScroll() {
  const ta = taRef.value
  const pre = preRef.value
  if (!ta || !pre) return
  pre.scrollTop = ta.scrollTop
  pre.scrollLeft = ta.scrollLeft
  scrollTop.value = ta.scrollTop
}

function onInput(ev: Event) {
  const el = ev.target as HTMLTextAreaElement
  caret.value = el.selectionStart ?? 0
  emit('update:modelValue', el.value)
}

function rememberCaret() {
  caret.value = taRef.value?.selectionStart ?? caret.value
}

function onScroll() {
  syncScroll()
}

async function reveal(index: number) {
  const list = matches.value
  if (!list.length) return
  const i = (index + list.length) % list.length
  active.value = i
  await nextTick()
  const ta = taRef.value
  const m = list[i]
  if (!ta || !m) return
  const ae = document.activeElement
  const keepSearch = ae === inputRef.value || ae === replaceRef.value
  if (!keepSearch) ta.focus()
  ta.setSelectionRange(m.start, m.end)
  caret.value = m.start
  const line = props.modelValue.slice(0, m.start).split('\n').length
  const top = 8 + (line - 1) * LINE
  if (top < ta.scrollTop + 8 || top > ta.scrollTop + ta.clientHeight - LINE * 2) {
    ta.scrollTop = Math.max(0, top - ta.clientHeight / 3)
  }
  syncScroll()
}

function nextMatch() {
  void reveal(matches.value.length ? active.value + 1 : 0)
}

function prevMatch() {
  void reveal(matches.value.length ? active.value - 1 : 0)
}

function expandReplace(matched: string) {
  if (!useRegex.value) return replaceText.value
  try {
    return matched.replace(new RegExp(query.value, caseSensitive.value ? '' : 'i'), replaceText.value)
  } catch {
    return replaceText.value
  }
}

async function applyText(next: string, selectStart: number, selectEnd = selectStart) {
  replacing.value = true
  emit('update:modelValue', next)
  await nextTick()
  const ta = taRef.value
  if (ta) {
    ta.setSelectionRange(selectStart, selectEnd)
    caret.value = selectStart
    syncScroll()
  }
  replacing.value = false
  if (matches.value.length) await reveal(Math.min(active.value, matches.value.length - 1))
}

async function replaceOne() {
  if (found.value.invalid || !query.value || !matches.value.length) return
  const list = matches.value
  const i = Math.min(active.value, list.length - 1)
  const m = list[i]
  if (!m) return
  const matched = props.modelValue.slice(m.start, m.end)
  const insert = expandReplace(matched)
  const next = `${props.modelValue.slice(0, m.start)}${insert}${props.modelValue.slice(m.end)}`
  active.value = i
  await applyText(next, m.start + insert.length)
}

async function replaceAll() {
  if (found.value.invalid || !query.value || !matches.value.length) return
  const list = matches.value
  let out = props.modelValue
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i]!
    const insert = expandReplace(out.slice(m.start, m.end))
    out = `${out.slice(0, m.start)}${insert}${out.slice(m.end)}`
  }
  active.value = 0
  await applyText(out, Math.min(caret.value, out.length))
}

async function openSearch(focusReplace = false, presetQuery?: string) {
  searchOpen.value = true
  if (typeof presetQuery === 'string') query.value = presetQuery
  await nextTick()
  if (focusReplace) {
    replaceRef.value?.focus()
    replaceRef.value?.select()
  } else {
    inputRef.value?.focus()
    inputRef.value?.select()
  }
  if (matches.value.length) void reveal(active.value)
}

function closeSearch() {
  searchOpen.value = false
  query.value = ''
  replaceText.value = ''
  taRef.value?.focus()
}

function onSearchKey(ev: KeyboardEvent) {
  if (ev.key === 'Enter') {
    ev.preventDefault()
    if (ev.shiftKey) prevMatch()
    else nextMatch()
  } else if (ev.key === 'Escape') {
    ev.preventDefault()
    closeSearch()
  }
}

function onReplaceKey(ev: KeyboardEvent) {
  if (ev.key === 'Enter') {
    ev.preventDefault()
    if (ev.ctrlKey || ev.metaKey || ev.altKey) void replaceAll()
    else void replaceOne()
  } else if (ev.key === 'Escape') {
    ev.preventDefault()
    closeSearch()
  }
}

function onEditKey(ev: KeyboardEvent) {
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'f') {
    ev.preventDefault()
    void openSearch(false)
    return
  }
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'h') {
    ev.preventDefault()
    void openSearch(true)
    return
  }
  if (ev.key === 'Tab') {
    ev.preventDefault()
    const ta = taRef.value
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? start
    const next = `${props.modelValue.slice(0, start)}  ${props.modelValue.slice(end)}`
    emit('update:modelValue', next)
    void nextTick(() => {
      ta.setSelectionRange(start + 2, start + 2)
      caret.value = start + 2
    })
  }
}

defineExpose({ openSearch })
</script>

<template>
  <div class="ce" :style="{ '--gutter': `${gutterPx}px` }">
    <div v-if="searchOpen" class="ce-search">
      <div class="ce-search-row">
        <input
          ref="inputRef"
          v-model="query"
          class="ce-query"
          :class="{ bad: found.invalid }"
          type="search"
          placeholder="查找"
          enterkeyhint="search"
          @keydown="onSearchKey"
        />
        <button type="button" class="ce-tog" :class="{ on: useRegex }" title="正则" @click="useRegex = !useRegex">.*</button>
        <button type="button" class="ce-tog" :class="{ on: caseSensitive }" title="区分大小写" @click="caseSensitive = !caseSensitive">
          Aa
        </button>
        <button type="button" class="ce-tog word" :class="{ on: wholeWord }" title="全词匹配" @click="wholeWord = !wholeWord">
          ab
        </button>
        <button type="button" class="ce-tog" title="上一处" :disabled="!matches.length" @click="prevMatch">↑</button>
        <button type="button" class="ce-tog" title="下一处" :disabled="!matches.length" @click="nextMatch">↓</button>
        <span class="ce-count">{{ countLabel }}</span>
        <button type="button" class="ce-tog" title="关闭搜索" @click="closeSearch">×</button>
      </div>
      <div class="ce-search-row">
        <input
          ref="replaceRef"
          v-model="replaceText"
          class="ce-query"
          type="search"
          placeholder="替换为"
          enterkeyhint="done"
          @keydown="onReplaceKey"
        />
        <button
          type="button"
          class="ce-act"
          title="替换当前"
          :disabled="!matches.length || found.invalid"
          @click="replaceOne"
        >
          替换
        </button>
        <button
          type="button"
          class="ce-act strong"
          title="全部替换"
          :disabled="!matches.length || found.invalid"
          @click="replaceAll"
        >
          全部
        </button>
      </div>
    </div>

    <div class="ce-body">
      <div class="ce-gutter" aria-hidden="true">
        <div class="ce-gutter-inner" :style="{ transform: `translateY(${-scrollTop}px)` }">
          <div v-for="n in lineCount" :key="n" class="ce-ln" :class="{ on: n === caretPos.line }">{{ n }}</div>
        </div>
      </div>
      <pre ref="preRef" class="ce-pre" aria-hidden="true"><div
          class="ce-caret-line"
          :style="{ top: `${8 + (caretPos.line - 1) * LINE}px` }"
        /><span v-html="html"></span><br v-if="!modelValue" /></pre>
      <textarea
        ref="taRef"
        class="ce-input"
        wrap="off"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        :value="modelValue"
        @input="onInput"
        @scroll="onScroll"
        @click="rememberCaret"
        @keyup="rememberCaret"
        @keydown="onEditKey"
      />
    </div>

    <footer class="ce-status">
      <span>Ln {{ caretPos.line }}, Col {{ caretPos.col }}</span>
      <span>{{ languageLabel(path || '') }}</span>
    </footer>
  </div>
</template>

<style scoped>
.ce {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--paper-2);
  color: var(--ink);
  --ce-line: 20px;
}

.ce-search {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}

.ce-search-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
}

.ce-query {
  flex: 1;
  min-width: 0;
  height: 28px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  padding: 0 4px;
}

.ce-query.bad {
  border-bottom-color: var(--coral);
}

.ce-tog {
  flex-shrink: 0;
  height: 28px;
  min-width: 26px;
  padding: 0 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 650;
}

.ce-tog.on {
  background: var(--forest);
  color: var(--on-primary);
}

.ce-tog.word {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ce-tog:disabled,
.ce-act:disabled {
  opacity: 0.35;
}

.ce-count {
  flex-shrink: 0;
  min-width: 36px;
  text-align: right;
  color: var(--muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.ce-act {
  flex-shrink: 0;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--paper-2);
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
}

.ce-act.strong {
  border-color: var(--forest);
  background: var(--forest);
  color: var(--on-primary);
}

.ce-body {
  position: relative;
  flex: 1;
  min-height: 0;
}

.ce-gutter {
  position: absolute;
  z-index: 2;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--gutter);
  overflow: hidden;
  background: var(--paper-2);
  border-right: 1px solid var(--line);
  pointer-events: none;
}

.ce-gutter-inner {
  padding-top: 8px;
}

.ce-ln {
  height: var(--ce-line);
  line-height: var(--ce-line);
  padding-right: 8px;
  text-align: right;
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.ce-ln.on {
  color: color-mix(in srgb, var(--forest) 72%, var(--ink));
  font-weight: 700;
}

.ce-pre,
.ce-input {
  position: absolute;
  inset: 0;
  margin: 0;
  border: 0;
  padding: 8px 12px 24px var(--gutter);
  overflow: auto;
  scrollbar-gutter: stable;
  background: transparent;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: var(--ce-line);
  tab-size: 2;
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
}

.ce-pre {
  z-index: 1;
  color: var(--ink);
  pointer-events: none;
  scrollbar-width: none;
}

.ce-pre::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.ce-caret-line {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--ce-line);
  background: color-mix(in srgb, var(--forest) 12%, transparent);
  pointer-events: none;
}

.ce-input {
  z-index: 3;
  resize: none;
  color: transparent;
  caret-color: var(--ink);
  outline: none;
}

.ce-input::selection {
  background: color-mix(in srgb, var(--forest) 32%, transparent);
  color: transparent;
}

.ce-pre :deep(.tok-keyword),
.ce-pre :deep(.tok-tag) {
  color: color-mix(in srgb, var(--forest) 74%, var(--ink));
}

.ce-pre :deep(.tok-attr) {
  color: color-mix(in srgb, var(--forest-2) 48%, var(--ink));
}

.ce-pre :deep(.tok-string) {
  color: color-mix(in srgb, var(--forest) 22%, color-mix(in srgb, var(--gold) 70%, var(--ink)));
}

.ce-pre :deep(.tok-number) {
  color: color-mix(in srgb, var(--forest) 18%, color-mix(in srgb, var(--coral) 62%, var(--ink)));
}

.ce-pre :deep(.tok-comment) {
  color: var(--muted);
  font-style: italic;
}

.ce-pre :deep(.tok-punct) {
  color: var(--ink-soft);
}

.ce-pre :deep(.tok-plain) {
  color: var(--ink);
}

.ce-pre :deep(mark) {
  background: color-mix(in srgb, var(--forest) 28%, transparent);
  color: inherit;
  border-radius: 2px;
}

.ce-pre :deep(mark.on) {
  background: var(--forest);
  color: var(--on-primary);
}

.ce-status {
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
