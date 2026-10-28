<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  deleteGitRepo,
  getGitBranch,
  listGitRepos,
  loadGitRepo as loadCachedGitRepo,
  putGitBranch,
  saveGitRepo,
  type GitRepoSummary,
} from '@/api/gitWorkspace'
import { ApiError } from '@/api/http'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import FileSourceSheet from '@/components/FileSourceSheet.vue'
import type { LocalRunProject } from '@/domains/programming/localrun/bundle'
import { filesFromFileList } from '@/domains/programming/localrun/fromLocalFiles'
import {
  canUseNativeFilePick,
  cancelDeviceFilePick,
  pickDeviceFiles,
  shouldOfferFileSourceSheet,
  type FilePickSource,
} from '@/services/pickDeviceFile'
import {
  fetchPublicRepo,
  isGitAuthRequiredError,
  listRemoteBranches,
  type FetchedRepo,
} from '@/domains/programming/stackblitz/fetchRepo'
import {
  getGitCredential,
  setGitCredential,
  tokenHelpHint,
  tokenHelpUrl,
  type GitCredential,
} from '@/domains/programming/stackblitz/gitCredentials'
import {
  GIT_EXAMPLES,
  parseGitRepoInput,
  type GitProvider,
  type ParsedRepo,
} from '@/domains/programming/stackblitz/parseRepo'
import {
  buildStarterProject,
  defaultOpenFile,
  type StarterId,
} from '@/domains/programming/stackblitz/templates'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'
import LocalRunPanel from '@/views/programming/LocalRunPanel.vue'

type ScmSub = 'changes' | 'history'
type OpenTarget = { kind: 'git' | 'starter'; value: string }
type RunFocus = 'preview' | 'code' | 'console' | ''

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()

const runPanelRef = ref<{
  openGit: () => void
  openTree: () => void
  closeTree: () => void
  openFilesAction: (action?: '' | 'templates' | 'upload') => void
} | null>(null)
const scmSub = ref<ScmSub>('changes')
const showCloneForm = ref(false)
const showBranchPicker = ref(false)
const localFileInput = ref<HTMLInputElement | null>(null)
const localFolderInput = ref<HTMLInputElement | null>(null)
const fileSourceOpen = ref(false)
const fileSourceKind = ref<'files' | 'folder'>('files')
const fileSourceHint = computed(() =>
  fileSourceKind.value === 'folder'
    ? '手机端请多选文件夹内的文件（系统不一定支持直接选文件夹）'
    : '选「微信聊天文件」会打开微信：在聊天里打开文件 →「用其他应用打开」→ 学习宝典',
)
const linkedRepo = ref<{ label: string; provider: string } | null>(null)
const lastOpen = ref<OpenTarget | null>(null)
const localProject = ref<LocalRunProject | null>(null)
const explorerPath = ref('')
const runFocus = ref<RunFocus>('')
const repoCache = new Map<string, FetchedRepo>()
const cachedRepos = ref<GitRepoSummary[]>([])
const activeRepoId = ref<number | null>(null)
const currentBranch = ref('')
const cachedBranches = ref<string[]>([])
const remoteBranches = ref<string[]>([])
const activeParsed = ref<ParsedRepo | null>(null)

const gitInput = ref('')
const sbStatus = ref('')
const sbBusy = ref(false)
/** 进页静默恢复缓存：不占用 sbBusy，避免「本地运行」等按钮被禁用/点不动 */
const softRestoring = ref(false)
/** 递增以作废过期的自动恢复，防止盖住用户刚打开的模板 */
let workspaceEpoch = 0
const sbError = ref('')

const authOpen = ref(false)
const authProvider = ref<GitProvider>('gitee')
const authUsername = ref('')
const authToken = ref('')
const authRemember = ref(false)
const authRetry = ref<null | (() => Promise<void>)>(null)
const authProviderLabel = computed(() => {
  if (authProvider.value === 'github') return 'GitHub'
  if (authProvider.value === 'gitee') return 'Gitee'
  return 'GitLab'
})

function openAuthDialog(provider: GitProvider, retry: () => Promise<void>) {
  authProvider.value = provider
  const existing = getGitCredential(provider)
  authUsername.value = existing?.username || ''
  authToken.value = existing?.token || ''
  authRemember.value = false
  authRetry.value = retry
  authOpen.value = true
  sbStatus.value = '需要访问令牌才能拉取'
  sbError.value = ''
}

function onAuthCancel() {
  authOpen.value = false
  authRetry.value = null
  sbStatus.value = '已取消授权'
}

async function onAuthConfirm() {
  const token = authToken.value.trim()
  if (!token) {
    sbError.value = '请粘贴 Personal Access Token'
    return
  }
  const cred: GitCredential = {
    token,
    username: authUsername.value.trim() || undefined,
  }
  setGitCredential(authProvider.value, cred, authRemember.value)
  authOpen.value = false
  const retry = authRetry.value
  authRetry.value = null
  if (retry) await retry()
}

