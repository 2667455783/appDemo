import { httpGetJson, httpGetText } from '@/domains/programming/stackblitz/http'
import type { GitProvider, ParsedRepo } from '@/domains/programming/stackblitz/parseRepo'

/** 私有仓 / 未授权：UI 弹令牌窗后重试 */
export class GitAuthRequiredError extends Error {
  readonly code = 'GIT_AUTH_REQUIRED' as const
  readonly provider: GitProvider
  constructor(provider: GitProvider) {
    const label = provider === 'github' ? 'GitHub' : provider === 'gitee' ? 'Gitee' : 'GitLab'
    super(`${label} 仓库需要授权（私有或不存在）。请粘贴 Personal Access Token 后重试。`)
    this.name = 'GitAuthRequiredError'
    this.provider = provider
  }
}

export function isGitAuthRequiredError(err: unknown): err is GitAuthRequiredError {
  return (
    err instanceof GitAuthRequiredError ||
    (!!err && typeof err === 'object' && (err as { code?: string }).code === 'GIT_AUTH_REQUIRED')
  )
}

const MAX_FILES = 80
const MAX_FILE_BYTES = 200_000
const SKIP_DIR_RE =
  /(^|\/)(node_modules|\.git|\.svn|\.hg|dist|build|coverage|\.next|\.nuxt|\.output|vendor)(\/|$)/i
const SKIP_FILE_RE =
  /\.(png|jpe?g|gif|webp|ico|bmp|svg|woff2?|ttf|eot|mp4|mp3|zip|gz|tgz|jar|class|exe|dll|so|dylib|pdf|lock)$/i

export type FetchedRepo = {
  title: string
  files: Record<string, string>
  openFile: string
  hasPackageJson: boolean
  /** 实际拉取的分支 / tag / commit */
  ref: string
  /** 二进制资源（图片等）不拉取，本地运行时用远程 raw 地址拼出来 */
  assetBase?: string
  /** 自动定位到的前端子目录（相对仓库根） */
  detectedRoot?: string
}

type TreeItem = { path: string; type: 'blob' | 'tree' | string; size?: number }

/** .github / .claude / .vscode 等隐藏目录，以及子目录里的文档，对运行没用还占请求数 */
const HIDDEN_DIR_RE = /(^|\/)\.[^/]+\//
const NESTED_DOC_RE = /\/[^/]+\.(md|mdx|txt|rst)$/i
const DOC_DIR_RE = /^docs?\//i
const BACKEND_DIR_RE = /(^|\/)(background|backend|server|servers?|api|apis)(\/|$)/i
const ENTRY_MARKERS = [
  'index.html',
  'public/index.html',
  'src/main.ts',
  'src/main.js',
  'src/main.tsx',
  'src/main.jsx',
  'src/index.tsx',
  'src/index.jsx',
  'src/index.ts',
  'src/index.js',
]

function shouldSkipPath(path: string): boolean {
  if (SKIP_DIR_RE.test(path)) return true
  if (SKIP_FILE_RE.test(path)) return true
  if (HIDDEN_DIR_RE.test(path)) return true
  if (NESTED_DOC_RE.test(path) || DOC_DIR_RE.test(path)) return true
  return false
}

/** 统一限流提示（含如何配置开发机 token） */
function giteeRateLimitHint(): string {
  return (
    'Gitee 接口限流（403）：可在拉取弹窗填写私人令牌，或在 backend/.env 配置 GITEE_ACCESS_TOKEN 后重启 npm run dev；' +
    '也可过 15～60 分钟再试'
  )
}

function toGitProvider(label: string): GitProvider {
  if (label === 'GitHub' || label === 'github') return 'github'
  if (label === 'Gitee' || label === 'gitee') return 'gitee'
  return 'gitlab'
}

function isRateLimited(msg: string, status: number): boolean {
  if (status === 429) return true
  return /Rate Limit|rate.?limit|API rate|访问频率|请求过于频繁|滥用|abuse/i.test(msg)
}

function isAuthFailure(msg: string, status: number): boolean {
  if (status === 401) return true
  if (status === 404) return true // 私有仓常伪装成 404
  if (status === 403 && !isRateLimited(msg, status)) return true
  return /Bad credentials|Requires authentication|Unauthorized|认证失败|没有权限|not allowed|access denied/i.test(
    msg,
  )
}

