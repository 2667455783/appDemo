<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { PROG_LANGS, SAMPLES, getLangMeta } from '@/domains/programming/langs'
import type { ProgLangId, RunResult } from '@/domains/programming/types'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()

const lang = ref<ProgLangId>('javascript')
const code = ref(SAMPLES.javascript)
const running = ref(false)
const status = ref('')
const result = ref<RunResult | null>(null)
const editorEl = ref<HTMLTextAreaElement | null>(null)
const previewHost = ref<HTMLElement | null>(null)
const showPreviewHost = ref(false)
let previewUnmount: (() => void) | undefined

const meta = computed(() => getLangMeta(lang.value))
const canRun = computed(() => meta.value.mode !== 'remote')
const showOutput = computed(
  () => !!result.value && result.value.kind !== 'remote' && result.value.kind !== 'preview',
)

function clearPreview() {
  previewUnmount?.()
  previewUnmount = undefined
  if (previewHost.value) previewHost.value.replaceChildren()
  showPreviewHost.value = false
}

watch(lang, (id) => {
  code.value = SAMPLES[id]
  result.value = null
  clearPreview()
  status.value = ''
})

onBeforeUnmount(() => {
  clearPreview()
})

const lineCount = computed(() => Math.max(1, code.value.split('\n').length))
const lineLabels = computed(() =>
  Array.from({ length: lineCount.value }, (_, i) => String(i + 1)).join('\n'),
)

function onEditorScroll() {
  const ta = editorEl.value
  const gutter = ta?.previousElementSibling as HTMLElement | null
  if (ta && gutter) gutter.scrollTop = ta.scrollTop
}

async function run() {
  if (running.value) return
  running.value = true
  status.value = meta.value.mode === 'local' && lang.value === 'python' ? '加载 Python 运行时…' : '运行中…'
  result.value = null
  clearPreview()

  try {
    const needHost = lang.value === 'vue' || lang.value === 'react'
    if (needHost) {
      showPreviewHost.value = true
      await nextTick()
    }

    const { runCode } = await import('@/domains/programming/runners')
    const res = await runCode(lang.value, code.value, previewHost.value)
    result.value = res
    previewUnmount = res.unmount

    if (res.kind === 'preview') {
      status.value = res.ok ? '预览已更新' : '预览失败'
      if (!res.ok) showPreviewHost.value = !!previewHost.value?.childNodes.length
    } else if (res.kind === 'remote') {
      status.value = '待接入云端'
    } else {
      status.value = res.ok ? '运行完成' : '运行失败'
    }
    user.markStudy()
    if (res.ok || res.kind === 'remote') study.completeTask('prog-practice')
  } catch (err) {
    result.value = {
      ok: false,
      kind: 'text',
      output: err instanceof Error ? err.message : String(err),
    }
    status.value = '运行失败'
    showPreviewHost.value = false
  } finally {
    running.value = false
  }
}

function resetSample() {
  code.value = SAMPLES[lang.value]
  result.value = null
  clearPreview()
  status.value = ''
}
</script>

<template>
  <div class="page practice">
    <PageHeader title="示例练习" subtle="片段沙箱 · 多语言试跑" @back="router.replace('/d/programming/practice')" />

    <div class="sandbox">
      <div class="lang-row" role="tablist" aria-label="语言">
        <button
          v-for="l in PROG_LANGS"
          :key="l.id"
          class="lang-chip"
          :class="{ on: lang === l.id, remote: l.mode === 'remote' }"
          type="button"
          role="tab"
          :aria-selected="lang === l.id"
          @click="lang = l.id"
        >
          {{ l.label }}
        </button>
      </div>

      <p class="hint">{{ meta.hint }}</p>

      <div class="editor-card">
        <div class="editor-toolbar">
          <span class="muted">{{ meta.label }}</span>
          <div class="toolbar-actions">
            <button class="btn ghost sm" type="button" @click="resetSample">重置</button>
            <button class="btn primary sm" type="button" :disabled="running" @click="run">
              {{ running ? '…' : canRun ? '运行' : '待云端' }}
            </button>
          </div>
        </div>

        <div class="editor-wrap">
          <pre class="gutter" aria-hidden="true">{{ lineLabels }}</pre>
          <textarea
            ref="editorEl"
            v-model="code"
            class="editor"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            @scroll="onEditorScroll"
          />
        </div>
      </div>

      <div v-if="status || showOutput || showPreviewHost || result?.notice" class="result-block">
        <p v-if="status" class="status" :class="{ bad: result && !result.ok && result.kind !== 'remote' }">
          {{ status }}
        </p>

        <div v-if="result?.notice" class="card notice">
          <p class="t-title">云端沙箱待接入</p>
          <p class="page-sub" style="margin-top: 6px">{{ result.notice }}</p>
        </div>

        <div v-show="showPreviewHost" class="preview-card">
          <p class="panel-label">预览</p>
          <div ref="previewHost" class="preview-host" />
        </div>

        <div v-if="showOutput" class="output-card">
          <p class="panel-label">输出</p>
          <pre class="output" :class="{ err: !result?.ok }">{{ result?.output || '(无输出)' }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.practice {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sandbox {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.lang-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.lang-row::-webkit-scrollbar {
  display: none;
}

.lang-chip {
  flex-shrink: 0;
  height: 30px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
}

.lang-chip.on {
  background: var(--forest);
  color: var(--on-primary);
}

.lang-chip.remote:not(.on) {
  opacity: 0.65;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--ink-soft);
  line-height: 1.4;
}

.editor-card,
.preview-card,
.output-card,
.notice {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  background: var(--moss);
}

.toolbar-actions {
  display: flex;
  gap: 6px;
}

.muted {
  font-size: 12px;
  color: var(--ink-soft);
  font-weight: 600;
}

.editor-wrap {
  display: flex;
  height: min(42vh, 320px);
  min-height: 180px;
  background: var(--paper-2);
}

.gutter {
  margin: 0;
  padding: 10px 6px 10px 10px;
  min-width: 26px;
  text-align: right;
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  user-select: none;
  overflow: hidden;
  border-right: 1px solid var(--line);
  background: color-mix(in srgb, var(--moss) 40%, var(--paper-2));
}

.editor {
  flex: 1;
  margin: 0;
  border: 0;
  resize: none;
  padding: 10px;
  background: transparent;
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  tab-size: 2;
  outline: none;
  white-space: pre;
  overflow: auto;
}

.result-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status {
  margin: 0;
  font-size: 12px;
  color: var(--forest);
  font-weight: 600;
}

.status.bad {
  color: var(--coral);
}

.panel-label {
  margin: 0;
  padding: 8px 12px 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-soft);
}

.preview-host {
  min-height: 160px;
  max-height: 40vh;
  overflow: auto;
  padding: 8px;
  background: #fff;
}

.output {
  margin: 0;
  max-height: 28vh;
  overflow: auto;
  padding: 8px 12px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--ink);
}

.output.err {
  color: var(--coral);
}

.notice {
  padding: 12px 14px;
}
</style>
