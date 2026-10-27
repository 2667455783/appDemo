import { Capacitor, registerPlugin } from '@capacitor/core'

export type FilePickSource = 'wechat' | 'local'

export type PickedDeviceFile = {
  name: string
  mimeType: string
  size: number
  path: string
}

type PickDeviceFilePlugin = {
  pick(options: {
    source: FilePickSource
    multiple?: boolean
    mimeType?: string
  }): Promise<{ canceled: boolean; files: PickedDeviceFile[] }>
}

const PickDeviceFile = registerPlugin<PickDeviceFilePlugin>('PickDeviceFile')

const ANY_MIME = '*/*'

/** 是否走原生插件选文件（目前仅 Android 实现微信/本地分流） */
export function canUseNativeFilePick(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

/** 是否先弹出「微信 / 本地」来源面板（App 内均弹出；非 Android 再落到系统文件框） */
export function shouldOfferFileSourceSheet(): boolean {
  return Capacitor.isNativePlatform()
}

/** 把原生缓存路径读成浏览器 File，供既有上传逻辑复用 */
export async function pickedToBrowserFiles(picked: PickedDeviceFile[]): Promise<File[]> {
  const out: File[] = []
  for (const p of picked) {
    const url = Capacitor.convertFileSrc(p.path)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`读取文件失败：${p.name}`)
    const blob = await res.blob()
    out.push(new File([blob], p.name, { type: p.mimeType || blob.type || 'application/octet-stream' }))
  }
  return out
}

/** 在 App 内用原生选择器选文件；用户取消返回空数组 */
export async function pickDeviceFiles(opts: {
  source: FilePickSource
  multiple?: boolean
  mimeType?: string
}): Promise<File[]> {
  if (!canUseNativeFilePick()) {
    throw new Error('当前环境不支持原生选文件')
  }
  const res = await PickDeviceFile.pick({
    source: opts.source,
    multiple: !!opts.multiple,
    mimeType: opts.mimeType || ANY_MIME,
  })
  if (res.canceled || !res.files?.length) return []
  return pickedToBrowserFiles(res.files)
}
