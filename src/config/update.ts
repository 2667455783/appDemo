/**
 * 版本更新 —— 已对接你的服务器
 * 清单：http://134.175.54.151/englishStudy/update.json
 * APK：  http://134.175.54.151/englishStudy/app-{version}.apk
 */
export const UPDATE_PUBLIC_BASE = 'http://134.175.54.151/englishStudy'

export const DEFAULT_UPDATE_MANIFEST_URL =
  (import.meta.env.VITE_UPDATE_MANIFEST_URL as string | undefined)?.trim() ||
  `${UPDATE_PUBLIC_BASE}/update.json`

export const UPDATE_URL_STORAGE_KEY = 'appUpdateManifestUrl'

export type UpdateManifest = {
  version: string
  versionCode: number
  apkUrl: string
  notes?: string
  publishedAt?: string
  force?: boolean
}

export type LocalAppVersion = {
  version: string
  build: string
  versionCode: number
}

export type UpdateCheckResult =
  | { status: 'latest'; local: LocalAppVersion; remote?: UpdateManifest }
  | { status: 'available'; local: LocalAppVersion; remote: UpdateManifest }
  | { status: 'error'; local: LocalAppVersion; message: string }