function handleGitErr(err: unknown, retry: () => Promise<void>) {
  if (err instanceof Error && isGitAuthRequiredError(err) && 'provider' in err) {
    openAuthDialog((err as { provider: GitProvider }).provider, retry)
    return
  }
  const msg = err instanceof Error ? err.message : String(err)
  // 限流时填 PAT 也能提高额度
  if (/限流|Rate Limit|访问令牌提高/i.test(msg)) {
    const parsed = activeParsed.value || parseGitRepoInput(gitInput.value)
    if (parsed) {
      sbError.value = msg
      openAuthDialog(parsed.provider, retry)
      return
    }
  }
  sbError.value = msg
}

function showScm() {
  void nextTick(() => runPanelRef.value?.openGit())
}

const scmEnabled = computed(() => !!linkedRepo.value && linkedRepo.value.provider !== 'local')
const scmFooterLeft = computed(() => (linkedRepo.value ? linkedRepo.value.label : '未启用版本控制'))
const scmFooterRight = computed(() => {
  if (!linkedRepo.value) return '本地'
  const p = linkedRepo.value.provider
  if (p === 'github') return 'GitHub'
  if (p === 'gitee') return 'Gitee'
  if (p === 'gitlab') return 'GitLab'
  if (p === 'local') return '模板'
  return '远程'
})

function repoLink(raw: string) {
  const parsed = parseGitRepoInput(raw)
  return parsed ? { label: `${parsed.owner}/${parsed.repo}`, provider: parsed.provider } : null
}

const LAST_GIT_REPO_KEY = 'appdemo.workbench.lastGitRepoId'

function rememberLastGitRepo(id: number | null) {
  try {
    if (id == null) localStorage.removeItem(LAST_GIT_REPO_KEY)
    else localStorage.setItem(LAST_GIT_REPO_KEY, String(id))
  } catch {
    /* ignore */
  }
}

