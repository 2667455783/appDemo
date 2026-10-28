<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  deleteUserProject,
  getUserProject,
  listUserProjects,
  saveUserProject,
  uploadUserProjectZip,
  type UserProjectSummary,
} from '@/api/personalProjects'
import { scheduleRemotePush } from '@/api/syncGate'
import { buildLocalBundle, type LocalRunProject } from '@/domains/programming/localrun/bundle'
import { filesFromFileList } from '@/domains/programming/localrun/fromLocalFiles'
import { fuzzyFindPaths } from '@/domains/programming/localrun/fuzzyPath'
import { findMatches } from '@/domains/programming/localrun/highlight'
import { STARTERS, type StarterId } from '@/domains/programming/stackblitz/templates'
import AppIcon from '@/components/AppIcon.vue'
import FileSourceSheet from '@/components/FileSourceSheet.vue'
import {
  canUseNativeFilePick,
  cancelDeviceFilePick,
  onIncomingDeviceFiles,
  pickDeviceFiles,
  shouldOfferFileSourceSheet,
  takeStashedIncomingFiles,
  type FilePickSource,
} from '@/services/pickDeviceFile'
import {
  bindErudaPreviewIframe,
  destroyErudaPanel,
  erudaClearLogs,
  erudaPushLog,
  handleInspectPickFromPreview,
  mountErudaPanel,
  revealErudaPanel,
  setErudaInspectingHandler,
} from '@/utils/erudaPanel'
import FileTree from '@/views/programming/FileTree.vue'

/** Monaco + TS worker：仅进入编程编辑区时再下载，不进首屏 */
const MonacoCodeEditor = defineAsyncComponent({
  loader: () => import('@/views/programming/MonacoCodeEditor.vue'),
  delay: 80,
})

type View = 'preview' | 'code' | 'console'
type DrawerTab = 'files' | 'search' | 'git'
type LogLine = { level: string; text: string }
type ContentHit = {
  path: string
  line: number
  col: number
  text: string
  start: number
  end: number
  match: string
}
type ContentFileGroup = { path: string; name: string; hits: ContentHit[]; count: number }

const props = defineProps<{
  project: LocalRunProject | null
  /** 外部指定打开的文件（如从「文件」资源管理器点入） */
  openPath?: string
  /** 外部请求切到的视图 */
  focusView?: View | ''
  /** 已落库的 git_repo.id；有则编辑防抖写回 */
  repoId?: number | null
  branch?: string
  repoLabel?: string
  busy?: boolean
}>()
const emit = defineEmits<{
  ran: [ok: boolean]
  'update:openPath': [path: string]
  filesDirty: [payload: { files: Record<string, string>; openFile?: string }]
  leave: []
  createStarter: [id: StarterId]
  uploadLocal: []
  uploadLocalFolder: []
  /** 打开已落库的个人项目到工作台 */
  openSavedProject: [project: LocalRunProject]
}>()

const starters = STARTERS
type FilesAction = '' | 'templates' | 'upload' | 'projects'

const MAX_LOGS = 200
const MAX_SEARCH_FILES = 48
const MAX_HITS_PER_FILE = 40

const files = ref<Record<string, string>>({})
const current = ref('')
const view = ref<View>('code')
const building = ref(false)
const error = ref('')
const notes = ref<string[]>([])
const logs = ref<LogLine[]>([])
const dirty = ref(false)
const frameEl = ref<HTMLIFrameElement | null>(null)
const stageHost = ref<HTMLElement | null>(null)
const editorRef = ref<{ openSearch: (focusReplace?: boolean, presetQuery?: string) => void } | null>(null)
const treeOpen = ref(false)
const drawerTab = ref<DrawerTab>('files')
const fileQuery = ref('')
const fileQueryRef = ref<HTMLInputElement | null>(null)
const contentQuery = ref('')
const contentReplace = ref('')
const contentInclude = ref('')
const contentExclude = ref('')
const contentQueryRef = ref<HTMLInputElement | null>(null)
const contentCase = ref(false)
const contentRegex = ref(false)
const contentWord = ref(false)
const contentReplaceOpen = ref(true)
const contentOpenFiles = ref<Set<string>>(new Set())
/** 资源管理器内：初始化模板 / 上传本地 / 个人项目 子面板 */
const filesAction = ref<FilesAction>('')
const personalList = ref<UserProjectSummary[]>([])
const personalBusy = ref(false)
const personalError = ref('')
const personalZipInput = ref<HTMLInputElement | null>(null)
const personalFilesInput = ref<HTMLInputElement | null>(null)
const personalFolderInput = ref<HTMLInputElement | null>(null)
const fileSourceOpen = ref(false)
const fileSourceKind = ref<'zip' | 'files' | 'folder'>('zip')
const wechatPickWaiting = ref(false)
const fileSourceHint = computed(() => {
  if (fileSourceKind.value === 'zip') {
    return '选「微信聊天文件」会打开微信：在聊天里打开 .zip →「用其他应用打开」→ 学习宝典'
  }
  if (fileSourceKind.value === 'folder') {
    return '手机端请多选文件夹内的文件（系统不一定支持直接选文件夹）'
  }
  return '选「微信聊天文件」会打开微信：在聊天里打开文件 →「用其他应用打开」→ 学习宝典'
})
/** 底部运行结果是否展开（默认收起，用户点击才展开） */
const consoleOpen = ref(false)
/** Elements 点选中：收起控制台区域，避免挡住预览页 */
const erudaInspecting = ref(false)
/** 最近一次编译出的完整 HTML */
const lastHtml = ref('')
/** 已运行过且不在代码页时才显示底部工具栏 */
const dockVisible = computed(() => Boolean(lastHtml.value) && view.value !== 'code')
/** eruda 内联挂载点（覆盖原「运行结果」文本区） */
const consoleHost = ref<HTMLElement | null>(null)
const rootEl = ref<HTMLElement | null>(null)
let erudaReady = false

/** 底部控制台高度（px），可拖动；记忆到 localStorage */
const DOCK_H_KEY = 'lr-dock-console-h'
/** 展开后松手时的最小高度（含 dock 工具栏） */
const DOCK_MIN_H = 160
/** 顶部菜单栏高度，拖高时必须留给它 */
const DOCK_TOP_RESERVE = 48
/** 中间预览/代码区至少留这么多，避免整页被控制台吃掉 */
const DOCK_STAGE_MIN = 120
const DOCK_DEFAULT_H = 280
/** 收起态栏高度（约），上拉起点 */
const DOCK_BAR_H = 40
/** 下拉低于此高度松手则收起 */
const DOCK_CLOSE_H = 96

function readSavedDockH(): number {
  try {
    const n = Number(localStorage.getItem(DOCK_H_KEY) || '')
    if (Number.isFinite(n) && n >= DOCK_MIN_H) return Math.round(n)
  } catch {
    /* ignore */
  }
  return DOCK_DEFAULT_H
}

const consoleHeightPx = ref(readSavedDockH())
/** 拖动中：锁页面滚动、禁 iframe 抢触控 */
const dockResizing = ref(false)
const dockEl = ref<HTMLElement | null>(null)
let dockPointerTracking = false
let dockResizePointerId: number | null = null
let dockResizeStartY = 0
let dockResizeStartH = 0
let dockCaptureEl: HTMLElement | null = null
let dockResizeRaf = 0
let dockResizePendingH = 0
/** 本次拖动是否真的改变过高度（区分点按握把） */
let dockDidResize = false

