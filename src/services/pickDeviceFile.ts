import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

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
  cancelPick(): Promise<void>
  consumePendingIncoming(): Promise<{ hasFile: boolean; file?: PickedDeviceFile }>
  addListener(
    eventName: 'incomingFile',
    listener: (e: { file: PickedDeviceFile }) => void,
  ): Promise<PluginListenerHandle>
}

const PickDeviceFile = registerPlugin<PickDeviceFilePlugin>('PickDeviceFile')

const ANY_MIME = '*/*'

/** 是否走原生插件选文件（目前仅 Android） */
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

/** 取消正在进行的微信聊天选文件等待 */
export async function cancelDeviceFilePick(): Promise<void> {
  if (!canUseNativeFilePick()) return
  await PickDeviceFile.cancelPick()
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

type IncomingHandler = (files: File[]) => void

let stashedIncoming: File[] | null = null
const incomingHandlers = new Set<IncomingHandler>()

/** 前端页面可登记：收到微信传入文件时回调（含 App 冷启动补发） */
export function onIncomingDeviceFiles(handler: IncomingHandler): () => void {
  incomingHandlers.add(handler)
  if (stashedIncoming?.length) {
    const files = stashedIncoming
    stashedIncoming = null
    handler(files)
  }
  return () => {
    incomingHandlers.delete(handler)
  }
}

function emitIncoming(files: File[]) {
  if (!files.length) return
  if (incomingHandlers.size === 0) {
    stashedIncoming = files
    return
  }
  stashedIncoming = null
  for (const h of incomingHandlers) h(files)
}

/** 取走尚未被页面消费的传入文件 */
export function takeStashedIncomingFiles(): File[] | null {
  const files = stashedIncoming
  stashedIncoming = null
  return files
}

/** 订阅从微信「用其他应用打开」传入的文件（含冷启动后的补发） */
export async function subscribeIncomingDeviceFiles(
  onFile?: (files: File[]) => void,
): Promise<() => void> {
  if (!canUseNativeFilePick()) return () => {}

  const forward = (files: File[]) => {
    emitIncoming(files)
    onFile?.(files)
  }

  try {
    const pending = await PickDeviceFile.consumePendingIncoming()
    if (pending.hasFile && pending.file) {
      const files = await pickedToBrowserFiles([pending.file])
      if (files.length) forward(files)
    }
  } catch {
    /* ignore */
  }

  const sub = await PickDeviceFile.addListener('incomingFile', (e) => {
    void pickedToBrowserFiles([e.file]).then((files) => {
      if (files.length) forward(files)
    })
  })

  return () => {
    void sub.remove()
  }
}
