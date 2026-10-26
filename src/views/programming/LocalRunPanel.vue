<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { scheduleRemotePush } from '@/api/syncGate'
import { buildLocalBundle, type LocalRunProject } from '@/domains/programming/localrun/bundle'
import FileTree from '@/views/programming/FileTree.vue'

type View = 'preview' | 'code' | 'console'
type LogLine = { level: string; text: string }

const props = defineProps<{
  project: LocalRunProject
  /** 外部指定打开的文件（如从「文件」资源管理器点入） */
  openPath?: string
  /** 外部请求切到的视图 */
  focusView?: View | ''
  /** 已落库的 git_repo.id；有则编辑防抖写回 */
  repoId?: number | null
  branch?: string
}>()
const emit = defineEmits<{
  ran: [ok: boolean]
  'update:openPath': [path: string]
  filesDirty: [payload: { files: Record<string, string>; openFile?: string }]
}>()

const MAX_LOGS = 200

const files = ref<Record<string, string>>({})
const current = ref('')
const view = ref<View>('preview')
const building = ref(false)
const error = ref('')
const notes = ref<string[]>([])
const logs = ref<LogLine[]>([])
const dirty = ref(false)
const frameEl = ref<HTMLIFrameElement | null>(null)
const stageHost = ref<HTMLElement | null>(null)
const treeOpen = ref(false)
/** 最近一次编译出的完整 HTML */
const lastHtml = ref('')

function pushLog(level: string, text: string) {
  logs.value = [...logs.value, { level, text }].slice(-MAX_LOGS)
}

function setView(next: View) {
  view.value = next
  if (next !== 'code') treeOpen.value = false
}

function clearPreviewFrame() {
  frameEl.value = null
  const host = stageHost.value
  if (host) host.replaceChildren()
}

const paths = computed(() =>
  Object.keys(files.value)
    .filter((p) => !p.startsWith('__localrun_'))
    .sort(),
)
const rootLabel = computed(() => {
  const t = props.project.title || 'PROJECT'
  const leaf = t.includes('/') ? t.slice(t.lastIndexOf('/') + 1) : t
  return leaf.replace(/\s·\s.*$/, '').toUpperCase() || 'PROJECT'
})
const errorCount = computed(() => logs.value.filter((l) => l.level === 'error').length)

function schedulePersist() {
  if (!props.repoId || !props.branch) return
  scheduleRemotePush(
    `git-branch:${props.repoId}:${props.branch}`,
    () => {
      emit('filesDirty', {
        files: { ...files.value },
        openFile: current.value || undefined,
      })
    },
    800,
  )
}

const code = computed({
  get: () => files.value[current.value] ?? '',
  set: (v: string) => {
    files.value = { ...files.value, [current.value]: v }
    dirty.value = true
    schedulePersist()
  },
})

function vendorBase(): string {
  return new URL('vendor/', window.location.origin + import.meta.env.BASE_URL).href
}

function selectFile(path: string) {
  if (!path || files.value[path] == null) return
  current.value = path
  setView('code')
  treeOpen.value = false
  emit('update:openPath', path)
}

function openTree() {
  setView('code')
  treeOpen.value = true
}

function closeTree() {
  treeOpen.value = false
}

/**
 * 命令式创建 iframe：先设 sandbox 再插入，再用 document.write 写入。
 * 比 Vue :srcdoc / data: URL 更稳；避免「看得见、点不着」。
 */
async function mountPreview(html: string) {
  lastHtml.value = html
  setView('preview')
  await nextTick()
  const host = stageHost.value
  if (!host) {
    pushLog('error', '[host] 预览容器未挂载')
    return
  }
  clearPreviewFrame()

  const el = document.createElement('iframe')
  el.className = 'lr-frame'
  el.title = '本地运行预览'
  el.setAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads',
  )
  // 内联样式：命令式节点不受 scoped CSS 保证，避免高度为 0 / pointer-events 被覆盖
  el.style.cssText =
    'display:block;width:100%;height:420px;border:0;border-radius:0;background:#fff;pointer-events:auto;touch-action:manipulation;position:relative;z-index:2;transform:translateZ(0);'
  host.appendChild(el)
  frameEl.value = el

  try {
    const doc = el.contentDocument
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
      pushLog('info', '[host] 预览已挂载 document.write')
      return
    }
  } catch {
    /* fall through */
  }

  try {
    el.srcdoc = html
    pushLog('info', '[host] 预览已挂载 srcdoc')
  } catch (err) {
    pushLog('error', `[host] 预览挂载失败：${err instanceof Error ? err.message : String(err)}`)
  }
}