function dockMaxH(): number {
  const avail = rootEl.value?.clientHeight || window.innerHeight || 600
  return Math.max(DOCK_MIN_H, avail - DOCK_TOP_RESERVE - DOCK_STAGE_MIN)
}

function clampDockH(h: number, minH = DOCK_MIN_H): number {
  return Math.min(dockMaxH(), Math.max(minH, Math.round(h)))
}

function persistDockH() {
  try {
    localStorage.setItem(DOCK_H_KEY, String(consoleHeightPx.value))
  } catch {
    /* ignore */
  }
}

const dockStyle = computed(() => {
  if (!consoleOpen.value) return undefined
  return {
    height: `${consoleHeightPx.value}px`,
    flex: '0 0 auto',
    maxHeight: 'none',
    minHeight: dockResizing.value ? `${DOCK_BAR_H}px` : `${DOCK_MIN_H}px`,
  }
})

function applyDockHeight(h: number) {
  dockResizePendingH = h
  if (dockResizeRaf) return
  dockResizeRaf = requestAnimationFrame(() => {
    dockResizeRaf = 0
    consoleHeightPx.value = dockResizePendingH
  })
}

function clientYOf(e: PointerEvent | TouchEvent): number {
  if ('clientY' in e && typeof (e as PointerEvent).clientY === 'number' && e.type.startsWith('pointer')) {
    return (e as PointerEvent).clientY
  }
  const te = e as TouchEvent
  const t = te.touches[0] || te.changedTouches[0]
  return t?.clientY ?? dockResizeStartY
}

function onDockResizeMove(e: PointerEvent | TouchEvent) {
  if (!dockPointerTracking) return
  if ('pointerId' in e && dockResizePointerId != null && e.pointerId !== dockResizePointerId) return
  // 专用握把上必须 preventDefault，否则 WebView 会 cancel 掉后续 move
  if (e.cancelable) e.preventDefault()
  const y = clientYOf(e)
  const dy = dockResizeStartY - y
  if (Math.abs(dy) > 2) dockDidResize = true
  const next = dockResizeStartH + dy
  applyDockHeight(clampDockH(next, DOCK_BAR_H))
}

function finishDockResize() {
  if (!dockPointerTracking) return
  dockPointerTracking = false
  dockResizing.value = false
  unbindDockResize()
  if (dockResizeRaf) {
    cancelAnimationFrame(dockResizeRaf)
    dockResizeRaf = 0
    consoleHeightPx.value = dockResizePendingH
  }
  dockResizePointerId = null
  dockCaptureEl = null

  const h = consoleHeightPx.value
  if (!consoleOpen.value) return

  // 握把轻点不负责展开/收起（仅箭头）；拖动中临时打开但几乎没拉动则收回
  if (!dockDidResize) {
    if (h <= DOCK_BAR_H + 8) consoleOpen.value = false
    return
  }

  if (h < DOCK_CLOSE_H) {
    consoleOpen.value = false
    return
  }
  consoleHeightPx.value = clampDockH(Math.max(h, DOCK_MIN_H))
  persistDockH()
  void ensureErudaAfterOpen()
}

function onDockResizeEnd(e: PointerEvent | TouchEvent) {
  if (!dockPointerTracking) return
  if ('pointerId' in e && dockResizePointerId != null && e.pointerId !== dockResizePointerId) return
  finishDockResize()
}

function unbindDockResize() {
  window.removeEventListener('pointermove', onDockResizeMove as EventListener)
  window.removeEventListener('pointerup', onDockResizeEnd as EventListener)
  window.removeEventListener('pointercancel', onDockResizeEnd as EventListener)
  window.removeEventListener('touchmove', onDockResizeMove as EventListener)
  window.removeEventListener('touchend', onDockResizeEnd as EventListener)
  window.removeEventListener('touchcancel', onDockResizeEnd as EventListener)
}

/**
 * 直接拖工具栏调高；点在箭头按钮上不启动拖动，避免抢 click。
 */
