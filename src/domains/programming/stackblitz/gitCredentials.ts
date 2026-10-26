import type { GitProvider } from '@/domains/programming/stackblitz/parseRepo'

export type GitCredential = {
  token: string
  /** 部分平台 HTTPS 拉取需要；API 多数只需 token */
  username?: string
}

const mem = new Map<GitProvider, GitCredential>()
const LS_KEY = 'appdemo.git.pat'

function readStored(): Partial<Record<GitProvider, GitCredential>> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<Record<GitProvider, GitCredential>>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStored(all: Partial<Record<GitProvider, GitCredential>>) {
  try {
    if (!Object.keys(all).length) {
      localStorage.removeItem(LS_KEY)
      return
    }
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch {
    /* quota / private mode */
  }
}

export function getGitCredential(provider: GitProvider): GitCredential | null {
  const hit = mem.get(provider)
  if (hit?.token) return hit
  const stored = readStored()[provider]
  if (stored?.token?.trim()) {
    const cred = { token: stored.token.trim(), username: stored.username?.trim() || undefined }
    mem.set(provider, cred)
    return cred
  }
  return null
}

/** remember=true 写入 localStorage；false 仅会话内存，并清掉该 provider 的本地记忆 */
export function setGitCredential(provider: GitProvider, cred: GitCredential, remember: boolean) {
  const next: GitCredential = {
    token: cred.token.trim(),
    username: cred.username?.trim() || undefined,
  }
  if (!next.token) return
  mem.set(provider, next)
  const all = readStored()
  if (remember) {
    all[provider] = next
  } else {
    delete all[provider]
  }
  writeStored(all)
}

export function clearGitCredential(provider: GitProvider) {
  mem.delete(provider)
  const all = readStored()
  delete all[provider]
  writeStored(all)
}

export function providerFromGitUrl(url: string): GitProvider | null {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host === 'api.github.com' || host === 'github.com' || host === 'raw.githubusercontent.com') return 'github'
    if (host === 'gitee.com') return 'gitee'
    if (host === 'gitlab.com') return 'gitlab'
  } catch {
    /* ignore */
  }
  return null
}

export function authHeadersFor(provider: GitProvider): Record<string, string> {
  const cred = getGitCredential(provider)
  if (!cred?.token) return {}
  if (provider === 'github') return { Authorization: `Bearer ${cred.token}` }
  if (provider === 'gitlab') return { 'PRIVATE-TOKEN': cred.token }
  return {}
}

/** Gitee：access_token 走 query（含 raw）；已有则不改。优先用户令牌，其次 VITE_GITEE_TOKEN */
export function withProviderToken(url: string): string {
  const provider = providerFromGitUrl(url)
  if (provider !== 'gitee') return url
  if (/[?&]access_token=/.test(url)) return url
  const userTok = getGitCredential('gitee')?.token
  const envTok = ((import.meta.env.VITE_GITEE_TOKEN as string | undefined) || '').trim()
  const token = userTok || envTok
  if (!token) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}access_token=${encodeURIComponent(token)}`
}

export function tokenHelpUrl(provider: GitProvider): string {
  if (provider === 'github') return 'https://github.com/settings/tokens'
  if (provider === 'gitee') return 'https://gitee.com/profile/personal_access_tokens'
  return 'https://gitlab.com/-/user_settings/personal_access_tokens'
}

export function tokenHelpHint(provider: GitProvider): string {
  if (provider === 'github') return 'GitHub → Settings → Developer settings → Personal access tokens（勾选 repo）'
  if (provider === 'gitee') return 'Gitee → 设置 → 私人令牌（勾选 projects）'
  return 'GitLab → Preferences → Access Tokens（勾选 read_api / read_repository）'
}
