import { App } from '@capacitor/app'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import {
  DEFAULT_UPDATE_MANIFEST_URL,
  UPDATE_URL_STORAGE_KEY,
  type LocalAppVersion,
  type UpdateCheckResult,
  type UpdateManifest,
} from '@/config/update'

/** 与 android versionCode 对齐；发版脚本会自动 +1 */
export const LOCAL_VERSION_CODE = Number(import.meta.env.VITE_APP_VERSION_CODE || 1)

export function getManifestUrl(): string {
  try {
    const saved = localStorage.getItem(UPDATE_URL_STORAGE_KEY)?.trim()
    if (saved) return saved
  } catch {
    /* ignore */
  }
  return DEFAULT_UPDATE_MANIFEST_URL
}

export function setManifestUrl(url: string) {
  const v = url.trim()
  if (!v) localStorage.removeItem(UPDATE_URL_STORAGE_KEY)
  else localStorage.setItem(UPDATE_URL_STORAGE_KEY, v)
}

export async function getLocalVersion(): Promise<LocalAppVersion> {
  const webVersion = (import.meta.env.VITE_APP_VERSION as string) || '1.0.0'
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo()
      const build = info.build || String(LOCAL_VERSION_CODE)
      return {
        version: info.version || webVersion,
        build,
        versionCode: Number(build) || LOCAL_VERSION_CODE,
      }
    } catch {
      /* fall through */
    }
  }
  return {
    version: webVersion,
    build: String(LOCAL_VERSION_CODE),
    versionCode: LOCAL_VERSION_CODE,
  }
}

function parseManifest(data: unknown): UpdateManifest {
  const m = data as UpdateManifest
  if (!m || typeof m.version !== 'string' || typeof m.versionCode !== 'number' || typeof m.apkUrl !== 'string') {
    throw new Error('更新清单格式无效')
  }
  if (!m.apkUrl.trim()) throw new Error('更新清单缺少 apkUrl')
  return m
}

async function fetchManifestJson(url: string): Promise<unknown> {
  const sep = url.includes('?') ? '&' : '?'
  const full = `${url}${sep}_t=${Date.now()}`

  // 原生走 CapacitorHttp，绕过 WebView CORS
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({
      url: full,
      headers: { Accept: 'application/json' },
      connectTimeout: 15000,
      readTimeout: 15000,
    })
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`无法获取更新信息 (${res.status})`)
    }
    if (typeof res.data === 'string') {
      try {
        return JSON.parse(res.data)
      } catch {
        throw new Error('更新清单不是合法 JSON')
      }
    }
    return res.data
  }

  const res = await fetch(full, { cache: 'no-store' })
  if (!res.ok) throw new Error(`无法获取更新信息 (${res.status})`)
  return res.json()
}

/** 比较 versionCode；远端更大则有更新 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const local = await getLocalVersion()
  const url = getManifestUrl()
  try {
    const remote = parseManifest(await fetchManifestJson(url))
    if (remote.versionCode > local.versionCode) {
      return { status: 'available', local, remote }
    }
    return { status: 'latest', local, remote }
  } catch (e: any) {
    return {
      status: 'error',
      local,
      message: e?.message || '检查更新失败，请检查网络或更新地址',
    }
  }
}

/** 打开 APK 下载，由系统下载后安装 */
export function openApkDownload(apkUrl: string) {
  const a = document.createElement('a')
  a.href = apkUrl
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