function onDockResizeStart(e: PointerEvent) {
  if (e.button !== undefined && e.button !== 0) return
  if (dockPointerTracking) return
  const t = e.target as HTMLElement | null
  if (t?.closest('.lr-dock-chev, button')) return
  e.preventDefault()
  dockCaptureEl = e.currentTarget as HTMLElement
  dockResizePointerId = e.pointerId
  dockPointerTracking = true
  dockDidResize = false
  dockResizing.value = true
  dockResizeStartY = e.clientY
  const measured = dockEl.value?.getBoundingClientRect().height
  if (!consoleOpen.value) {
    // 收起态直接拉开壳子，高度从栏高开始跟手（松手再挂 eruda）
    consoleOpen.value = true
    dockResizeStartH = DOCK_BAR_H
    consoleHeightPx.value = DOCK_BAR_H
  } else {
    dockResizeStartH =
      measured && measured > 0 ? measured : consoleHeightPx.value
  }
  try {
    dockCaptureEl.setPointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
  window.addEventListener('pointermove', onDockResizeMove as EventListener, { passive: false })
  window.addEventListener('pointerup', onDockResizeEnd as EventListener)
  window.addEventListener('pointercancel', onDockResizeEnd as EventListener)
  window.addEventListener('touchmove', onDockResizeMove as EventListener, { passive: false })
  window.addEventListener('touchend', onDockResizeEnd as EventListener)
  window.addEventListener('touchcancel', onDockResizeEnd as EventListener)
}

/** 点击展开/收起 */
function onDockToggleClick() {
  consoleOpen.value = !consoleOpen.value
}

function ensureEruda() {
  const host = consoleHost.value
  if (!host) return
  if (erudaReady) {
    revealErudaPanel()
    bindErudaPreviewIframe(frameEl.value)
    return
  }
  mountErudaPanel(host)
  erudaReady = true
  bindErudaPreviewIframe(frameEl.value)
  // 展开前已产生的日志回放到 eruda
  for (const n of notes.value) erudaPushLog('info', n)
  if (error.value && !logs.value.some((l) => l.text === error.value)) {
    erudaPushLog('error', error.value)
  }
  for (const l of logs.value) erudaPushLog(l.level, l.text)
}

/** 等 dock 展开并完成 flex 布局后再挂 eruda，避免高度为 0 导致空白 */
async function ensureErudaAfterOpen() {
  await nextTick()
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  ensureEruda()
}

function pushLog(level: string, text: string) {
  logs.value = [...logs.value, { level, text }].slice(-MAX_LOGS)
  erudaPushLog(level, text)
}

function clearRunLogs() {
  logs.value = []
  erudaClearLogs()
}

function setView(next: View) {
  if (next === 'console') {
    consoleOpen.value = true
    view.value = 'preview'
    return
  }
  view.value = next
}

function clearPreviewFrame() {
  bindErudaPreviewIframe(null)
  frameEl.value = null
  const host = stageHost.value
  if (host) host.replaceChildren()
}

const paths = computed(() =>
  Object.keys(files.value)
    .filter((p) => !p.startsWith('__localrun_'))
    .sort(),
)
const hasFiles = computed(() => paths.value.length > 0)
const rootLabel = computed(() => {
  const t = props.project?.title || 'PROJECT'
  const leaf = t.includes('/') ? t.slice(t.lastIndexOf('/') + 1) : t
  return leaf.replace(/\s·\s.*$/, '').toUpperCase() || 'PROJECT'
})
/** 顶栏短标题：去掉「本地上传 · hash」这类后缀 */
const shortTitle = computed(() => {
  if (!props.project || !hasFiles.value) return '未打开项目'
  const t = props.project.title || '未命名'
  const leaf = t.includes('/') ? t.slice(t.lastIndexOf('/') + 1) : t
  const clean = leaf.replace(/\s·\s.*$/, '').trim() || '未命名'
  return clean.length > 16 ? `${clean.slice(0, 16)}…` : clean
})
const errorCount = computed(() => logs.value.filter((l) => l.level === 'error').length)

const fileHits = computed(() => fuzzyFindPaths(paths.value, fileQuery.value))

function splitGlobs(raw: string) {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function globToRegExp(glob: string) {
  const g = glob.replace(/\\/g, '/')
  let out = '^'
  for (let i = 0; i < g.length; i++) {
    const c = g[i]!
    if (c === '*' && g[i + 1] === '*') {
      out += '.*'
      i++
      if (g[i + 1] === '/') i++
      continue
    }
    if (c === '*') {
      out += '[^/]*'
      continue
    }
    if (c === '?') {
      out += '[^/]'
      continue
    }
    if ('[.+$^|(){}'.includes(c)) out += `\\${c}`
    else out += c
  }
  out += '$'
  return new RegExp(out, 'i')
}

function pathMatchesGlobs(path: string, globs: string[]) {
  if (!globs.length) return true
  const p = path.replace(/\\/g, '/')
  const leaf = p.includes('/') ? p.slice(p.lastIndexOf('/') + 1) : p
  return globs.some((g) => {
    const re = globToRegExp(g.startsWith('**/') || g.includes('/') ? g : `**/${g}`)
    return re.test(p) || re.test(leaf)
  })
}

function escHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
}

function highlightSnippet(line: string, match: string) {
  if (!match) return escHtml(line)
  const i = line.toLowerCase().indexOf(match.toLowerCase())
  if (i < 0) return escHtml(line)
  return `${escHtml(line.slice(0, i))}<mark>${escHtml(line.slice(i, i + match.length))}</mark>${escHtml(line.slice(i + match.length))}`
}

function expandContentReplace(matched: string) {
  if (!contentRegex.value) return contentReplace.value
  try {
    return matched.replace(
      new RegExp(contentQuery.value, contentCase.value ? '' : 'i'),
      contentReplace.value,
    )
  } catch {
    return contentReplace.value
  }
}

const contentSearch = computed(() => {
  const q = contentQuery.value
  const empty = {
    groups: [] as ContentFileGroup[],
    invalid: false,
    total: 0,
    fileCount: 0,
    truncated: false,
  }
  if (!q.trim()) return empty
  const opts = {
    caseSensitive: contentCase.value,
    regex: contentRegex.value,
    wholeWord: contentWord.value,
  }
  const include = splitGlobs(contentInclude.value)
  const exclude = splitGlobs(contentExclude.value)
  const groups: ContentFileGroup[] = []
  let invalid = false
  let total = 0
  let truncated = false
  for (const path of paths.value) {
    if (include.length && !pathMatchesGlobs(path, include)) continue
    if (exclude.length && pathMatchesGlobs(path, exclude)) continue
    const src = files.value[path] ?? ''
    const found = findMatches(src, q, opts)
    if (found.invalid) {
      invalid = true
      break
    }
    if (!found.ranges.length) continue
    total += found.ranges.length
    if (groups.length >= MAX_SEARCH_FILES) {
      truncated = true
      continue
    }
    const hits: ContentHit[] = []
    for (const r of found.ranges) {
      if (hits.length >= MAX_HITS_PER_FILE) {
        truncated = true
        break
      }
      const before = src.slice(0, r.start)
      const line = before.split('\n').length
      const col = (before.split('\n').pop()?.length ?? 0) + 1
      const lineStart = before.lastIndexOf('\n') + 1
      const lineEnd = src.indexOf('\n', r.end)
      const text = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd)
      hits.push({
        path,
        line,
        col,
        text,
        start: r.start,
        end: r.end,
        match: src.slice(r.start, r.end),
      })
    }
    const name = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path
    groups.push({ path, name, hits, count: found.ranges.length })
  }
  return { groups, invalid, total, fileCount: groups.length, truncated }
})

const contentCountLabel = computed(() => {
  if (contentSearch.value.invalid) return '表达式无效'
  if (!contentQuery.value.trim()) return '在文件中搜索'
  if (!contentSearch.value.total) return '0 个结果'
  const base = `${contentSearch.value.fileCount} 文件中有 ${contentSearch.value.total} 个结果`
  return contentSearch.value.truncated ? `${base}（已截断）` : base
})

watch(
  () => contentSearch.value.groups.map((g) => g.path).join('\0'),
  (key) => {
    if (!key) return
    contentOpenFiles.value = new Set(contentSearch.value.groups.map((g) => g.path))
  },
)

function isSearchFileOpen(path: string) {
  return contentOpenFiles.value.has(path)
}

function toggleSearchFile(path: string) {
  const next = new Set(contentOpenFiles.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  contentOpenFiles.value = next
}

function clearContentSearch() {
  contentQuery.value = ''
  contentReplace.value = ''
}

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

function selectFile(path: string, opts: { keepDrawer?: boolean; searchText?: string } = {}) {
  if (!path || files.value[path] == null) return
  current.value = path
  view.value = 'code'
  if (!opts.keepDrawer) treeOpen.value = false
  emit('update:openPath', path)
  if (opts.searchText) {
    void nextTick(() => editorRef.value?.openSearch(false, opts.searchText))
  }
}

function openDrawer(tab: DrawerTab = 'files') {
  drawerTab.value = tab
  treeOpen.value = true
  void nextTick(() => {
    if (tab === 'files') fileQueryRef.value?.focus()
    if (tab === 'search') contentQueryRef.value?.focus()
  })
}

function openTree() {
  openDrawer('files')
}

/** 路径栏：全局模糊找文件 */
function openFileFinder() {
  fileQuery.value = ''
  openDrawer('files')
}

/** 预览页返回改代码（仅运行后顶栏展示） */
function goToCode() {
  consoleOpen.value = false
  view.value = 'code'
}

function openContentHit(hit: ContentHit) {
  selectFile(hit.path, { keepDrawer: true, searchText: contentQuery.value })
}

function replaceContentOne(hit: ContentHit) {
  const src = files.value[hit.path]
  if (src == null) return
  const insert = expandContentReplace(src.slice(hit.start, hit.end))
  files.value = {
    ...files.value,
    [hit.path]: `${src.slice(0, hit.start)}${insert}${src.slice(hit.end)}`,
  }
  dirty.value = true
  schedulePersist()
  if (current.value === hit.path) {
    void nextTick(() => editorRef.value?.openSearch(false, contentQuery.value))
  }
}

function replaceContentAll() {
  if (!contentQuery.value.trim() || contentSearch.value.invalid || !contentSearch.value.total) return
  const opts = {
    caseSensitive: contentCase.value,
    regex: contentRegex.value,
    wholeWord: contentWord.value,
  }
  const include = splitGlobs(contentInclude.value)
  const exclude = splitGlobs(contentExclude.value)
  const nextFiles = { ...files.value }
  for (const path of paths.value) {
    if (include.length && !pathMatchesGlobs(path, include)) continue
    if (exclude.length && pathMatchesGlobs(path, exclude)) continue
    const src = nextFiles[path]
    if (src == null) continue
    const found = findMatches(src, contentQuery.value, opts)
    if (found.invalid || !found.ranges.length) continue
    let out = src
    for (let i = found.ranges.length - 1; i >= 0; i--) {
      const r = found.ranges[i]!
      const insert = expandContentReplace(out.slice(r.start, r.end))
      out = `${out.slice(0, r.start)}${insert}${out.slice(r.end)}`
    }
    nextFiles[path] = out
  }
  files.value = nextFiles
  dirty.value = true
  schedulePersist()
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
    'display:block;width:100%;height:100%;border:0;border-radius:0;background:#fff;pointer-events:auto;touch-action:manipulation;position:absolute;inset:0;z-index:2;'
  host.appendChild(el)
  frameEl.value = el

  try {
    const doc = el.contentDocument
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
      pushLog('info', '[host] 预览已挂载 document.write')
      bindErudaPreviewIframe(el)
      return
    }
  } catch {
    /* fall through */
  }

  try {
    el.srcdoc = html
    pushLog('info', '[host] 预览已挂载 srcdoc')
    el.addEventListener('load', () => bindErudaPreviewIframe(el), { once: true })
  } catch (err) {
    pushLog('error', `[host] 预览挂载失败：${err instanceof Error ? err.message : String(err)}`)
  }
}

