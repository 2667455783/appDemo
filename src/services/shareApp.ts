import { Capacitor, registerPlugin } from '@capacitor/core'
import { UPDATE_PUBLIC_BASE } from '@/config/update'
import { checkForUpdate, getManifestUrl } from '@/services/appUpdate'

export const APP_SHARE_NAME = '学习宝典'
export const SHARE_APK_FILE_NAME = '学习宝典.apk'

export const DEFAULT_APK_SHARE_URL = `${UPDATE_PUBLIC_BASE}/latest.apk`
export const DEFAULT_IPA_SHARE_URL = `${UPDATE_PUBLIC_BASE}/latest.ipa`

export type SharePlatform = 'android' | 'ios'
export type ShareChannel = 'wechat' | 'qq'
export type ShareResult = { ok: boolean; message: string }

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

async function resolvePackageUrls(): Promise<{ apkUrl: string; ipaUrl: string }> {
  let apkUrl = DEFAULT_APK_SHARE_URL
  let ipaUrl = DEFAULT_IPA_SHARE_URL
  try {
    const r = await checkForUpdate()
    if (r.status !== 'error' && r.remote) {
      if (r.remote.apkUrl?.trim()) apkUrl = r.remote.apkUrl.trim()
      if (r.remote.ipaUrl?.trim()) ipaUrl = r.remote.ipaUrl.trim()
    }
  } catch {
    /* ignore */
  }
  return { apkUrl, ipaUrl }
}

function channelMeta(channel: ShareChannel): { pkg: string; label: string } {
  return channel === 'wechat'
    ? { pkg: WECHAT_PKG, label: '微信' }
    : { pkg: QQ_PKG, label: 'QQ' }
}

function iosShareText(ipaUrl: string): string {
  return [
    `${APP_SHARE_NAME} iOS 安装包`,
    ipaUrl,
    '（需企业签 / 描述文件或 TestFlight 等方式安装，不能像安卓直接点链接安装）',
  ].join('\n')
}

/** 分享安卓安装包：原生发本机 APK；浏览器降级为复制下载链接 */
async function shareAndroid(channel: ShareChannel): Promise<ShareResult> {
  const { pkg, label } = channelMeta(channel)

  if (!Capacitor.isNativePlatform()) {
    const { apkUrl } = await resolvePackageUrls()
    const copied = await copyText(apkUrl)
    return {
      ok: copied,
      message: copied
        ? `浏览器环境无法发安装包，已复制安卓下载链接，请用${label}发送`
        : '请在 App 内使用分享功能',
    }
  }

  try {
    await ShareApp.shareInstalledApk({ package: pkg, fileName: SHARE_APK_FILE_NAME })
    return { ok: true, message: `已打开${label}，请选择好友发送安卓安装包` }
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    const { apkUrl } = await resolvePackageUrls()
    try {
      await ShareApp.shareToPackage({
        package: pkg,
        title: `${APP_SHARE_NAME} 安卓下载`,
        text: `${APP_SHARE_NAME} 安卓安装包\n${apkUrl}`,
      })
      return { ok: true, message: `本机安装包发送失败，已改为在${label}中发送安卓下载链接` }
    } catch {
      const copied = await copyText(apkUrl)
      if (copied) {
        return { ok: true, message: `${err || '分享失败'}，已复制安卓下载链接` }
      }
      return { ok: false, message: err || '分享失败' }
    }
  }
}

/** 分享 iOS：向微信/QQ 发送 IPA 下载链接（无法像 APK 直接塞安装包文件） */
async function shareIos(channel: ShareChannel): Promise<ShareResult> {
  const { pkg, label } = channelMeta(channel)
  const { ipaUrl } = await resolvePackageUrls()
  const text = iosShareText(ipaUrl)

  if (!Capacitor.isNativePlatform()) {
    const copied = await copyText(text)
    return {
      ok: copied,
      message: copied
        ? `浏览器环境无法直接调起${label}，已复制 iOS 下载说明，请粘贴发送`
        : '请在 App 内使用分享功能',
    }
  }

  try {
    await ShareApp.shareToPackage({
      package: pkg,
      title: `${APP_SHARE_NAME} iOS 下载`,
      text,
    })
    return { ok: true, message: `已打开${label}，请选择好友发送 iOS 下载链接` }
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    const copied = await copyText(text)
    if (copied) {
      return { ok: true, message: `${err || '分享失败'}，已复制 iOS 下载说明` }
    }
    return { ok: false, message: err || '分享失败' }
  }
}

export function shareToChannel(channel: ShareChannel, platform: SharePlatform): Promise<ShareResult> {
  return platform === 'ios' ? shareIos(channel) : shareAndroid(channel)
}

export function shareToWeChat(platform: SharePlatform): Promise<ShareResult> {
  return shareToChannel('wechat', platform)
}

export function shareToQQ(platform: SharePlatform): Promise<ShareResult> {
  return shareToChannel('qq', platform)
}

export function getShareManifestHint(): string {
  return getManifestUrl()
}