async function run() {
  if (building.value) return
  building.value = true
  error.value = ''
  logs.value = []
  try {
    const res = await buildLocalBundle(
      { files: files.value, assetBase: props.project.assetBase },
      { vendorBase: vendorBase() },
    )
    notes.value = res.warnings
    await mountPreview(res.html)
    dirty.value = false
    emit('ran', true)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    emit('ran', false)
  } finally {
    building.value = false
  }
}

function onMessage(e: MessageEvent) {
  const data = e.data as { __localrun?: number; type?: string; level?: string; text?: string } | null
  if (!data?.__localrun) return
  // 放宽来源校验：opaque iframe 下偶发 source 对不上导致控制台完全无日志
  const win = frameEl.value?.contentWindow
  if (win && e.source && e.source !== win) return
  const level = data.type === 'error' ? 'error' : data.level || 'log'
  pushLog(level, data.text ?? '')
}

function load(project: LocalRunProject) {
  files.value = { ...project.files }
  const keys = Object.keys(project.files).filter((p) => !p.startsWith('__localrun_'))
  const prefer = props.openPath && project.files[props.openPath] != null ? props.openPath : project.openFile
  current.value = prefer && project.files[prefer] != null ? prefer : (keys[0] ?? '')
  treeOpen.value = false
  setView(props.focusView === 'code' || props.focusView === 'console' ? props.focusView : 'preview')
  notes.value = []
  void run()
}

watch(
  () => props.project,
  (p) => load(p),
)

watch(
  () => props.openPath,
  (p) => {
    if (p && files.value[p] != null && p !== current.value) {
      current.value = p
    }
  },
)

watch(
  () => props.focusView,
  (v) => {
    if (v) setView(v)
  },
)

onMounted(() => {
  window.addEventListener('message', onMessage)
  load(props.project)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  clearPreviewFrame()
})

defineExpose({ selectFile, openTree, closeTree, paths, files })
</script>

<template>
  <div class="local-run">
    <div class="lr-bar">
      <div class="lr-tabs">
        <button type="button" class="lr-tab" :class="{ on: view === 'preview' }" @click="setView('preview')">
          预览
        </button>
        <button type="button" class="lr-tab" :class="{ on: view === 'code' }" @click="setView('code')">代码</button>
        <button type="button" class="lr-tab" :class="{ on: view === 'console' }" @click="setView('console')">
          控制台<span v-if="errorCount" class="lr-badge">{{ errorCount }}</span>
        </button>
      </div>
      <div class="lr-bar-actions">
        <button type="button" class="lr-files" @click="openTree">文件</button>
        <button type="button" class="lr-run" :disabled="building" @click="run">
          {{ building ? '编译中…' : dirty ? '运行*' : '运行' }}
        </button>
      </div>
    </div>

    <p class="lr-title">{{ project.title }}</p>
    <p v-if="error" class="lr-error">{{ error }}</p>

    <!-- 预览容器始终挂载（v-show），避免切 Tab 毁掉 iframe；iframe 由 mountPreview 命令式插入 -->
    <div v-show="view === 'preview'" class="lr-stage">
      <p v-if="building && !lastHtml" class="lr-hint">正在 App 内编译项目…</p>
      <div ref="stageHost" class="lr-frame-host" />
    </div>

    <div v-show="view === 'code'" class="lr-code">
      <div class="lr-edit">
        <div class="lr-file-bar">
          <button type="button" class="lr-path-btn" :title="current || '打开文件树'" @click="openTree">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
            </svg>
            <span class="lr-file-path">{{ current || '选择文件' }}</span>
          </button>
        </div>
        <textarea
          v-model="code"
          class="lr-editor"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
        />
      </div>

      <div v-if="treeOpen" class="lr-drawer-mask" aria-hidden="true" @click="closeTree" />
      <aside v-if="treeOpen" class="lr-drawer" aria-label="资源管理器">
        <header class="lr-drawer-head">
          <div>
            <p class="lr-drawer-title">资源管理器</p>
            <p class="lr-drawer-sub">{{ rootLabel }} · {{ paths.length }} 个文件</p>
          </div>
          <button type="button" class="lr-drawer-close" aria-label="关闭" @click="closeTree">✕</button>
        </header>
        <div class="lr-drawer-body">
          <FileTree
            :paths="paths"
            :root-label="rootLabel"
            :selected="current"
            :expand-to="current"
            @select="selectFile"
          />
        </div>
      </aside>
    </div>

    <div v-show="view === 'console'" class="lr-console">
      <p v-if="!logs.length && !notes.length" class="lr-hint">暂无输出</p>
      <pre v-for="(n, i) in notes" :key="`n${i}`" class="lr-line note">{{ n }}</pre>
      <pre v-for="(l, i) in logs" :key="i" class="lr-line" :class="l.level">{{ l.text }}</pre>
    </div>
  </div>