function friendlyError(err: unknown, providerLabel: string): Error {
  if (isGitAuthRequiredError(err)) return err
  const msg = err instanceof Error ? err.message : String(err)
  const status = Number(msg.match(/HTTP (\d+)/)?.[1] || 0)
  const provider = toGitProvider(providerLabel)

  if (isRateLimited(msg, status) || (status === 403 && /Rate Limit/i.test(msg))) {
    if (provider === 'gitee') return new Error(giteeRateLimitHint())
    return new Error(
      `${providerLabel} 接口限流（${status || '403'}）：短时间请求太多，可填写访问令牌提高额度，或过几分钟再试`,
    )
  }
  if (isAuthFailure(msg, status)) {
    return new GitAuthRequiredError(provider)
  }
  return err instanceof Error ? err : new Error(msg)
}

function normalizeSubpath(sub?: string): string {
  return (sub ?? '').replace(/^\/+|\/+$/g, '')
}

function stripSubpath(path: string, sub: string): string | null {
  if (!sub) return path
  if (path === sub) return null
  if (!path.startsWith(`${sub}/`)) return null
  return path.slice(sub.length + 1)
}

/** 文件数有上限：入口/前端源码优先，后端与文档靠后 */
function pathPriority(path: string): number {
  if (BACKEND_DIR_RE.test(path)) return 11
  if (/(^|\/)(package\.json|index\.html|public\/index\.html)$/i.test(path)) return 0
  if (/(^|\/)src\//.test(path)) return 1
  if (/(^|\/)(web|frontend|client|h5|app)(\/|$)/i.test(path)) return 2
  if (/\.(vue|[cm]?[jt]sx?|css)$/i.test(path) && !path.includes('/')) return 3
  if (/(^|\/)(tests?|__tests__|e2e|cypress|docs?|\.github|\.vscode|scripts)\//i.test(path)) return 9
  if (/\.(md|txt|ya?ml|toml)$/i.test(path)) return 8
  return 5
}

function prioritize<T extends { path: string }>(items: T[], sub: string): T[] {
  return [...items].sort(
    (a, b) =>
      pathPriority(stripSubpath(a.path, sub) ?? a.path) - pathPriority(stripSubpath(b.path, sub) ?? b.path),
  )
}

function joinBase(base: string, sub: string): string {
  return sub ? `${base}${sub.split('/').map(encodeURIComponent).join('/')}/` : base
}

function pickOpenFile(files: Record<string, string>): string {
  const keys = Object.keys(files)
  const prefer = [
    'src/App.vue',
    'src/App.jsx',
    'src/App.tsx',
    'src/main.ts',
    'src/main.js',
    'index.html',
    'README.md',
    'readme.md',
  ]
  for (const p of prefer) {
    if (files[p] != null) return p
  }
  return keys[0] ?? 'index.html'
}

function hasEntryAtRoot(files: Record<string, string>): boolean {
  return ENTRY_MARKERS.some((p) => files[p] != null)
}

/** 单体仓常把前端放在 web/ frontend/ 等子目录，根目录没有 index.html */
function detectFrontendRoot(files: Record<string, string>): string {
  if (hasEntryAtRoot(files)) return ''

  const dirs = new Set<string>()
  for (const path of Object.keys(files)) {
    if (path.endsWith('/package.json')) dirs.add(path.slice(0, -'/package.json'.length))
    for (const marker of ENTRY_MARKERS) {
      if (path === marker) continue
      if (path.endsWith(`/${marker}`)) dirs.add(path.slice(0, -(marker.length + 1)))
    }
  }

  let best = ''
  let bestScore = 0
  for (const dir of dirs) {
    if (!dir || BACKEND_DIR_RE.test(`${dir}/`)) continue
    let score = 0
    if (ENTRY_MARKERS.some((m) => files[`${dir}/${m}`] != null)) score += 10
    const pkg = files[`${dir}/package.json`] ?? ''
    if (/"vue"|"react"|"vite"|@vitejs/i.test(pkg)) score += 6
    if (/(^|\/)(web|frontend|client|h5|app)$/i.test(dir)) score += 4
    if (score > bestScore) {
      bestScore = score
      best = dir
    }
  }
  return bestScore > 0 ? best : ''
}

function remountUnder(files: Record<string, string>, root: string): Record<string, string> {
  if (!root) return files
  const prefix = `${root}/`
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(files)) {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v
  }
  return Object.keys(out).length ? out : files
}

function isUniApp(files: Record<string, string>): boolean {
  const pkg = files['package.json'] ?? ''
  if (/@dcloudio\/|vite-plugin-uni|"uni-app"/i.test(pkg)) return true
  if (files['pages.json'] != null || files['src/pages.json'] != null) return true
  const main = files['src/main.js'] ?? files['src/main.ts'] ?? ''
  if (/createSSRApp/.test(main) && /export\s+function\s+createApp/.test(main)) return true
  return false
}

function finalizeFetched(
  title: string,
  files: Record<string, string>,
  assetBase: string | undefined,
  userSubpath: string,
  ref: string,
): FetchedRepo {
  // 用户已指定子目录则不再二次猜测
  const detectedRoot = userSubpath ? '' : detectFrontendRoot(files)
  const remounted = remountUnder(files, detectedRoot)
  const base = detectedRoot && assetBase ? joinBase(assetBase, detectedRoot) : assetBase

  if (!hasEntryAtRoot(remounted) && !isUniApp(remounted)) {
    const sample = Object.keys(remounted).slice(0, 8).join('、') || '（无文件）'
    throw new Error(
      `没找到可运行的前端入口（需要 index.html 或 src/main.*）。已拉取：${sample}。若前端在子目录，请在地址后加上路径，例如 …/tree/main/my-production/web`,
    )
  }

  return {
    title: detectedRoot ? `${title} · ${detectedRoot}` : title,
    files: remounted,
    openFile: pickOpenFile(remounted),
    hasPackageJson: remounted['package.json'] != null,
    ref,
    assetBase: base,
    detectedRoot: detectedRoot || undefined,
  }
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R | null>): Promise<R[]> {
  const out: R[] = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      const item = items[idx]!
      const r = await fn(item)
      if (r != null) out.push(r)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) || 1 }, () => worker()))
  return out
}

