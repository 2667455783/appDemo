<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import {
  DOC_ACCEPT,
  kindLabel,
  parseLocalFile,
  revokeDoc,
  type OpenDoc,
} from '@/services/docPreview'

const router = useRouter()
const fileInput = ref<HTMLInputElement | null>(null)
const docs = ref<OpenDoc[]>([])
const activeId = ref('')
const loading = ref(false)
const error = ref('')
const sheetIndex = ref(0)
/** Markdown / HTML：渲染预览 / 查看原文 */
const textMode = ref<'preview' | 'source'>('preview')

const current = computed(() => docs.value.find((d) => d.id === activeId.value))

function pickFile() {
  error.value = ''
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  loading.value = true
  error.value = ''
  try {
    const doc = await parseLocalFile(file)
    docs.value = [...docs.value, doc]
    activeId.value = doc.id
    sheetIndex.value = 0
    textMode.value = 'preview'
    if (doc.parsed.kind === 'unsupported') {
      error.value = doc.parsed.reason
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '导入失败'
  } finally {
    loading.value = false
  }
}

function selectDoc(id: string) {
  activeId.value = id
  sheetIndex.value = 0
  textMode.value = 'preview'
  error.value = ''
  const doc = docs.value.find((d) => d.id === id)
  if (doc?.parsed.kind === 'unsupported') error.value = doc.parsed.reason
}

function removeDoc(id: string) {
  const hit = docs.value.find((d) => d.id === id)
  if (hit) revokeDoc(hit)
  docs.value = docs.value.filter((d) => d.id !== id)
  if (activeId.value === id) {
    activeId.value = docs.value[0]?.id ?? ''
    sheetIndex.value = 0
  }
}

onUnmounted(() => {
  docs.value.forEach(revokeDoc)
})
</script>

<template>
  <div class="page full">
    <PageHeader title="导入文档" subtle="从本机选择文件查看" @back="router.back()" />

    <input
      ref="fileInput"
      class="hidden-input"
      type="file"
      :accept="DOC_ACCEPT"
      @change="onFileChange"
    />

    <button class="btn primary block" type="button" :disabled="loading" @click="pickFile">
      {{ loading ? '正在解析…' : '选择本地文件' }}
    </button>
    <p class="page-sub" style="margin-top: 8px">支持 Word、PDF、Excel、TXT、Markdown（.md）、HTML、图片</p>
    <p v-if="error" class="page-sub err">{{ error }}</p>

    <div v-if="docs.length" class="chips" style="margin-top: 14px">
      <button
        v-for="d in docs"
        :key="d.id"
        class="chip"
        :class="{ on: d.id === activeId }"
        type="button"
        @click="selectDoc(d.id)"
      >
        {{ d.name }}
      </button>
    </div>

    <article v-if="current" class="card viewer">
      <div class="row space head">
        <div>
          <p class="file-name">{{ current.name }}</p>
          <p class="page-sub">{{ kindLabel(current.kind) }} · {{ current.sizeLabel }}</p>
        </div>
        <button class="btn sm ghost" type="button" @click="removeDoc(current.id)">移除</button>
      </div>

      <div v-if="current.parsed.kind === 'image'" class="stage">
        <img class="preview-img" :src="current.parsed.url" :alt="current.name" />
      </div>

      <pre v-else-if="current.parsed.kind === 'txt'" class="txt">{{ current.parsed.text }}</pre>

      <template v-else-if="current.parsed.kind === 'md'">
        <div class="md-toolbar">
          <button
            class="chip"
            :class="{ on: textMode === 'preview' }"
            type="button"
            @click="textMode = 'preview'"
          >
            预览
          </button>
          <button
            class="chip"
            :class="{ on: textMode === 'source' }"
            type="button"
            @click="textMode = 'source'"
          >
            原文
          </button>
        </div>
        <div v-if="textMode === 'preview'" class="rich md-rich" v-html="current.parsed.html" />
        <pre v-else class="txt">{{ current.rawText || '' }}</pre>
      </template>

      <template v-else-if="current.parsed.kind === 'html'">
        <div class="md-toolbar">
          <button
            class="chip"
            :class="{ on: textMode === 'preview' }"
            type="button"
            @click="textMode = 'preview'"
          >
            预览
          </button>
          <button
            class="chip"
            :class="{ on: textMode === 'source' }"
            type="button"
            @click="textMode = 'source'"
          >
            原文
          </button>
        </div>
        <iframe
          v-if="textMode === 'preview'"
          class="html-frame"
          title="HTML 预览"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          :srcdoc="current.parsed.html"
        />
        <pre v-else class="txt">{{ current.rawText || '' }}</pre>
      </template>

      <div
        v-else-if="current.parsed.kind === 'word'"
        class="rich"
        v-html="current.parsed.html"
      />

      <div v-else-if="current.parsed.kind === 'pdf'" class="pdf">
        <p v-if="current.parsed.truncated" class="page-sub">
          共 {{ current.parsed.total }} 页，仅预览前 {{ current.parsed.images.length }} 页
        </p>
        <img
          v-for="(src, i) in current.parsed.images"
          :key="i"
          class="pdf-page"
          :src="src"
          :alt="`第 ${i + 1} 页`"
        />
      </div>

      <div v-else-if="current.parsed.kind === 'excel'">
        <div class="chips" style="margin-bottom: 10px">
          <button
            v-for="(s, i) in current.parsed.sheets"
            :key="s.name"
            class="chip"
            :class="{ on: sheetIndex === i }"
            type="button"
            @click="sheetIndex = i"
          >
            {{ s.name }}
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <tbody>
              <tr v-for="(row, ri) in current.parsed.sheets[sheetIndex]?.rows ?? []" :key="ri">
                <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p v-else-if="current.parsed.kind === 'unsupported'" class="page-sub">{{ current.parsed.reason }}</p>
    </article>
  </div>
</template>

<style scoped>
.hidden-input {
  display: none;
}
.err {
  color: var(--coral);
  margin-top: 8px;
}
.viewer {
  margin-top: 14px;
}
.head {
  align-items: flex-start;
  margin-bottom: 12px;
}
.file-name {
  font-weight: 700;
  word-break: break-all;
}
.stage {
  overflow: auto;
}
.preview-img,
.pdf-page {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 10px;
  background: var(--paper);
}
.pdf-page + .pdf-page {
  margin-top: 10px;
}
.txt {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.55;
  font-family: var(--sans);
}
.md-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.html-frame {
  display: block;
  width: 100%;
  min-height: min(70vh, 560px);
  height: 70vh;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.rich {
  font-size: 14px;
  line-height: 1.65;
  overflow-x: auto;
}
.rich :deep(h1),
.rich :deep(h2),
.rich :deep(h3),
.rich :deep(h4),
.rich :deep(h5),
.rich :deep(h6) {
  margin: 12px 0 8px;
  font-family: var(--serif);
}
.rich :deep(p) {
  margin: 0 0 8px;
}
.rich :deep(ul),
.rich :deep(ol) {
  margin: 0 0 10px;
  padding-left: 1.35em;
}
.rich :deep(li) {
  margin: 2px 0;
}
.rich :deep(blockquote) {
  margin: 0 0 10px;
  padding: 6px 12px;
  border-left: 3px solid var(--forest);
  background: color-mix(in srgb, var(--moss) 55%, transparent);
  color: var(--ink-soft);
}
.rich :deep(hr) {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 14px 0;
}
.rich :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--paper);
}
.rich :deep(img) {
  max-width: 100%;
  height: auto;
}
.rich :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin: 0 0 10px;
}
.rich :deep(td),
.rich :deep(th) {
  border: 1px solid var(--line);
  padding: 4px 6px;
}
.rich :deep(th) {
  background: var(--moss);
  font-weight: 700;
}
.rich :deep(pre) {
  overflow-x: auto;
  background: var(--paper);
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
}
.rich :deep(pre code) {
  padding: 0;
  background: transparent;
}
.rich :deep(a) {
  color: var(--forest);
  word-break: break-all;
}
.table-wrap {
  overflow: auto;
  max-height: 70vh;
  border: 1px solid var(--line);
  border-radius: 10px;
}
table {
  border-collapse: collapse;
  min-width: 100%;
  font-size: 12px;
}
td {
  border: 1px solid var(--line);
  padding: 6px 8px;
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}
tr:first-child td {
  font-weight: 700;
  background: var(--moss);
}
</style>