async function run() {
  if (building.value) return
  if (!hasFiles.value) {
    pushLog('info', '[host] 还没有项目文件，请先点左上角打开资源管理器，选择模板或上传本地文件')
    return
  }
  building.value = true
  error.value = ''
  clearRunLogs()
  try {
    const res = await buildLocalBundle(
      {
        files: files.value,
        assetBase: props.project?.assetBase,
        // 当前打开的 html 优先作为预览入口（多页面练习项目没有根 index.html）
        openFile: current.value || props.project?.openFile,
      },
      { vendorBase: vendorBase() },
    )
    notes.value = res.warnings
    for (const n of res.warnings) erudaPushLog('info', n)
    await mountPreview(res.html)
    dirty.value = false
    emit('ran', true)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    pushLog('error', error.value)
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
  if (data.type === 'inspect-pick') {
    handleInspectPickFromPreview()
    return
  }
  const level = data.type === 'error' ? 'error' : data.level || 'log'
  pushLog(level, data.text ?? '')
}

function load(project: LocalRunProject | null) {
  files.value = { ...(project?.files || {}) }
  const keys = Object.keys(files.value).filter((p) => !p.startsWith('__localrun_'))
  const prefer =
    props.openPath && files.value[props.openPath] != null ? props.openPath : project?.openFile
  current.value = prefer && files.value[prefer] != null ? prefer : (keys[0] ?? '')
  drawerTab.value = 'files'
  fileQuery.value = ''
  contentQuery.value = ''
  contentReplace.value = ''
  contentInclude.value = ''
  contentExclude.value = ''
  filesAction.value = ''
  notes.value = []
  clearRunLogs()
  error.value = ''
  dirty.value = false
  lastHtml.value = ''
  clearPreviewFrame()
  // 打开项目默认进代码，不自动预览；需用户点「运行」
  setView('code')
  // 不自动打开侧栏，由用户点「打开资源管理器」再展开
  treeOpen.value = false
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
      view.value = 'code'
    }
  },
)

watch(
  () => props.focusView,
  (v) => {
    if (!v) return
    if (v === 'preview') {
      void run()
      return
    }
    setView(v)
  },
)

async function handleIncomingShareFiles(list: File[]) {
  if (!list.length || personalBusy.value) return
  filesAction.value = 'projects'
  openDrawer('files')
  const zip = list.find((f) => /\.zip$/i.test(f.name) || /zip/i.test(f.type))
  if (zip) {
    await ingestPersonalZip(zip)
    return
  }
  await ingestPersonalFiles(list)
}

let unbindIncoming: (() => void) | undefined

watch(consoleOpen, (open) => {
  if (!open) return
  consoleHeightPx.value = clampDockH(consoleHeightPx.value, dockResizing.value ? DOCK_BAR_H : DOCK_MIN_H)
  // 拖动过程中不挂 eruda，否则 WebView 会取消触控导致「拉一下就卡死」
  if (dockResizing.value) return
  void ensureErudaAfterOpen()
})

onMounted(() => {
  window.addEventListener('message', onMessage)
  setErudaInspectingHandler((active) => {
    erudaInspecting.value = active
  })
  load(props.project)
  unbindIncoming = onIncomingDeviceFiles((files) => {
    void handleIncomingShareFiles(files)
  })
  const stashed = takeStashedIncomingFiles()
  if (stashed?.length) void handleIncomingShareFiles(stashed)
  if (consoleOpen.value) void ensureErudaAfterOpen()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  setErudaInspectingHandler(null)
  erudaInspecting.value = false
  unbindDockResize()
  clearPreviewFrame()
  if (erudaReady) {
    destroyErudaPanel()
    erudaReady = false
  }
  unbindIncoming?.()
  if (wechatPickWaiting.value) {
    wechatPickWaiting.value = false
    void cancelDeviceFilePick()
  }
})

function openGit() {
  openDrawer('git')
}

function openFilesAction(action: FilesAction = '') {
  filesAction.value = action
  openDrawer('files')
  if (action === 'projects') void refreshPersonalProjects()
}

async function refreshPersonalProjects() {
  personalBusy.value = true
  personalError.value = ''
  try {
    personalList.value = await listUserProjects()
  } catch (err) {
    personalError.value = err instanceof Error ? err.message : String(err)
    personalList.value = []
  } finally {
    personalBusy.value = false
  }
}

async function openPersonalProjects() {
  filesAction.value = 'projects'
  await refreshPersonalProjects()
}

async function openPersonalProject(id: number) {
  personalBusy.value = true
  personalError.value = ''
  try {
    const detail = await getUserProject(id)
    emit('openSavedProject', {
      title: detail.title || `个人项目 #${detail.id}`,
      files: detail.files || {},
      openFile: detail.openFile,
    })
    filesAction.value = ''
    treeOpen.value = false
  } catch (err) {
    personalError.value = err instanceof Error ? err.message : String(err)
  } finally {
    personalBusy.value = false
  }
}

async function removePersonalProject(id: number) {
  if (!confirm('确定删除该个人项目？')) return
  personalBusy.value = true
  personalError.value = ''
  try {
    await deleteUserProject(id)
    await refreshPersonalProjects()
  } catch (err) {
    personalError.value = err instanceof Error ? err.message : String(err)
  } finally {
    personalBusy.value = false
  }
}

function pickPersonalZip() {
  if (shouldOfferFileSourceSheet()) {
    fileSourceKind.value = 'zip'
    fileSourceOpen.value = true
    return
  }
  personalZipInput.value?.click()
}

function pickPersonalFiles() {
  if (shouldOfferFileSourceSheet()) {
    fileSourceKind.value = 'files'
    fileSourceOpen.value = true
    return
  }
  personalFilesInput.value?.click()
}

function pickPersonalFolder() {
  if (shouldOfferFileSourceSheet()) {
    fileSourceKind.value = 'folder'
    fileSourceOpen.value = true
    return
  }
  personalFolderInput.value?.click()
}

