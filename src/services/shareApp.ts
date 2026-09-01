import { Capacitor, registerPlugin } from '@capacitor/core'
import { UPDATE_PUBLIC_BASE } from '@/config/update'
import { checkForUpdate, getManifestUrl } from '@/services/appUpdate'

export const APP_SHARE_NAME = '英语备考'

export const DEFAULT_APK_SHARE_URL = `${UPDATE_PUBLIC_BASE}/latest.apk`

interface ShareAppPlugin {
  shareApkUrl(options: { url: string; package: string; fileName?: string }): Promise<{
    ok: boolean
    fileName?: string
    size?: number
  }>
  shareToPackage(options: { text: string; title?: string; package: string }): Promise<{ ok: boolean }>
  addListener(
    event: 'shareProgress',
    listener: (e: { stage: string; percent: number }) => void,
  ): Promise<{ remove: () => void }>
}

const ShareApp = registerPlugin<ShareAppPlugin>('ShareApp')

const WECHAT_PKG = 'com.tencent.mm'
const QQ_PKG = 'com.tencent.mobileqq'

export type ShareProgressHandler = (percent: number, stage: string) => void

/** 优先用线上清单里的 apkUrl，否则 latest.apk */
export async function resolveApkShareUrl(): Promise<string> {
  try {
    const r = await checkForUpdate()
    if (r.status !== 'error' && r.remote?.apkUrl) {
      return r.remote.apkUrl
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_APK_SHARE_URL
}

function apkFileNameFromUrl(url: string): string {
  const name = url.split('/').pop()?.split('?')[0]
  return name && name.endsWith('.apk') ? name : 'english-study.apk'
}

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

async function shareApkToApp(
  pkg: string,
  appLabel: string,
  onProgress?: ShareProgressHandler,
): Promise<ShareResult> {
  const apkUrl = await resolveApkShareUrl()
  const fileName = apkFileNameFromUrl(apkUrl)

  if (!Capacitor.isNativePlatform()) {
    const copied = await copyText(apkUrl)
    return {
      ok: copied,
      message: copied
        ? `浏览器环境无法直接发安装包，已复制下载链接，请用${appLabel}发送给好友`
        : '请在 App 内使用分享功能',
    }
  }

  let removeListener: (() => void) | undefined
  try {
    const handle = await ShareApp.addListener('shareProgress', (e) => {
      onProgress?.(e.percent, e.stage)
    })
    removeListener = () => handle.remove()

    onProgress?.(0, 'downloading')
    await ShareApp.shareApkUrl({ url: apkUrl, package: pkg, fileName })
    return { ok: true, message: `已打开${appLabel}，请选择好友发送安装包` }
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    const copied = await copyText(apkUrl)
    if (copied) {
      return {
        ok: true,
        message: `${err || '分享安装包失败'}，已改为复制下载链接，请手动粘贴发送`,
      }
    }
    return { ok: false, message: err || '分享失败' }
  } finally {
    removeListener?.()
  }
}

export function shareToWeChat(onProgress?: ShareProgressHandler): Promise<ShareResult> {
  return shareApkToApp(WECHAT_PKG, '微信', onProgress)
}

export function shareToQQ(onProgress?: ShareProgressHandler): Promise<ShareResult> {
  return shareApkToApp(QQ_PKG, 'QQ', onProgress)
}

export async function copyShareLink(): Promise<ShareResult> {
  const apkUrl = await resolveApkShareUrl()
  const copied = await copyText(apkUrl)
  return {
    ok: copied,
    message: copied ? '下载链接已复制（非安装包文件）' : '复制失败',
  }
}

export function getShareManifestHint(): string {
  return getManifestUrl()
}
