import { Capacitor, CapacitorHttp } from '@capacitor/core'
import {
  authHeadersFor,
  providerFromGitUrl,
  withProviderToken,
} from '@/domains/programming/stackblitz/gitCredentials'

export type HttpTextResult = { ok: boolean; status: number; text: string }

/**
 * 浏览器走 Vite 代理绕过 CORS；App 原生用 CapacitorHttp。
 * 用户 PAT（会话/本机）自动注入；Gitee 开发机 .env token 仍由 Vite 代理兜底。
 */
function toProxiedUrl(url: string): string {
  const withTok = withProviderToken(url)
  if (Capacitor.isNativePlatform()) return withTok
  if (typeof window === 'undefined') return withTok
  try {
    const u = new URL(withTok)
    const host = u.hostname.toLowerCase()
    if (host === 'api.github.com') {
      return `/git-proxy/github${u.pathname}${u.search}`
    }
    if (host === 'raw.githubusercontent.com') {
      return `/git-proxy/github-raw${u.pathname}${u.search}`
    }
    if (host === 'gitee.com') {
      return `/git-proxy/gitee${u.pathname}${u.search}`
    }
    if (host === 'gitlab.com') {
      return `/git-proxy/gitlab${u.pathname}${u.search}`
    }
  } catch {
    /* ignore */
  }
  return withTok
}

function mergeAuthHeaders(url: string, headers: Record<string, string>): Record<string, string> {
  const provider = providerFromGitUrl(url)
  if (!provider) return headers
  return { ...authHeadersFor(provider), ...headers }
}

export async function httpGetText(url: string, headers: Record<string, string> = {}): Promise<HttpTextResult> {
  const finalUrl = toProxiedUrl(url)
  const hdrs = mergeAuthHeaders(url, { Accept: '*/*', ...headers })

  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({ url: finalUrl, headers: hdrs })
    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
    return { ok: res.status >= 200 && res.status < 300, status: res.status, text }
  }

  const res = await fetch(finalUrl, { headers: hdrs })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

export async function httpGetJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await httpGetText(url, { Accept: 'application/json', ...headers })
  if (!res.ok) {
    throw new Error(`请求失败 HTTP ${res.status}\n${url}\n${res.text.slice(0, 200)}`)
  }
  try {
    return JSON.parse(res.text) as T
  } catch {
    throw new Error(`响应不是 JSON：${url}`)
  }
}