async function ingestPersonalZip(file: File) {
  personalBusy.value = true
  personalError.value = ''
  console.info('[upload-zip] start', { name: file.name, size: file.size, type: file.type })
  try {
    const detail = await uploadUserProjectZip(file)
    console.info('[upload-zip] ok', { id: detail.id, title: detail.title, fileCount: detail.fileCount })
    await refreshPersonalProjects()
    emit('openSavedProject', {
      title: detail.title || file.name,
      files: detail.files || {},
      openFile: detail.openFile,
    })
    filesAction.value = ''
    treeOpen.value = false
  } catch (err) {
    console.error('[upload-zip] fail', err)
    personalError.value = err instanceof Error ? err.message : String(err)
  } finally {
    personalBusy.value = false
  }
}

async function ingestPersonalFiles(list: File[]) {
  if (!list.length) return
  personalBusy.value = true
  personalError.value = ''
  try {
    const uploaded = await filesFromFileList(list)
    const detail = await saveUserProject({
      title: uploaded.title.replace(/^本地上传\s*·\s*/, '') || uploaded.title,
      sourceType: 'upload',
      openFile: uploaded.openFile,
      files: uploaded.files,
    })
    await refreshPersonalProjects()
    emit('openSavedProject', {
      title: detail.title || uploaded.title,
      files: detail.files || uploaded.files,
      openFile: detail.openFile || uploaded.openFile,
    })
    filesAction.value = ''
    treeOpen.value = false
  } catch (err) {
    personalError.value = err instanceof Error ? err.message : String(err)
  } finally {
    personalBusy.value = false
  }
}

async function onFileSourcePicked(source: FilePickSource) {
  const kind = fileSourceKind.value
  personalError.value = ''
  console.info('[upload] source picked', { source, kind, native: canUseNativeFilePick() })
  // 非 Android：来源面板仅作引导，随后仍走系统文件框（iOS「文件」里常有微信）
  if (!canUseNativeFilePick()) {
    if (kind === 'zip') personalZipInput.value?.click()
    else if (kind === 'folder') personalFolderInput.value?.click()
    else personalFilesInput.value?.click()
    return
  }
  try {
    if (source === 'wechat') {
      wechatPickWaiting.value = true
      personalError.value =
        '已打开微信：请到聊天记录里打开文件 → 右上角「···」→「用其他应用打开」→ 学习宝典'
    }
    if (kind === 'zip') {
      // 微信侧常不标 zip MIME，放宽后再校验扩展名
      const files = await pickDeviceFiles({
        source,
        multiple: false,
        mimeType: source === 'wechat' ? '*/*' : 'application/zip',
      })
      wechatPickWaiting.value = false
      const file = files[0]
      if (!file) {
        console.warn('[upload-zip] no file returned from picker')
        if (source === 'wechat') personalError.value = '未收到微信文件，可重试或改用「手机本地文件」'
        return
      }
      personalError.value = ''
      if (!/\.zip$/i.test(file.name) && !/zip/i.test(file.type)) {
        personalError.value = '请选择 .zip 压缩包'
        return
      }
      await ingestPersonalZip(file)
      return
    }
    const files = await pickDeviceFiles({
      source,
      multiple: true,
      mimeType: '*/*',
    })
    wechatPickWaiting.value = false
    personalError.value = ''
    if (files.length) await ingestPersonalFiles(files)
    else if (source === 'wechat') personalError.value = '未收到微信文件，可重试或改用「手机本地文件」'
  } catch (err) {
    wechatPickWaiting.value = false
    personalError.value = err instanceof Error ? err.message : String(err)
  }
}

async function cancelWeChatPickWait() {
  wechatPickWaiting.value = false
  personalError.value = ''
  await cancelDeviceFilePick()
}

async function onPersonalZipChosen(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await ingestPersonalZip(file)
}

async function onPersonalFilesChosen(ev: Event) {
  const input = ev.target as HTMLInputElement
  const list = Array.from(input.files ?? [])
  input.value = ''
  if (!list.length) return
  await ingestPersonalFiles(list)
}

defineExpose({ selectFile, openTree, closeTree, openGit, openFilesAction, paths, files })
</script>