function readLastGitRepoId(): number | null {
  try {
    const n = Number(localStorage.getItem(LAST_GIT_REPO_KEY) || '')
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

async function refreshCachedRepos() {
  try {
    cachedRepos.value = await listGitRepos()
  } catch {
    cachedRepos.value = []
  }
}

function findCachedMatch(parsed: ParsedRepo): GitRepoSummary | undefined {
  const sub = parsed.subpath || ''
  return cachedRepos.value.find(
    (r) =>
      r.provider === parsed.provider &&
      r.owner === parsed.owner &&
      r.repo === parsed.repo &&
      (r.subpath || '') === sub,
  )
}

function providerTitle(p: string) {
  if (p === 'github') return 'GitHub'
  if (p === 'gitee') return 'Gitee'
  if (p === 'gitlab') return 'GitLab'
  return p
}

function applyProject(
  project: LocalRunProject,
  opts: {
    branch?: string
    repoId?: number | null
    parsed?: ParsedRepo | null
    sourceUrl?: string
    cached?: string[]
  } = {},
) {
  localProject.value = project
  explorerPath.value =
    project.openFile && project.files[project.openFile] != null
      ? project.openFile
      : (Object.keys(project.files).find((p) => !p.startsWith('__localrun_')) ?? '')
  currentBranch.value = opts.branch || currentBranch.value || 'main'
  if (opts.repoId !== undefined) activeRepoId.value = opts.repoId
  if (opts.parsed !== undefined) activeParsed.value = opts.parsed
  if (opts.cached) cachedBranches.value = opts.cached
  if (opts.sourceUrl) gitInput.value = opts.sourceUrl
}

async function persistFetched(parsed: ParsedRepo, sourceUrl: string, fetched: FetchedRepo) {
  const detail = await saveGitRepo({
    provider: parsed.provider,
    owner: parsed.owner,
    repo: parsed.repo,
    subpath: parsed.subpath || '',
    sourceUrl,
    title: fetched.title,
    defaultBranch: fetched.ref,
    currentBranch: fetched.ref,
    assetBase: fetched.assetBase,
    detectedRoot: fetched.detectedRoot,
    openFile: fetched.openFile,
    files: fetched.files,
  })
  activeRepoId.value = detail.id
  currentBranch.value = detail.currentBranch
  cachedBranches.value = detail.cachedBranches || [detail.currentBranch]
  rememberLastGitRepo(detail.id)
  await refreshCachedRepos()
  return detail
}

type CachedDetail = Awaited<ReturnType<typeof loadCachedGitRepo>>

function applyCachedRepoDetailFrom(detail: CachedDetail) {
  const project: LocalRunProject = {
    title: detail.title,
    files: detail.files || {},
    assetBase: detail.assetBase || undefined,
    openFile: detail.openFile || undefined,
  }
  const sourceUrl =
    detail.sourceUrl ||
    (detail.provider === 'github'
      ? `https://github.com/${detail.owner}/${detail.repo}`
      : detail.provider === 'gitee'
        ? `https://gitee.com/${detail.owner}/${detail.repo}`
        : `https://gitlab.com/${detail.owner}/${detail.repo}`)
  const parsed =
    parseGitRepoInput(sourceUrl) ||
    ({
      provider: detail.provider as ParsedRepo['provider'],
      owner: detail.owner,
      repo: detail.repo,
      subpath: detail.subpath || undefined,
      display: `${detail.owner}/${detail.repo}`,
    } satisfies ParsedRepo)
  linkedRepo.value = { label: `${detail.owner}/${detail.repo}`, provider: detail.provider }
  lastOpen.value = { kind: 'git', value: sourceUrl }
  gitInput.value = sourceUrl
  applyProject(project, {
    branch: detail.currentBranch,
    repoId: detail.id,
    parsed,
    sourceUrl,
    cached: detail.cachedBranches || [],
  })
  rememberLastGitRepo(detail.id)
  showCloneForm.value = false
  runFocus.value = 'code'
  scmSub.value = 'changes'
  runPanelRef.value?.closeTree()
  const n = Object.keys(project.files).filter((p) => !p.startsWith('__localrun_')).length
  sbStatus.value = `已从缓存打开 · ${detail.currentBranch} · ${n} 个文件`
  sbError.value = ''
  return detail
}

async function applyCachedRepoDetail(id: number) {
  return applyCachedRepoDetailFrom(await loadCachedGitRepo(id))
}

async function openLocal(target: OpenTarget | null = lastOpen.value, opts: { forceRemote?: boolean } = {}) {
  if (!target) return
  if (sbBusy.value) {
    sbStatus.value = '请稍候，当前有任务正在进行…'
    return
  }
  workspaceEpoch += 1
  sbBusy.value = true
  sbError.value = ''
  try {
    let project: LocalRunProject
    if (target.kind === 'starter') {
      const id = target.value as StarterId
      const starter = buildStarterProject(id)
      project = {
        title: starter.title,
        files: starter.files,
        openFile: defaultOpenFile(id),
      }
      linkedRepo.value = { label: starter.title, provider: 'local' }
      activeRepoId.value = null
      activeParsed.value = null
      currentBranch.value = ''
      cachedBranches.value = []
      rememberLastGitRepo(null)
      applyProject(project)
      lastOpen.value = target
      runFocus.value = 'code'
      showCloneForm.value = false
      runPanelRef.value?.closeTree()
      sbStatus.value = `已打开 ${starter.title} 项目模板`
      return
    } else {
      const parsed = parseGitRepoInput(target.value)
      if (!parsed) throw new Error('仓库地址无效，请使用 GitHub / Gitee / GitLab 链接')

      // 优先走已落库缓存，刷新后不必再打远端
      if (!opts.forceRemote) {
        await refreshCachedRepos()
        const hit = findCachedMatch(parsed)
        if (hit) {
          const detail = await applyCachedRepoDetail(hit.id)
          if (parsed.ref && parsed.ref !== detail.currentBranch) {
            sbBusy.value = false
            await checkoutBranch(parsed.ref)
            return
          }
          lastOpen.value = target
          return
        }
      }

      sbStatus.value = `正在从 ${parsed.provider} 拉取文件…`
      const cacheKey = `${target.value}@@${parsed.ref || ''}`
      let fetched = repoCache.get(cacheKey)
      if (!fetched) {
        fetched = await fetchPublicRepo(parsed)
        repoCache.set(cacheKey, fetched)
      }
      project = {
        title: fetched.title,
        files: fetched.files,
        assetBase: fetched.assetBase,
        openFile: fetched.openFile,
      }
      linkedRepo.value = repoLink(target.value)
      applyProject(project, {
        branch: fetched.ref,
        parsed,
        sourceUrl: target.value,
      })
      try {
        await persistFetched(parsed, target.value, fetched)
        sbStatus.value = `已缓存 · ${fetched.ref}（下次可直接从历史打开）`
      } catch (err) {
        console.warn('[git] 落库失败，仍可本地使用', err)
        sbStatus.value = `已拉取但未写入缓存：${err instanceof Error ? err.message : String(err)}`
      }
      if (fetched.detectedRoot) {
        sbStatus.value = `已定位前端目录 ${fetched.detectedRoot}，分支 ${fetched.ref}`
      }
    }
    lastOpen.value = target
    runFocus.value = 'code'
    showCloneForm.value = false
    runPanelRef.value?.closeTree()
    const n = Object.keys(project.files).filter((p) => !p.startsWith('__localrun_')).length
    if (!sbStatus.value.includes('缓存') && !sbStatus.value.includes('定位') && !sbStatus.value.includes('未写入')) {
      sbStatus.value = `已拉取 ${n} 个文件${project.title.includes('·') ? ` · ${project.title}` : ''}，点「运行」可预览`
    }
  } catch (err) {
    sbStatus.value = '打开失败'
    handleGitErr(err, () => openLocal(target, opts))
  } finally {
    sbBusy.value = false
  }
}

async function restoreCachedRepo(id: number, opts: { soft?: boolean } = {}) {
  if (opts.soft) {
    if (softRestoring.value || sbBusy.value) return
    softRestoring.value = true
    const epoch = workspaceEpoch
    sbStatus.value = '正在恢复上次仓库…'
    try {
      const detail = await loadCachedGitRepo(id)
      // 用户已点模板/克隆，或又点了别的恢复：丢弃本次结果
      if (epoch !== workspaceEpoch || sbBusy.value) return
      await applyCachedRepoDetailFrom(detail)
    } catch (err) {
      if (epoch === workspaceEpoch && !sbBusy.value) {
        sbError.value = err instanceof Error ? err.message : String(err)
        sbStatus.value = '自动恢复失败，可从历史记录手动打开'
      }
    } finally {
      softRestoring.value = false
    }
    return
  }
  if (sbBusy.value) return
  workspaceEpoch += 1
  sbBusy.value = true
  sbError.value = ''
  sbStatus.value = '正在从缓存打开…'
  try {
    await applyCachedRepoDetail(id)
  } catch (err) {
    sbError.value = err instanceof Error ? err.message : String(err)
    sbStatus.value = '打开缓存失败'
  } finally {
    sbBusy.value = false
  }
}

async function removeCachedRepo(id: number) {
  if (sbBusy.value) return
  sbBusy.value = true
  try {
    await deleteGitRepo(id)
    if (activeRepoId.value === id) {
      activeRepoId.value = null
      localProject.value = null
      linkedRepo.value = null
      activeParsed.value = null
      currentBranch.value = ''
      cachedBranches.value = []
      lastOpen.value = null
      rememberLastGitRepo(null)
    } else if (readLastGitRepoId() === id) {
      rememberLastGitRepo(null)
    }
    await refreshCachedRepos()
    sbStatus.value = '已删除该仓库缓存'
    sbError.value = ''
  } catch (err) {
    sbError.value = err instanceof Error ? err.message : String(err)
  } finally {
    sbBusy.value = false
  }
}

function openHistoryTab() {
  scmSub.value = 'history'
  showCloneForm.value = false
  showScm()
  void refreshCachedRepos()
}

function refetchRemote() {
  if (!gitInput.value.trim()) return
  void openLocal({ kind: 'git', value: gitInput.value.trim() }, { forceRemote: true })
}

async function openBranchPicker() {
  if (!activeParsed.value || !scmEnabled.value) return
  showBranchPicker.value = true
  sbError.value = ''
  try {
    remoteBranches.value = await listRemoteBranches(activeParsed.value)
  } catch (err) {
    remoteBranches.value = [...cachedBranches.value]
    handleGitErr(err, () => openBranchPicker())
  }
}

async function checkoutBranch(branch: string) {
  if (!activeRepoId.value || !activeParsed.value || sbBusy.value) return
  if (branch === currentBranch.value) {
    showBranchPicker.value = false
    return
  }
  sbBusy.value = true
  sbError.value = ''
  showBranchPicker.value = false
  try {
    try {
      const snap = await getGitBranch(activeRepoId.value, branch)
      applyProject(
        {
          title: localProject.value?.title || `${activeParsed.value.owner}/${activeParsed.value.repo}`,
          files: snap.files,
          assetBase: localProject.value?.assetBase,
          openFile: snap.openFile || undefined,
        },
        { branch },
      )
      await putGitBranch(activeRepoId.value, branch, {
        files: snap.files,
        openFile: snap.openFile || undefined,
        makeCurrent: true,
      })
      sbStatus.value = `已切换到缓存分支 ${branch}`
    } catch (err) {
      if (!(err instanceof ApiError) || err.code !== 404) throw err
      sbStatus.value = `正在拉取分支 ${branch}…`
      const parsed: ParsedRepo = { ...activeParsed.value, ref: branch }
      const fetched = await fetchPublicRepo(parsed)
      repoCache.set(`${gitInput.value}@@${branch}`, fetched)
      await putGitBranch(activeRepoId.value, branch, {
        files: fetched.files,
        openFile: fetched.openFile,
        makeCurrent: true,
      })
      applyProject(
        {
          title: fetched.title,
          files: fetched.files,
          assetBase: fetched.assetBase,
          openFile: fetched.openFile,
        },
        { branch: fetched.ref },
      )
      if (!cachedBranches.value.includes(branch)) {
        cachedBranches.value = [...cachedBranches.value, branch].sort()
      }
      sbStatus.value = `已拉取并切换到 ${branch}`
    }
    await refreshCachedRepos()
    runPanelRef.value?.closeTree()
  } catch (err) {
    sbStatus.value = '切分支失败'
    handleGitErr(err, () => checkoutBranch(branch))
  } finally {
    sbBusy.value = false
  }
}

async function clearActiveCache() {
  if (!activeRepoId.value || sbBusy.value) return
  const id = activeRepoId.value
  await removeCachedRepo(id)
}

async function onFilesDirty(payload: { files: Record<string, string>; openFile?: string }) {
  if (!activeRepoId.value || !currentBranch.value) return
  try {
    await putGitBranch(activeRepoId.value, currentBranch.value, {
      files: payload.files,
      openFile: payload.openFile,
      makeCurrent: true,
    })
  } catch (err) {
    console.warn('[git] 写回分支快照失败', err)
  }
}

onMounted(async () => {
  await refreshCachedRepos()
  const lastId = readLastGitRepoId()
  if (lastId && cachedRepos.value.some((r) => r.id === lastId)) {
    // 软恢复：不禁用「本地运行」等按钮
    void restoreCachedRepo(lastId, { soft: true })
    return
  }
  if (cachedRepos.value.length) {
    scmSub.value = 'history'
    sbStatus.value = `有 ${cachedRepos.value.length} 个历史仓库，打开资源管理器 → 版本库可继续`
  }
})

function onLocalRan(ok: boolean) {
  if (!ok) return
  user.markStudy()
  study.completeTask('prog-practice')
}

function startStarter(id: StarterId) {
  void openLocal({ kind: 'starter', value: id })
}

function onOpenSavedProject(project: LocalRunProject) {
  linkedRepo.value = { label: project.title || '个人项目', provider: 'local' }
  activeRepoId.value = null
  activeParsed.value = null
  currentBranch.value = ''
  cachedBranches.value = []
  rememberLastGitRepo(null)
  lastOpen.value = null
  applyProject(project)
  runFocus.value = 'code'
  showCloneForm.value = false
  runPanelRef.value?.closeTree()
  const n = Object.keys(project.files).filter((p) => !p.startsWith('__localrun_')).length
  sbStatus.value = `已打开个人项目 · ${n} 个文件，点「运行」可预览`
  sbError.value = ''
}

function loadGitRepo(pathOrUrl?: string) {
  const raw = (pathOrUrl ?? gitInput.value).trim()
  const parsed = parseGitRepoInput(raw)
  if (!parsed) {
    sbError.value =
      '请输入仓库地址，例如：\nhttps://github.com/user/repo\nhttps://gitee.com/user/repo\nhttps://gitlab.com/user/repo\n（私有仓会提示填写访问令牌）'
    sbStatus.value = ''
    showCloneForm.value = true
    showScm()
    return
  }
  gitInput.value = raw
  void openLocal({ kind: 'git', value: raw })
}

function useExample(url: string) {
  gitInput.value = url
  showCloneForm.value = true
  loadGitRepo(url)
}

function onCloneRemote() {
  showCloneForm.value = true
  scmSub.value = 'changes'
  sbError.value = ''
}

function pickLocalFiles() {
  if (shouldOfferFileSourceSheet()) {
    fileSourceKind.value = 'files'
    fileSourceOpen.value = true
    return
  }
  localFileInput.value?.click()
}

function pickLocalFolder() {
  if (shouldOfferFileSourceSheet()) {
    fileSourceKind.value = 'folder'
    fileSourceOpen.value = true
    return
  }
  localFolderInput.value?.click()
}

async function ingestLocalFiles(list: File[]) {
  if (!list.length) return
  if (sbBusy.value) {
    sbStatus.value = '请稍候，当前有任务正在进行…'
    return
  }
  workspaceEpoch += 1
  sbBusy.value = true
  sbError.value = ''
  sbStatus.value = `正在读取 ${list.length} 个本地文件…`
  try {
    const uploaded = await filesFromFileList(list)
    const project: LocalRunProject = {
      title: uploaded.title,
      files: uploaded.files,
      openFile: uploaded.openFile,
    }
    linkedRepo.value = { label: uploaded.title, provider: 'local' }
    activeRepoId.value = null
    activeParsed.value = null
    currentBranch.value = ''
    cachedBranches.value = []
    rememberLastGitRepo(null)
    lastOpen.value = null
    applyProject(project)
    showCloneForm.value = false
    runFocus.value = 'code'
    runPanelRef.value?.closeTree()
    const n = Object.keys(project.files).filter((p) => !p.startsWith('__localrun_')).length
    sbStatus.value = `已加载本地 ${n} 个文件，点「运行」可预览`
  } catch (err) {
    sbStatus.value = '本地上传失败'
    sbError.value = err instanceof Error ? err.message : String(err)
    runPanelRef.value?.openFilesAction('upload')
  } finally {
    sbBusy.value = false
  }
}

async function onLocalFilesChosen(ev: Event) {
  const input = ev.target as HTMLInputElement
  // FileList 是活列表：必须先拷贝再清空，否则 value='' 会把刚选的文件清掉，表现为选完没反应
  const list = Array.from(input.files ?? [])
  input.value = ''
  await ingestLocalFiles(list)
}

async function onFileSourcePicked(source: FilePickSource) {
  sbError.value = ''
  if (!canUseNativeFilePick()) {
    if (fileSourceKind.value === 'folder') localFolderInput.value?.click()
    else localFileInput.value?.click()
    return
  }
  try {
    if (source === 'wechat') {
      sbStatus.value =
        '已打开微信：请到聊天记录里打开文件 →「用其他应用打开」→ 学习宝典'
    }
    const list = await pickDeviceFiles({
      source,
      multiple: true,
      mimeType: '*/*',
    })
    if (!list.length) {
      if (source === 'wechat') sbStatus.value = '未收到微信文件，可重试或改用「手机本地文件」'
      return
    }
    await ingestLocalFiles(list)
  } catch (err) {
    if (source === 'wechat') void cancelDeviceFilePick()
    sbStatus.value = '本地上传失败'
    sbError.value = err instanceof Error ? err.message : String(err)
    runPanelRef.value?.openFilesAction('upload')
  }
}

function refreshScm() {
  sbError.value = ''
  if (linkedRepo.value && gitInput.value.trim()) {
    loadGitRepo(gitInput.value)
    return
  }
  sbStatus.value = '暂无关联仓库，可在资源管理器初始化模板或克隆远程'
}
</script>

<template>
  <div class="page full workbench immersive">
    <div class="ide">
      <div class="ide-body">
        <section class="run-panel">
          <div class="run-stage">
            <div class="run-main">
              <LocalRunPanel
                ref="runPanelRef"
                :key="localProject?.title || 'empty'"
                :project="localProject"
                :open-path="explorerPath"
                :focus-view="runFocus"
                :repo-id="activeRepoId"
                :branch="currentBranch"
                :repo-label="linkedRepo?.label"
                :busy="sbBusy"
                @ran="onLocalRan"
                @update:open-path="explorerPath = $event"
                @files-dirty="onFilesDirty"
                @create-starter="startStarter"
                @upload-local="pickLocalFiles"
                @upload-local-folder="pickLocalFolder"
                @open-saved-project="onOpenSavedProject"
                @leave="router.replace('/d/programming/practice')"
              >
                <template #git>
                  <section class="scm-panel embedded">
                    <header class="scm-head">
                      <h2 class="scm-title">版本库</h2>
                      <div class="scm-head-actions">
                        <button class="icon-btn" type="button" title="克隆远程" @click="onCloneRemote">
                          <AppIcon name="cloud-download" :size="16" />
                        </button>
                        <button class="icon-btn" type="button" title="刷新" :disabled="sbBusy" @click="refreshScm">
                          <AppIcon name="reload" :size="16" />
                        </button>
                        <button class="icon-btn" type="button" title="关闭" @click="runPanelRef?.closeTree()">
                          <AppIcon name="close" :size="16" />
                        </button>
                      </div>
                    </header>

                    <div class="scm-subs">
                      <button
                        class="scm-sub"
                        :class="{ on: scmSub === 'changes' }"
                        type="button"
                        @click="scmSub = 'changes'"
                      >
                        更改
                      </button>
                      <button
                        class="scm-sub"
                        :class="{ on: scmSub === 'history' }"
                        type="button"
                        @click="openHistoryTab"
                      >
                        历史记录{{ cachedRepos.length ? ` · ${cachedRepos.length}` : '' }}
                      </button>
                    </div>

                    <div class="scm-content">
                      <template v-if="scmSub === 'history'">
                        <p v-if="!cachedRepos.length" class="scm-empty-text">
                          还没有拉取记录。
                        </p>
                        <div v-else class="history-list">
                          <p class="clone-label">已缓存的仓库（点开即用）</p>
                          <div
                            v-for="r in cachedRepos"
                            :key="r.id"
                            class="history-item"
                            :class="{ on: r.id === activeRepoId }"
                          >
                            <button
                              class="history-main"
                              type="button"
                              :disabled="sbBusy"
                              @click="restoreCachedRepo(r.id)"
                            >
                              <span class="t-title">{{ r.title || `${r.owner}/${r.repo}` }}</span>
                              <span class="page-sub">
                                {{ providerTitle(r.provider) }} · {{ r.currentBranch }} ·
                                {{ r.cachedBranches?.length || 0 }} 个分支
                              </span>
                            </button>
                            <button
                              class="history-del"
                              type="button"
                              title="删除缓存"
                              :disabled="sbBusy"
                              @click="removeCachedRepo(r.id)"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                        <button
                          class="scm-primary"
                          type="button"
                          :disabled="sbBusy"
                          @click="onCloneRemote(); scmSub = 'changes'"
                        >
                          克隆新仓库
                        </button>
                      </template>
                      <template v-else-if="scmEnabled && !showCloneForm">
                        <p class="scm-linked">已关联：{{ linkedRepo?.label }}</p>
                        <div class="branch-bar">
                          <span class="branch-label">分支</span>
                          <button class="branch-chip" type="button" :disabled="sbBusy" @click="openBranchPicker">
                            {{ currentBranch || '选择分支' }} ▾
                          </button>
                        </div>
                        <div v-if="showBranchPicker" class="branch-picker">
                          <p class="clone-label">签出到…</p>
                          <button
                            v-for="b in remoteBranches.length ? remoteBranches : cachedBranches"
                            :key="b"
                            class="branch-item"
                            type="button"
                            :class="{ on: b === currentBranch, cached: cachedBranches.includes(b) }"
                            :disabled="sbBusy"
                            @click="checkoutBranch(b)"
                          >
                            <span>{{ b }}</span>
                            <span v-if="cachedBranches.includes(b)" class="branch-tag">已缓存</span>
                          </button>
                          <button class="scm-ghost tight block" type="button" @click="showBranchPicker = false">
                            取消
                          </button>
                        </div>
                        <p class="scm-empty-text">项目已缓存；切分支优先读库，未缓存再拉取。</p>
                        <button
                          class="scm-primary"
                          type="button"
                          :disabled="sbBusy"
                          @click="runPanelRef?.closeTree()"
                        >
                          回到编辑器
                        </button>
                        <button class="scm-secondary" type="button" :disabled="sbBusy" @click="openHistoryTab">
                          历史仓库
                        </button>
                        <button class="scm-secondary" type="button" :disabled="sbBusy" @click="refetchRemote">
                          重新拉取远程
                        </button>
                        <button
                          class="scm-ghost"
                          type="button"
                          :disabled="sbBusy || !activeRepoId"
                          @click="clearActiveCache"
                        >
                          清除本仓缓存
                        </button>
                      </template>
                      <template v-else>
                        <p class="scm-empty-text">
                          在此克隆远程仓库；初始化模板与上传本地文件请到「资源管理器」。
                        </p>
                        <button
                          v-if="cachedRepos.length"
                          class="scm-secondary"
                          type="button"
                          :disabled="sbBusy"
                          @click="openHistoryTab"
                        >
                          查看历史仓库（{{ cachedRepos.length }}）
                        </button>
                        <button class="scm-primary" type="button" :disabled="sbBusy" @click="onCloneRemote">
                          克隆远程仓库
                        </button>
                        <button
                          class="scm-secondary"
                          type="button"
                          :disabled="sbBusy"
                          @click="runPanelRef?.openFilesAction()"
                        >
                          打开资源管理器
                        </button>

                        <div v-if="showCloneForm" class="clone-form">
                          <p class="clone-label">远程地址（GitHub / Gitee / GitLab）</p>
                          <input
                            v-model="gitInput"
                            class="clone-input"
                            type="url"
                            placeholder="https://gitee.com/user/repo"
                            @keyup.enter="loadGitRepo()"
                          />
                          <div class="clone-actions">
                            <button class="scm-primary" type="button" :disabled="sbBusy" @click="loadGitRepo()">
                              拉取并打开
                            </button>
                          </div>
                          <p class="clone-tip">
                            支持公开与私有仓（私有仓将弹出访问令牌）。Vite Vue 3 / React / 静态页与 uni-app 简易 H5；子目录可写
                            …/tree/main/web。
                          </p>
                          <div class="example-row">
                            <button
                              v-for="ex in GIT_EXAMPLES"
                              :key="ex.url"
                              class="ex-chip"
                              type="button"
                              :disabled="sbBusy"
                              @click="useExample(ex.url)"
                            >
                              {{ ex.label }}
                            </button>
                          </div>
                        </div>
                      </template>

                      <p v-if="sbStatus" class="scm-status" :class="{ bad: !!sbError }">{{ sbStatus }}</p>
                      <p v-if="sbError" class="scm-err">{{ sbError }}</p>
                    </div>

                    <footer class="scm-foot">
                      <span class="scm-foot-left">
                        <span class="scm-dot" :class="{ on: scmEnabled }" />
                        {{ scmFooterLeft }}
                      </span>
                      <span class="scm-foot-right">{{ scmFooterRight }}</span>
                    </footer>
                  </section>
                </template>
              </LocalRunPanel>
            </div>
          </div>
        </section>
      </div>
    </div>

    <input
      ref="localFileInput"
      class="sr-file"
      type="file"
      multiple
      accept=".html,.htm,.css,.js,.mjs,.cjs,.jsx,.tsx,.ts,.vue,.json,.md,.svg,.txt,.png,.jpg,.jpeg,.gif,.webp,.ico"
      @change="onLocalFilesChosen"
    />
    <input
      ref="localFolderInput"
      class="sr-file"
      type="file"
      multiple
      webkitdirectory
      @change="onLocalFilesChosen"
    />

    <FileSourceSheet
      v-model:open="fileSourceOpen"
      title="选择文件来源"
      :hint="fileSourceHint"
      @pick="onFileSourcePicked"
    />

    <AppDialog
      v-model:open="authOpen"
      :title="`${authProviderLabel} 需要授权`"
      message="私有仓库请粘贴 Personal Access Token（私人令牌）。令牌不会上传到本应用服务器。"
      primary-text="授权并拉取"
      secondary-text="取消"
      @primary="onAuthConfirm"
      @secondary="onAuthCancel"
      @close="onAuthCancel"
    >
      <label class="auth-field">
        <span>用户名（可选）</span>
        <input v-model="authUsername" class="clone-input" type="text" autocomplete="username" placeholder="一般可留空" />
      </label>
      <label class="auth-field">
        <span>访问令牌</span>
        <input
          v-model="authToken"
          class="clone-input"
          type="password"
          autocomplete="off"
          placeholder="粘贴 Personal Access Token"
          @keyup.enter="onAuthConfirm"
        />
      </label>
      <label class="auth-check">
        <input v-model="authRemember" type="checkbox" />
        记住到本机（仅此设备，不上传）
      </label>
      <p class="auth-hint">
        {{ tokenHelpHint(authProvider) }}
        <a :href="tokenHelpUrl(authProvider)" target="_blank" rel="noopener noreferrer">打开申请页</a>
      </p>
    </AppDialog>
  </div>
</template>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.workbench.immersive {
  position: relative;
  padding: 0;
  overflow: hidden;
  height: 100%;
  background: var(--paper);
}

.workbench.immersive .ide {
  margin-top: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  min-height: 0;
  background: var(--paper);
}

.workbench.immersive .run-panel,
.workbench.immersive .run-stage,
.workbench.immersive .run-main {
  padding: 0;
  margin: 0;
  background: var(--paper);
}

.ide {
  margin-top: 4px;
  flex: 1;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--paper-2);
  color: var(--ink);
  min-height: 520px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 24px rgba(28, 25, 21, 0.06);
}

@media (orientation: landscape) {
  .workbench.immersive .ide {
    min-height: 0;
  }
}

.ide-rail {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 48px;
  border-bottom: 1px solid var(--line);
  background: var(--moss);
  padding: 0 8px;
}

.ide-rail-btn {
  width: 44px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.ide-rail-btn.on {
  color: var(--forest);
}

.ide-rail-btn.on::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 4px;
  height: 2px;
  border-radius: 2px;
  background: var(--forest);
}

.ide-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.scm-panel,
.files-panel,
.run-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 14px 0;
  background: var(--paper-2);
}