</template>

<style scoped>
.local-run {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.lr-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.lr-tabs {
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: var(--moss);
  border: 1px solid var(--line);
}

.lr-tab {
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
}

.lr-tab.on {
  background: var(--paper);
  color: var(--forest);
  box-shadow: 0 1px 2px rgba(28, 25, 21, 0.08);
}

.lr-badge {
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--coral) 18%, transparent);
  color: var(--coral);
  font-size: 10px;
}

.lr-bar-actions {
  display: flex;
  gap: 6px;
}

.lr-files,
.lr-run {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--forest);
  font-size: 12px;
  font-weight: 600;
}

.lr-run {
  background: var(--forest);
  color: var(--on-primary, #fff);
  border-color: var(--forest);
}

.lr-run:disabled {
  opacity: 0.55;
}

.lr-title {
  margin: 0;
  font-size: 12px;
  color: var(--ink-soft);
}

.lr-error {
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--coral) 40%, var(--line));
  background: color-mix(in srgb, var(--coral) 8%, var(--paper));
  color: var(--coral);
  font-size: 12px;
  white-space: pre-wrap;
  line-height: 1.45;
}

.lr-stage,
.lr-code,
.lr-console {
  min-height: 380px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
}

.lr-code,
.lr-console {
  overflow: hidden;
}

.lr-stage {
  /* 故意不用 overflow:hidden + isolation：部分 Chromium 下会让 iframe「看得见、点不着」 */
  position: relative;
  z-index: 1;
  overflow: visible;
  background: #fff;
  touch-action: manipulation;
  overscroll-behavior: contain;
}

.lr-frame-host {
  display: block;
  width: 100%;
  min-height: 420px;
  background: #fff;
}

.lr-frame-host :deep(iframe.lr-frame),
.lr-frame-host iframe.lr-frame {
  display: block;
  width: 100%;
  height: 420px;
  border: 0;
  border-radius: 0;
  background: #fff;
  pointer-events: auto !important;
  touch-action: manipulation;
  position: relative;
  z-index: 2;
  /* 独立合成层，减轻祖先圆角裁剪导致的命中错位 */
  transform: translateZ(0);
}

.lr-hint {
  margin: 0;
  padding: 40px 16px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.lr-code {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--paper);
  min-height: min(52vh, 480px);
  overflow: hidden;
}

.lr-edit {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--paper-2);
}

.lr-file-bar {
  flex-shrink: 0;
  border-bottom: 1px solid var(--line);
  background: var(--moss);
}

.lr-path-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: var(--forest);
  text-align: left;
  cursor: pointer;
}

.lr-file-path {
  flex: 1;
  min-width: 0;
  color: var(--ink-soft);
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lr-editor {
  flex: 1;
  min-height: 280px;
  margin: 0;
  border: 0;
  resize: none;
  padding: 12px;
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

.lr-drawer-mask {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: rgba(28, 25, 21, 0.35);
  pointer-events: auto;
}

.lr-drawer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 5;
  width: min(78%, 280px);
  display: flex;
  flex-direction: column;
  background: var(--paper);
  border-right: 1px solid var(--line);
  box-shadow: 8px 0 24px rgba(28, 25, 21, 0.12);
  pointer-events: auto;
}

.lr-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--line);
}

.lr-drawer-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}

.lr-drawer-sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--ink-soft);
}

.lr-drawer-close {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-soft);
}

.lr-drawer-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
}

.lr-console {
  padding: 10px 12px;
  overflow: auto;
  background: var(--paper-2);
}

.lr-line {
  margin: 0 0 6px;
  font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
}

.lr-line.note {
  color: var(--ink-soft);
}

.lr-line.warn {
  color: #a15c00;
}

.lr-line.error {
  color: var(--coral);
}
</style>