<template>
  <div
    ref="rootEl"
    class="local-run"
    :class="{ 'dock-resizing': dockResizing, 'eruda-inspecting': erudaInspecting }"
  >
    <header class="lr-top">
      <button type="button" class="lr-menu" aria-label="打开文件目录" @click="openTree">
        <AppIcon name="appstore" :size="22" />
      </button>
      <span class="lr-name">{{ shortTitle }}</span>
      <button
        v-if="lastHtml && view !== 'code'"
        type="button"
        class="lr-run"
        @click="goToCode"
      >
        代码
      </button>
      <button type="button" class="lr-run" :disabled="building" @click="run">
        {{ building ? '编译中…' : '运行' }}
      </button>
    </header>

    <!-- 预览容器始终挂载，避免切到代码时毁掉 iframe -->
    <div class="lr-stage">
      <p v-if="building && !lastHtml && view !== 'code'" class="lr-hint">正在 App 内编译项目…</p>
      <p v-else-if="view !== 'code' && !lastHtml" class="lr-hint">
        温馨提示：请点击右上角「运行」开始预览；点左上角可打开代码目录。
      </p>
      <div v-show="view !== 'code'" ref="stageHost" class="lr-frame-host" />
      <div v-show="view === 'code'" class="lr-edit">
        <div v-if="!current" class="lr-empty-editor">
          <p class="lr-empty-title">暂无打开的文件</p>
          <p class="lr-empty-tip">从资源管理器选择通用模板，或上传本地项目文件后点「运行」预览。</p>
          <button type="button" class="lr-empty-btn" @click="openDrawer('files')">打开资源管理器</button>
        </div>
        <template v-else>
          <div class="lr-file-bar">
            <button
              type="button"
              class="lr-path-btn"
              :title="`查找文件（当前 ${current}）`"
              @click="openFileFinder"
            >
              <span class="lr-file-path">{{ current }}</span>
            </button>
            <button type="button" class="lr-find" aria-label="在当前文件搜索" @click="editorRef?.openSearch()">
              <AppIcon name="search" :size="16" />
            </button>
          </div>
          <MonacoCodeEditor ref="editorRef" v-model="code" :path="current" :files="files" />
        </template>
      </div>
    </div>

    <footer
      v-show="dockVisible"
      ref="dockEl"
      class="lr-dock"
      :class="{ open: consoleOpen }"
      :style="dockStyle"
    >
      <div
        class="lr-dock-bar"
        role="separator"
        aria-orientation="horizontal"
        aria-label="拖动调整运行结果高度"
        @pointerdown="onDockResizeStart"
      >
        <span class="lr-dock-grip" aria-hidden="true" />
        <div class="lr-dock-label" :class="{ on: consoleOpen }">
          <span class="lr-prompt" aria-hidden="true">&gt;_</span>
          运行结果
          <span v-if="errorCount" class="lr-badge">{{ errorCount }}</span>
        </div>
        <div class="lr-dock-right">
          <button
            type="button"
            class="lr-dock-chev"
            :aria-label="consoleOpen ? '收起控制台' : '展开控制台'"
            @click="onDockToggleClick"
          >
            <AppIcon
              name="down"
              :size="16"
              :style="{ transform: consoleOpen ? 'none' : 'rotate(180deg)' }"
            />
          </button>
        </div>
      </div>
      <div v-show="consoleOpen" class="lr-console">
        <div ref="consoleHost" class="lr-console-host" />
      </div>
    </footer>

    <div v-if="treeOpen" class="lr-drawer-mask" aria-hidden="true" @click="closeTree" />
    <aside v-if="treeOpen" class="lr-drawer" :class="{ wide: drawerTab === 'git' }" aria-label="工作区">
      <nav class="lr-drawer-rail" aria-label="侧边栏">
        <button
          type="button"
          class="lr-rail-btn"
          :class="{ on: drawerTab === 'files' }"
          title="资源管理器"
          @click="openDrawer('files')"
        >
          <AppIcon name="folder" :size="18" />
        </button>
        <button
          type="button"
          class="lr-rail-btn"
          :class="{ on: drawerTab === 'search' }"
          title="搜索"
          @click="openDrawer('search')"
        >
          <AppIcon name="file-search" :size="18" />
        </button>
        <button
          type="button"
          class="lr-rail-btn"
          :class="{ on: drawerTab === 'git' }"
          title="版本库"
          @click="openDrawer('git')"
        >
          <AppIcon name="fork" :size="18" />
        </button>
      </nav>

      <div class="lr-drawer-main">
        <header v-if="drawerTab !== 'git'" class="lr-drawer-head">
          <p class="lr-drawer-title">
            {{ drawerTab === 'files' ? '资源管理器' : '搜索' }}
          </p>
          <button type="button" class="lr-drawer-close" aria-label="关闭" @click="closeTree">
            <AppIcon name="close" :size="16" />
          </button>
        </header>

        <div v-show="drawerTab === 'files'" class="lr-drawer-body">
          <template v-if="filesAction === 'templates'">
            <div class="lr-starter-pick">
              <p class="lr-starter-label">初始化本地模板</p>
              <button
                v-for="s in starters"
                :key="s.id"
                type="button"
                class="lr-starter-item"
                :disabled="busy"
                @click="emit('createStarter', s.id)"
              >
                <span class="lr-starter-name">{{ s.label }}</span>
                <span class="lr-starter-desc">{{ s.desc }}</span>
              </button>
              <button type="button" class="lr-empty-btn" @click="filesAction = ''">返回</button>
            </div>
          </template>
          <template v-else-if="filesAction === 'upload'">
            <div class="lr-empty-files">
              <p class="lr-starter-label">上传本地文件</p>
              <button type="button" class="lr-empty-btn primary" :disabled="busy" @click="emit('uploadLocal')">
                选择文件
              </button>
              <button type="button" class="lr-empty-btn" :disabled="busy" @click="emit('uploadLocalFolder')">
                选择文件夹
              </button>
              <p class="lr-empty-hint">
                可单选 .html，或多选 html/css/js。手机上可从微信聊天或本地存储选择。上传后点「运行」预览。
              </p>
              <button type="button" class="lr-empty-btn" @click="filesAction = ''">返回</button>
            </div>
          </template>
          <template v-else-if="filesAction === 'projects'">
            <div class="lr-personal">
              <p class="lr-starter-label">个人项目</p>
              <div class="lr-personal-actions">
                <button
                  type="button"
                  class="lr-empty-btn primary"
                  :disabled="busy || personalBusy"
                  @click="pickPersonalZip"
                >
                  上传 Zip
                </button>
                <button
                  type="button"
                  class="lr-empty-btn"
                  :disabled="busy || personalBusy"
                  @click="pickPersonalFiles"
                >
                  上传文件
                </button>
                <button
                  type="button"
                  class="lr-empty-btn"
                  :disabled="busy || personalBusy"
                  @click="pickPersonalFolder"
                >
                  上传文件夹
                </button>
              </div>
              <p class="lr-empty-hint">
                上传后会保存到云端。手机上可从「微信聊天文件」或「手机本地文件」选择。
              </p>
              <p v-if="personalBusy" class="lr-personal-status">处理中…</p>
              <p v-if="personalError" class="lr-personal-err">{{ personalError }}</p>
              <button
                v-if="wechatPickWaiting"
                type="button"
                class="lr-empty-btn"
                @click="cancelWeChatPickWait"
              >
                取消等待微信文件
              </button>
              <ul v-if="personalList.length" class="lr-personal-list">
                <li v-for="p in personalList" :key="p.id" class="lr-personal-item">
                  <button
                    type="button"
                    class="lr-personal-main"
                    :disabled="personalBusy"
                    @click="openPersonalProject(p.id)"
                  >
                    <span class="lr-personal-title">{{ p.title || `项目 #${p.id}` }}</span>
                    <span class="lr-personal-meta">
                      {{ p.sourceType === 'zip' ? 'Zip' : '上传' }} · {{ p.fileCount }} 个文件
                      <template v-if="p.updatedAt"> · {{ p.updatedAt }}</template>
                    </span>
                  </button>
                  <button
                    type="button"
                    class="lr-personal-del"
                    title="删除"
                    :disabled="personalBusy"
                    @click="removePersonalProject(p.id)"
                  >
                    删除
                  </button>
                </li>
              </ul>
              <p v-else-if="!personalBusy" class="lr-empty-hint">还没有个人项目，先上传一个吧。</p>
              <button type="button" class="lr-empty-btn" @click="filesAction = ''">返回</button>
              <input
                ref="personalZipInput"
                class="lr-sr-file"
                type="file"
                accept=".zip,application/zip"
                @change="onPersonalZipChosen"
              />
              <input
                ref="personalFilesInput"
                class="lr-sr-file"
                type="file"
                multiple
                accept=".html,.htm,.css,.js,.mjs,.cjs,.jsx,.tsx,.ts,.vue,.json,.md,.svg,.txt,.png,.jpg,.jpeg,.gif,.webp,.ico"
                @change="onPersonalFilesChosen"
              />
              <input
                ref="personalFolderInput"
                class="lr-sr-file"
                type="file"
                multiple
                webkitdirectory
                @change="onPersonalFilesChosen"
              />
            </div>
          </template>
          <template v-else>
            <template v-if="hasFiles">
              <input
                ref="fileQueryRef"
                v-model="fileQuery"
                class="lr-filter"
                type="search"
                placeholder="搜索文件"
                enterkeyhint="search"
                @keydown.enter.prevent="fileHits[0] && selectFile(fileHits[0].path)"
              />
              <ul v-if="fileQuery.trim()" class="lr-hit-list">
                <li v-if="!fileHits.length" class="lr-hit-empty">未找到匹配文件</li>
                <li v-for="h in fileHits" :key="h.path">
                  <button type="button" class="lr-hit" :class="{ on: h.path === current }" @click="selectFile(h.path)">
                    <span class="lr-hit-name">{{ h.path.includes('/') ? h.path.slice(h.path.lastIndexOf('/') + 1) : h.path }}</span>
                    <span class="lr-hit-path">{{ h.path }}</span>
                  </button>
                </li>
              </ul>
              <FileTree
                v-else
                :paths="paths"
                :root-label="rootLabel"
                :selected="current"
                :expand-to="current"
                @select="(p) => selectFile(p)"
              />
            </template>
            <div class="lr-empty-files" :class="{ below: hasFiles }">
              <button type="button" class="lr-empty-btn primary" :disabled="busy" @click="filesAction = 'templates'">
                初始化本地模板
              </button>
              <button type="button" class="lr-empty-btn" :disabled="busy" @click="filesAction = 'upload'">
                上传本地文件
              </button>
              <button type="button" class="lr-empty-btn" :disabled="busy" @click="openPersonalProjects">
                个人项目
              </button>
              <p v-if="!hasFiles" class="lr-empty-hint">
                模板按完整项目生成（Vue / React / HTML）；个人项目支持 Zip 并保存到云端。
              </p>
            </div>
          </template>
        </div>

        <div v-show="drawerTab === 'search'" class="lr-drawer-body search">
          <div class="lr-search-field">
            <input
              ref="contentQueryRef"
              v-model="contentQuery"
              class="lr-search-input"
              type="search"
              placeholder="搜索"
              enterkeyhint="search"
            />
            <div class="lr-search-opts">
              <button type="button" class="lr-mini" :class="{ on: contentCase }" title="区分大小写" @click="contentCase = !contentCase">
                Aa
              </button>
              <button type="button" class="lr-mini" :class="{ on: contentWord }" title="全词匹配" @click="contentWord = !contentWord">
                ab
              </button>
              <button type="button" class="lr-mini" :class="{ on: contentRegex }" title="正则" @click="contentRegex = !contentRegex">
                .*
              </button>
              <button type="button" class="lr-mini" title="清空" @click="clearContentSearch">×</button>
              <button
                type="button"
                class="lr-mini"
                :class="{ on: contentReplaceOpen }"
                title="切换替换"
                @click="contentReplaceOpen = !contentReplaceOpen"
              >
                ⇄
              </button>
            </div>
          </div>

          <div v-if="contentReplaceOpen" class="lr-search-field">
            <input v-model="contentReplace" class="lr-search-input" type="search" placeholder="替换" enterkeyhint="done" />
            <div class="lr-search-opts">
              <button
                type="button"
                class="lr-mini strong"
                title="全部替换"
                :disabled="!contentSearch.total || contentSearch.invalid"
                @click="replaceContentAll"
              >
                全替
              </button>
            </div>
          </div>

          <div class="lr-search-field">
            <input v-model="contentInclude" class="lr-search-input" type="search" placeholder="包含的文件，如 *.vue, src/**" />
          </div>
          <div class="lr-search-field">
            <input v-model="contentExclude" class="lr-search-input" type="search" placeholder="排除的文件，如 node_modules/**" />
          </div>

          <p class="lr-search-meta">{{ contentCountLabel }}</p>

          <div class="lr-search-results">
            <div
              v-if="contentQuery.trim() && !contentSearch.invalid && !contentSearch.groups.length"
              class="lr-hit-empty"
            >
              未找到匹配结果
              <button type="button" class="lr-reset" @click="clearContentSearch">重置</button>
            </div>

            <div v-for="g in contentSearch.groups" :key="g.path" class="lr-sg">
              <button type="button" class="lr-sg-head" @click="toggleSearchFile(g.path)">
                <span class="lr-sg-caret">{{ isSearchFileOpen(g.path) ? '▾' : '▸' }}</span>
                <span class="lr-sg-name" :title="g.path">{{ g.name }}</span>
                <span class="lr-sg-badge">{{ g.count }}</span>
              </button>
              <div v-if="isSearchFileOpen(g.path)" class="lr-sg-body">
                <button
                  v-for="(h, i) in g.hits"
                  :key="`${h.start}:${i}`"
                  type="button"
                  class="lr-sg-hit"
                  @click="openContentHit(h)"
                >
                  <span class="lr-sg-line">{{ h.line }}</span>
                  <span class="lr-sg-code" v-html="highlightSnippet(h.text, h.match)"></span>
                  <span
                    v-if="contentReplaceOpen"
                    class="lr-sg-replace"
                    title="替换这一处"
                    @click.stop="replaceContentOne(h)"
                    >⇄</span
                  >
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-show="drawerTab === 'git'" class="lr-drawer-body git slotted">
          <slot name="git">
            <p class="lr-git-label">当前分支</p>
            <p class="lr-git-value">{{ branch || '（本地项目 / 未签出）' }}</p>
            <p class="lr-git-label">仓库</p>
            <p class="lr-git-value">{{ repoLabel || (repoId ? `#${repoId}` : '未关联') }}</p>
            <button type="button" class="lr-git-btn ghost" @click="emit('leave')">返回练习</button>
          </slot>
        </div>

        <footer v-if="drawerTab !== 'git'" class="lr-drawer-foot">
          <button type="button" class="lr-drawer-link" @click="openDrawer('git')">版本库</button>
          <button type="button" class="lr-drawer-link" @click="emit('leave')">返回</button>
        </footer>
      </div>
    </aside>

    <FileSourceSheet
      v-model:open="fileSourceOpen"
      title="选择文件来源"
      :hint="fileSourceHint"
      @pick="onFileSourcePicked"
    />
  </div>