.scm-panel.embedded {
  padding: 0;
  background: var(--paper);
  height: 100%;
}

.scm-panel.embedded .scm-head {
  padding: 14px 12px 12px;
}

.scm-panel.embedded .scm-content {
  padding: 0 12px 12px;
}

.scm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.scm-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.scm-head-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:active {
  background: var(--moss);
  color: var(--forest);
}

.scm-subs {
  display: flex;
  gap: 18px;
  margin: 12px;
  border-bottom: 1px solid var(--line);
}

.scm-sub {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  padding: 0 0 10px;
  position: relative;
}

.scm-sub.on {
  color: var(--forest);
}

.scm-sub.on::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--forest);
}

.scm-content {
  flex: 1;
  padding: 20px 4px 16px;
  overflow: auto;
}

.scm-empty-text {
  margin: 0 0 18px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--ink-soft);
  text-align: center;
}

.scm-linked {
  margin: 0 0 10px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--forest);
}

.scm-primary,
.scm-secondary,
.scm-ghost {
  display: block;
  width: 100%;
  max-width: 280px;
  margin: 0 auto 10px;
  height: 40px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
}

.scm-primary {
  border: 0;
  background: var(--forest);
  color: var(--on-primary);
}

.scm-secondary {
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--forest);
}

.scm-ghost {
  border: 0;
  background: transparent;
  color: var(--ink-soft);
}