/** —— GitHub —— */
async function githubDefaultBranch(owner: string, repo: string): Promise<string> {
  const meta = await httpGetJson<{ default_branch?: string }>(
    `https://api.github.com/repos/${owner}/${repo}`,
  )
  return meta.default_branch || 'main'
}

async function fetchGithub(parsed: ParsedRepo): Promise<FetchedRepo> {
  const ref = parsed.ref || (await githubDefaultBranch(parsed.owner, parsed.repo))
  const tree = await httpGetJson<{ tree?: { path: string; type: string; size?: number }[]; truncated?: boolean }>(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
  )
  if (tree.truncated) {
    throw new Error('仓库文件太多（GitHub tree 被截断），请换更小的仓或指定子目录')
  }
  const sub = normalizeSubpath(parsed.subpath)
  const candidates = (tree.tree ?? [])
    .filter((t) => t.type === 'blob' && t.path)
    .map((t) => ({ path: t.path, type: 'blob' as const, size: t.size }))
    .filter((t) => {
      const rel = stripSubpath(t.path, sub)
      return rel != null && !shouldSkipPath(rel) && (t.size ?? 0) <= MAX_FILE_BYTES
    })
  const blobs = prioritize(candidates, sub).slice(0, MAX_FILES)

  if (!blobs.length) throw new Error('未找到可导入的文本文件（可能路径不对或全是二进制）')

  const pairs = await mapPool(blobs, 6, async (b) => {
    const rel = stripSubpath(b.path, sub)!
    const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(ref)}/${b.path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`
    const res = await httpGetText(rawUrl)
    if (!res.ok) return null
    if (res.text.length > MAX_FILE_BYTES) return null
    return [rel, res.text] as const
  })

  const files = Object.fromEntries(pairs)
  if (!Object.keys(files).length) throw new Error('文件内容拉取失败')
  return finalizeFetched(
    `${parsed.owner}/${parsed.repo}`,
    files,
    joinBase(
      `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(ref)}/`,
      sub,
    ),
    sub,
    ref,
  )
}

/** —— Gitee —— */
type GiteeTreeBlob = { path: string; type: 'blob'; size?: number; sha?: string }

function decodeGiteeBase64(content: string): string {
  const bin = atob(content.replace(/\n/g, ''))
  return new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

async function giteeDefaultBranch(owner: string, repo: string): Promise<string> {
  const meta = await httpGetJson<{ default_branch?: string }>(`https://gitee.com/api/v5/repos/${owner}/${repo}`)
  return meta.default_branch || 'master'
}

async function fetchGitee(parsed: ParsedRepo): Promise<FetchedRepo> {
  const ref = parsed.ref || (await giteeDefaultBranch(parsed.owner, parsed.repo))
  // Gitee: 先拿分支 commit sha，再 recursive tree（仅 2 次 API）
  const branch = await httpGetJson<{ commit?: { sha?: string } }>(
    `https://gitee.com/api/v5/repos/${parsed.owner}/${parsed.repo}/branches/${encodeURIComponent(ref)}`,
  )
  const sha = branch.commit?.sha
  if (!sha) throw new Error(`Gitee 分支不存在：${ref}`)

  const tree = await httpGetJson<{
    tree?: { path: string; type: string; size?: string | number; sha?: string }[]
  }>(`https://gitee.com/api/v5/repos/${parsed.owner}/${parsed.repo}/git/trees/${sha}?recursive=1`)
  const sub = normalizeSubpath(parsed.subpath)
  const candidates: GiteeTreeBlob[] = (tree.tree ?? [])
    .filter((t) => t.type === 'blob' && t.path)
    .map((t) => ({
      path: t.path,
      type: 'blob' as const,
      size: typeof t.size === 'string' ? Number(t.size) : t.size,
      sha: t.sha,
    }))
    .filter((t) => {
      const rel = stripSubpath(t.path, sub)
      return rel != null && !shouldSkipPath(rel) && (t.size ?? 0) <= MAX_FILE_BYTES
    })
  const blobs = prioritize(candidates, sub).slice(0, MAX_FILES)

  if (!blobs.length) throw new Error('未找到可导入的文本文件')

  const encodedRef = encodeURIComponent(ref)
  let limited = false
  let usedApiFallback = 0

  // raw 不占 Open API 配额；失败再用 blob sha（仍计配额，故限速+少并发）
  async function readViaRaw(path: string): Promise<string | null> {
    const res = await httpGetText(
      `https://gitee.com/${parsed.owner}/${parsed.repo}/raw/${encodedRef}/${path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
    )
    if (!res.ok) return null
    // 未登录常被重定向成 HTML 壳
    if (/^\s*<!DOCTYPE html/i.test(res.text) || /<html[\s>]/i.test(res.text.slice(0, 200))) return null
    return res.text
  }

  async function readViaBlob(fileSha: string): Promise<string | null> {
    if (limited) return null
    const url = `https://gitee.com/api/v5/repos/${parsed.owner}/${parsed.repo}/git/blobs/${fileSha}`
    const res = await httpGetText(url, { Accept: 'application/json' })
    if (res.status === 403 || res.status === 429) {
      limited = true
      return null
    }
    if (!res.ok) return null
    usedApiFallback += 1
    try {
      const data = JSON.parse(res.text) as { content?: string; encoding?: string }
      if (!data.content) return null
      if (data.encoding === 'base64') return decodeGiteeBase64(data.content)
      return data.content
    } catch {
      return null
    }
  }

  // 并发压低，避免一上来打爆配额
  const pairs = await mapPool(blobs, 2, async (b) => {
    const rel = stripSubpath(b.path, sub)!
    try {
      let text = await readViaRaw(b.path)
      if (text == null && b.sha) text = await readViaBlob(b.sha)
      if (text == null || text.length > MAX_FILE_BYTES) return null
      return [rel, text] as const
    } catch {
      return null
    }
  })

  const files = Object.fromEntries(pairs)
  if (!Object.keys(files).length) {
    throw new Error(limited ? giteeRateLimitHint() : 'Gitee 文件内容拉取失败（请确认仓库公开）')
  }
  if (limited && usedApiFallback > 0) {
    // 部分文件靠 API 拿到后触顶：仍返回已有文件，但提示用户加 token
    console.warn('[gitee]', giteeRateLimitHint())
  }
  return finalizeFetched(
    `${parsed.owner}/${parsed.repo}`,
    files,
    joinBase(`https://gitee.com/${parsed.owner}/${parsed.repo}/raw/${encodeURIComponent(ref)}/`, sub),
    sub,
    ref,
  )
}

/** —— GitLab —— */
async function gitlabDefaultBranch(owner: string, repo: string): Promise<string> {
  const id = encodeURIComponent(`${owner}/${repo}`)
  const meta = await httpGetJson<{ default_branch?: string }>(`https://gitlab.com/api/v4/projects/${id}`)
  return meta.default_branch || 'main'
}

async function fetchGitlab(parsed: ParsedRepo): Promise<FetchedRepo> {
  const ref = parsed.ref || (await gitlabDefaultBranch(parsed.owner, parsed.repo))
  const id = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
  const tree = await httpGetJson<{ path: string; type: string }[]>(
    `https://gitlab.com/api/v4/projects/${id}/repository/tree?ref=${encodeURIComponent(ref)}&recursive=true&per_page=100`,
  )
  const sub = normalizeSubpath(parsed.subpath)
  const candidates: TreeItem[] = (Array.isArray(tree) ? tree : [])
    .filter((t) => t.type === 'blob' && t.path)
    .map((t) => ({ path: t.path, type: 'blob' }))
    .filter((t) => {
      const rel = stripSubpath(t.path, sub)
      return rel != null && !shouldSkipPath(rel)
    })
  const blobs = prioritize(candidates, sub).slice(0, MAX_FILES)

  if (!blobs.length) throw new Error('未找到可导入的文本文件')

  const pairs = await mapPool(blobs, 4, async (b) => {
    const rel = stripSubpath(b.path, sub)!
    const filePath = encodeURIComponent(b.path)
    const url = `https://gitlab.com/api/v4/projects/${id}/repository/files/${filePath}/raw?ref=${encodeURIComponent(ref)}`
    const res = await httpGetText(url)
    if (!res.ok || res.text.length > MAX_FILE_BYTES) return null
    return [rel, res.text] as const
  })

  const files = Object.fromEntries(pairs)
  if (!Object.keys(files).length) throw new Error('GitLab 文件内容拉取失败（请确认仓库公开）')
  return finalizeFetched(
    `${parsed.owner}/${parsed.repo}`,
    files,
    joinBase(`https://gitlab.com/${parsed.owner}/${parsed.repo}/-/raw/${encodeURIComponent(ref)}/`, sub),
    sub,
    ref,
  )
}

/** 列出远程分支名（经 Vite git-proxy，不经后端） */
export async function listRemoteBranches(parsed: ParsedRepo): Promise<string[]> {
  try {
    switch (parsed.provider) {
      case 'github': {
        const rows = await httpGetJson<{ name?: string }[]>(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches?per_page=100`,
        )
        return rows.map((r) => r.name).filter((n): n is string => !!n)
      }
      case 'gitee': {
        const rows = await httpGetJson<{ name?: string }[]>(
          `https://gitee.com/api/v5/repos/${parsed.owner}/${parsed.repo}/branches`,
        )
        return rows.map((r) => r.name).filter((n): n is string => !!n)
      }
      case 'gitlab': {
        const id = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
        const rows = await httpGetJson<{ name?: string }[]>(
          `https://gitlab.com/api/v4/projects/${id}/repository/branches?per_page=100`,
        )
        return rows.map((r) => r.name).filter((n): n is string => !!n)
      }
      default:
        return []
    }
  } catch (err) {
    const label = parsed.provider === 'github' ? 'GitHub' : parsed.provider === 'gitee' ? 'Gitee' : 'GitLab'
    throw friendlyError(err, label)
  }
}

export async function fetchPublicRepo(parsed: ParsedRepo): Promise<FetchedRepo> {
  try {
    switch (parsed.provider) {
      case 'github':
        return await fetchGithub(parsed)
      case 'gitee':
        return await fetchGitee(parsed)
      case 'gitlab':
        return await fetchGitlab(parsed)
      default:
        throw new Error('不支持的 Git 平台')
    }
  } catch (err) {
    const label = parsed.provider === 'github' ? 'GitHub' : parsed.provider === 'gitee' ? 'Gitee' : 'GitLab'
    throw friendlyError(err, label)
  }
}