</template>

<style scoped>
.local-run {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  background: var(--paper);
  color: var(--ink);
}

.lr-top {
  flex-shrink: 0;
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 48px;
  padding: 0 12px 0 4px;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}

.lr-menu {
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.lr-name {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lr-run {
  flex-shrink: 0;
  height: 40px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--forest);
  font-size: 16px;
  font-weight: 600;
}

.lr-run:disabled {
  opacity: 0.45;
}

.lr-stage {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--paper-2);
  touch-action: manipulation;
  overscroll-behavior: contain;
}

.lr-frame-host {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  background: var(--paper-2);
}

.lr-frame-host :deep(iframe.lr-frame),
.lr-frame-host iframe.lr-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
  pointer-events: auto !important;
  touch-action: manipulation;
  position: absolute;
  inset: 0;
  z-index: 2;
}

.lr-hint {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 16%;
  z-index: 1;
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  pointer-events: none;
}

.lr-edit {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--paper-2);
}

.lr-file-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}

.lr-path-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  text-align: left;
}

.lr-find {
  flex-shrink: 0;
  width: 36px;
  height: 32px;
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lr-file-path {
  min-width: 0;
  color: var(--ink-soft);
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lr-dock {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--stage);
  color: var(--on-primary);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.lr-dock.open {
  /* 高度由 dockStyle（可拖动）控制 */
  flex: 0 0 auto;
}

.local-run.dock-resizing {
  cursor: ns-resize;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  overflow: hidden;
}

.local-run.dock-resizing .lr-stage,
.local-run.dock-resizing .lr-console,
.local-run.dock-resizing .lr-frame-host,
.local-run.dock-resizing iframe {
  pointer-events: none !important;
}

.lr-dock-bar {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  height: 40px;
  padding: 0 6px 0 12px;
  box-sizing: border-box;
  background: color-mix(in srgb, var(--stage) 72%, var(--forest));
  position: relative;
  z-index: 3;
  cursor: ns-resize;
  touch-action: none;
}

.lr-dock-grip {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--on-primary) 48%, transparent);
  pointer-events: none;
}

.local-run.dock-resizing .lr-dock-grip {
  background: color-mix(in srgb, var(--on-primary) 85%, transparent);
}

.lr-dock-label,
.lr-dock-btn {
  border: 0;
  background: transparent;
  color: color-mix(in srgb, var(--on-primary) 62%, transparent);
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding: 0;
}

.lr-dock-label.on {
  color: var(--on-primary);
}

.lr-dock-btn {
  color: var(--on-primary);
}

.lr-dock-right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 2px;
}

.lr-prompt {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  letter-spacing: -0.04em;
}

.lr-badge {
  min-width: 16px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--coral);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
}