.scm-primary.tight,
.scm-secondary.tight,
.scm-ghost.tight {
  width: auto;
  max-width: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  margin: 0;
}

.scm-primary.tight.block,
.scm-secondary.tight.block,
.scm-ghost.tight.block {
  display: block;
  width: 100%;
  max-width: none;
  margin: 0 0 8px;
  height: 36px;
  font-size: 12px;
}

.clone-form,
.init-pick {
  margin-top: 16px;
  text-align: left;
}

.sr-file {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.clone-actions .tight-upload {
  margin: 0;
  max-width: none;
  flex: 1;
  height: 40px;
}

.clone-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
}

.clone-input {
  width: 100%;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink);
  padding: 0 12px;
  font-size: 13px;
  box-sizing: border-box;
}

.clone-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.clone-actions .scm-primary {
  margin: 0;
  max-width: none;
  flex: 1;
}

.clone-tip {
  margin: 10px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
}

.example-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.ex-chip {
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink-soft);
  font-size: 11px;
}

.init-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  margin-bottom: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--paper);
  text-align: left;
}

.init-item .t-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
}

.init-item .page-sub {
  font-size: 12px;
  color: var(--ink-soft);
}

.scm-status {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--forest);
  text-align: center;
}

.scm-status.bad {
  color: var(--coral);
}

