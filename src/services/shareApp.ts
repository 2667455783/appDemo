import { Capacitor, registerPlugin } from '@capacitor/core'
import { UPDATE_PUBLIC_BASE } from '@/config/update'
import { checkForUpdate, getManifestUrl } from '@/services/appUpdate'

export const APP_SHARE_NAME = '学习宝典'
export const SHARE_APK_FILE_NAME = '学习宝典.apk'

export const DEFAULT_APK_SHARE_URL = `${UPDATE_PUBLIC_BASE}/latest.apk`

interface ShareAppPlugin {
  shareInstalledApk(options: { package: string; fileName?: string }): Promise<{
    ok: boolean
    fileName?: string
    size?: number
  }>
  shareToPackage(options: { text: string; title?: string; package: string }): Promise<{ ok: boolean }>
}

const ShareApp = registerPlugin<ShareAppPlugin>('ShareApp')

const WECHAT_PKG = 'com.tencent.mm'
const QQ_PKG = 'com.tencent.mobileqq'

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

export type ShareResult = { ok: boolean; message: string }

/** 分享本机已安装的 APK，不联网下载 */
async function shareInstalledToApp(pkg: string, appLabel: string): Promise<ShareResult> {
  if (!Capacitor.isNativePlatform()) {
    const url = DEFAULT_APK_SHARE_URL
    const copied = await copyText(url)
    return {
      ok: copied,
      message: copied
        ? `浏览器环境无法发安装包，已复制下载链接，请用${appLabel}发送`
        : '请在 App 内使用分享功能',
    }
  }

  try {
    await ShareApp.shareInstalledApk({ package: pkg, fileName: SHARE_APK_FILE_NAME })
    return { ok: true, message: `已打开${appLabel}，请选择好友发送当前版本安装包` }
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    // 失败时降级为下载链接
    let url = DEFAULT_APK_SHARE_URL
    try {
      const r = await checkForUpdate()
      if (r.status !== 'error' && r.remote?.apkUrl) url = r.remote.apkUrl
    } catch {
      /* ignore */
    }
    const copied = await copyText(url)
    if (copied) {
      return { ok: true, message: `${err || '分享失败'}，已改为复制下载链接` }
    }
    return { ok: false, message: err || '分享失败' }
  }
}

export function shareToWeChat(): Promise<ShareResult> {
  return shareInstalledToApp(WECHAT_PKG, '微信')
}

export function shareToQQ(): Promise<ShareResult> {
  return shareInstalledToApp(QQ_PKG, 'QQ')
}

export async function copyShareLink(): Promise<ShareResult> {
  let url = DEFAULT_APK_SHARE_URL
  try {
    const r = await checkForUpdate()
    if (r.status !== 'error' && r.remote?.apkUrl) url = r.remote.apkUrl
  } catch {
    /* ignore */
  }
  const copied = await copyText(url)
  return {
    ok: copied,
    message: copied ? '下载链接已复制（非安装包文件）' : '复制失败',
  }
}

export function getShareManifestHint(): string {
  return getManifestUrl()
}