.lr-dock-chev {
  width: 32px;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--on-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lr-console {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0;
  position: relative;
  background: #fff;
}

.lr-console-host {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* eruda inline：铺满运行结果区 */
.lr-console-host :deep(.eruda-entry-btn) {
  display: none !important;
}

.lr-console-host :deep(.eruda-container),
.lr-console-host :deep(.eruda-dev-tools),
.lr-console-host :deep(.eruda-dev-tools.show) {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-height: none !important;
  min-height: 100% !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  transform: none !important;
  visibility: visible !important;
  opacity: 1 !important;
  display: block !important;
  z-index: 1 !important;
}

.lr-console-host :deep(.eruda-dev-tools .eruda-nav-bar-container),
.lr-console-host :deep(.eruda-dev-tools .eruda-tool) {
  visibility: visible !important;
}

/* Elements 点选：收起控制台内容区，只留底栏，避免挡住预览 */
.local-run.eruda-inspecting .lr-console {
  flex: 0 0 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 0 !important;
}

.local-run.eruda-inspecting .lr-dock.open {
  height: auto !important;
  min-height: 0 !important;
}

.lr-drawer-mask {
  position: absolute;
  inset: 0;
  z-index: 6;
  background: color-mix(in srgb, var(--ink) 35%, transparent);
}

.lr-empty-editor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px 20px;
  text-align: center;
}

.lr-empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  color: var(--ink);
}

.lr-empty-tip,
.lr-empty-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-soft);
  max-width: 280px;
}

.lr-empty-btn {
  min-width: 180px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper-2);
  color: var(--ink);
  font-size: 14px;
  font-weight: 560;
}

.lr-empty-btn.primary {
  border-color: transparent;
  background: var(--forest);
  color: #fff;
}

.lr-empty-files,
.lr-starter-pick {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 4px 12px;
}

.lr-empty-files.below {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.lr-personal {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0 8px;
  min-height: 0;
}

.lr-personal-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lr-personal-status {
  margin: 0;
  font-size: 12px;
  color: var(--ink-soft);
}

.lr-personal-err {
  margin: 0;
  font-size: 12px;
  color: #b42318;
  line-height: 1.4;
}

.lr-personal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 40vh;
  overflow: auto;
}

.lr-personal-item {
  display: flex;
  gap: 6px;
  align-items: stretch;
}

.lr-personal-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  text-align: left;
}

.lr-personal-title {
  font-size: 14px;
  font-weight: 650;
  color: var(--ink);
}

.lr-personal-meta {
  font-size: 11px;
  color: var(--ink-soft);
}

.lr-personal-del {
  flex-shrink: 0;
  width: 52px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper-2);
  color: var(--ink-soft);
  font-size: 12px;
}

.lr-sr-file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.lr-starter-label {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}

.lr-starter-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  text-align: left;
}

.lr-starter-name {
  font-size: 15px;
  font-weight: 650;
  color: var(--ink);
}

.lr-starter-desc {
  font-size: 12px;
  color: var(--ink-soft);
}

.lr-drawer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 7;
  width: min(92%, 340px);
  display: flex;
  flex-direction: row;
  background: var(--paper);
  box-shadow: 8px 0 24px color-mix(in srgb, var(--ink) 18%, transparent);
}

.lr-drawer-rail {
  flex-shrink: 0;
  width: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0;
  border-right: 1px solid var(--line);
  background: var(--paper-2);
}

.lr-rail-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lr-rail-btn.on {
  color: var(--forest);
  background: var(--moss);
}

.lr-drawer-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.lr-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 12px 12px;
  border-bottom: 1px solid var(--line);
}

.lr-drawer-title {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--ink);
}

.lr-drawer-close {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-soft);
  font-size: 16px;
}

.lr-drawer.wide {
  width: min(96%, 400px);
}

.lr-drawer-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lr-drawer-body.git.slotted {
  padding: 0;
  gap: 0;
}

.lr-filter {
  flex-shrink: 0;
  width: 100%;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0 10px;
  background: var(--paper-2);
  color: var(--ink);
  font-size: 13px;
}

.lr-hit-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: auto;
  min-height: 0;
}

.lr-hit {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  color: var(--ink);
}

.lr-hit.on,
.lr-hit:active {
  background: var(--moss);
}

.lr-hit-name {
  font-size: 13px;
  font-weight: 650;
}

.lr-hit-path {
  font-size: 11px;
  color: var(--ink-soft);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
}

.lr-hit-snippet {
  font-size: 12px;
  color: var(--ink);
  line-height: 1.4;
  word-break: break-word;
}

.lr-hit-empty {
  padding: 24px 8px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.lr-reset {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper-2);
  color: var(--ink);
  font-size: 12px;
}

.lr-search-field {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 34px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper-2);
  padding: 0 4px 0 8px;
}

.lr-search-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
}

.lr-search-opts {
  display: flex;
  flex-shrink: 0;
  gap: 1px;
}

.lr-mini {
  height: 26px;
  min-width: 26px;
  padding: 0 5px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 650;
}

.lr-mini.on,
.lr-mini.strong:not(:disabled) {
  background: var(--forest);
  color: var(--on-primary);
}

.lr-mini:disabled {
  opacity: 0.35;
}

.lr-search-meta {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.lr-search-results {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lr-sg-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  text-align: left;
}

.lr-sg-head:active {
  background: var(--moss);
}

.lr-sg-caret {
  width: 12px;
  color: var(--muted);
  font-size: 11px;
}

.lr-sg-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
}

.lr-sg-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--forest) 16%, var(--paper-2));
  color: var(--forest);
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.lr-sg-body {
  display: flex;
  flex-direction: column;
  padding: 0 0 4px 10px;
}

.lr-sg-hit {
  width: 100%;
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: start;
  gap: 6px;
  padding: 5px 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  color: var(--ink);
}

.lr-sg-hit:active {
  background: var(--moss);
}

.lr-sg-line {
  color: var(--muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1.45;
  padding-top: 1px;
}

.lr-sg-code {
  min-width: 0;
  font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.lr-sg-code :deep(mark) {
  background: color-mix(in srgb, var(--forest) 28%, transparent);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

.lr-sg-replace {
  color: var(--ink-soft);
  font-size: 12px;
  padding: 0 4px;
}

.lr-git-label {
  margin: 8px 0 2px;
  font-size: 11px;
  color: var(--muted);
  font-weight: 650;
}

.lr-git-value {
  margin: 0;
  font-size: 14px;
  color: var(--ink);
  font-weight: 600;
  word-break: break-all;
}

.lr-git-tip {
  margin: 14px 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-soft);
}

.lr-git-btn {
  display: block;
  width: 100%;
  height: 38px;
  margin-bottom: 8px;
  border: 0;
  border-radius: 10px;
  background: var(--forest);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 650;
}

.lr-git-btn.ghost {
  background: var(--moss);
  color: var(--ink);
}

.lr-drawer-foot {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--line);
}

.lr-drawer-link {
  flex: 1;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: var(--moss);
  color: var(--ink);
  font-size: 13px;
}

/* 横屏：压扁顶栏/底栏，把高度留给代码与预览 */
@media (orientation: landscape) {
  .lr-top {
    height: 36px;
    padding: 0 8px 0 2px;
  }

  .lr-menu,
  .lr-run {
    height: 32px;
    width: auto;
  }

  .lr-menu {
    width: 32px;
  }

  .lr-name {
    font-size: 14px;
  }

  .lr-run {
    font-size: 14px;
  }

  .lr-dock-bar {
    height: 36px;
  }

  .lr-dock-btn {
    font-size: 13px;
  }

  .lr-file-bar .lr-path-btn,
  .lr-find {
    height: 28px;
  }

  .lr-drawer {
    width: min(56vw, 480px);
  }

  .lr-drawer.wide {
    width: min(72vw, 640px);
  }
}
</style>