.scm-err {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--coral);
  white-space: pre-wrap;
  line-height: 1.45;
}

.scm-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 4px 12px;
  border-top: 1px solid var(--line);
  font-size: 11px;
  color: var(--ink-soft);
}

.scm-foot-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scm-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
  flex-shrink: 0;
}

.scm-dot.on {
  background: var(--forest);
}

.explorer-meta {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--ink-soft);
  line-height: 1.4;
}

.explorer-box {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  padding: 8px 4px 12px;
  max-height: min(58vh, 520px);
  overflow: auto;
}

.starter-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.starter-card.themed {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  padding: 12px 14px;
}

.starter-card.themed .t-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
}

.starter-card.themed .page-sub {
  color: var(--ink-soft);
  font-size: 12px;
  margin-top: 4px;
}

.starter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.run-stage {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
  margin-bottom: 12px;
  /* 避免裁剪/圆角合成层导致内部 iframe 命中错位 */
  overflow: visible;
}

.run-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
  position: relative;
  z-index: 1;
}

.sb-placeholder {
  margin: 0;
  min-height: 280px;
  padding: 48px 16px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
}

.branch-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 0 12px;
}

.branch-label {
  font-size: 12px;
  color: var(--ink-soft);
  font-weight: 600;
}

.branch-chip {
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--forest);
  font-size: 12px;
  font-weight: 700;
}

.branch-picker {
  margin: 0 0 14px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  max-height: 220px;
  overflow: auto;
}

.branch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 10px 8px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  text-align: left;
  font-size: 13px;
  color: var(--ink);
}

.branch-item:last-of-type {
  border-bottom: 0;
}

.branch-item.on {
  color: var(--forest);
  font-weight: 700;
}

.branch-tag {
  font-size: 10px;
  color: var(--ink-soft);
}

.history-list {
  margin: 0 0 14px;
  text-align: left;
}

.history-item {
  display: flex;
  align-items: stretch;
  gap: 6px;
  margin: 0 0 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  overflow: hidden;
}

.history-item.on {
  border-color: color-mix(in srgb, var(--forest) 45%, var(--line));
  box-shadow: inset 3px 0 0 var(--forest);
}

.history-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  text-align: left;
}

.history-main .t-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}

.history-del {
  flex-shrink: 0;
  align-self: stretch;
  padding: 0 12px;
  border: 0;
  border-left: 1px solid var(--line);
  background: transparent;
  color: var(--ink-soft);
  font-size: 12px;
}

.history-del:disabled,
.history-main:disabled {
  opacity: 0.45;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--ink-soft);
  text-align: left;
}

.auth-field .clone-input {
  margin: 0;
}

.auth-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 8px;
  font-size: 13px;
  color: var(--ink);
  text-align: left;
}

.auth-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-soft);
  text-align: left;
}

.auth-hint a {
  color: var(--forest);
  margin-left: 4px;
}
</style>
