import { Capacitor, registerPlugin } from '@capacitor/core'
import type { VoiceEngine, VoicePreset } from '@/data/voices'

interface AppTtsMedia {
  playUrl(options: { url: string }): Promise<{ ok?: boolean }>
  stop(): Promise<{ ok?: boolean }>
}

const AppTtsMedia = registerPlugin<AppTtsMedia>('AppTts')

function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

let playGen = 0
let currentAudio: HTMLAudioElement | null = null

export type SpeakSource = 'youdao' | 'baidu' | 'system' | ''

export const speakTrace: { source: SpeakSource; detail: string } = {
  source: '',
  detail: '',
}

export function stopNeural(): void {
  playGen += 1
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.removeAttribute('src')
      currentAudio.load()
    } catch {
      /* ignore */
    }
    currentAudio = null
  }
}

export function neuralGeneration(): number {
  return playGen
}

function splitChunks(text: string, max: number): string[] {
  const t = text.trim()
  if (t.length <= max) return [t]
  const parts = t.split(/(?<=[.!?。！？;；])\s+/)
  const out: string[] = []
  let buf = ''
  for (const p of parts) {
    if (!p) continue
    if ((buf + ' ' + p).trim().length > max) {
      if (buf) out.push(buf)
      if (p.length > max) {
        for (let i = 0; i < p.length; i += max) out.push(p.slice(i, i + max))
        buf = ''
      } else {
        buf = p
      }
    } else {
      buf = buf ? `${buf} ${p}` : p
    }
  }
  if (buf) out.push(buf)
  return out.length ? out : [t.slice(0, max)]
}

function playUrl(url: string, gen: number, timeoutMs: number): Promise<void> {
  if (isAndroidNative()) return playNativeUrl(url, gen, timeoutMs)
  return playHtmlAudio(url, gen, timeoutMs)
}

async function playNativeUrl(url: string, gen: number, timeoutMs: number): Promise<void> {
  if (gen !== playGen) return
  let timedOut = false
  const timer = window.setTimeout(() => {
    timedOut = true
    AppTtsMedia.stop().catch(() => {})
  }, timeoutMs)
  try {
    await AppTtsMedia.playUrl({ url })
  } finally {
    window.clearTimeout(timer)
  }
  if (gen !== playGen) return
  if (timedOut) throw new Error('audio timeout')
}

function playHtmlAudio(url: string, gen: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gen !== playGen) {
      resolve()
      return
    }
    const a = new Audio()
    currentAudio = a
    a.preload = 'auto'
    let settled = false
    const timer = window.setTimeout(() => finish(new Error('audio timeout')), timeoutMs)
    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (currentAudio === a) currentAudio = null
      if (err) {
        try {
          a.pause()
        } catch {
          /* ignore */
        }
        reject(err)
      } else resolve()
    }
    a.onended = () => finish()
    a.onerror = () => finish(new Error('audio error'))
    a.src = url
    a.play().catch((e) => finish(e instanceof Error ? e : new Error('play rejected')))
  })
}

function youdaoUrl(chunk: string, zh: boolean, type: 0 | 1): string {
  if (zh) return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(chunk)}&le=zh`
  return `https://dict.youdao.com/dictvoice?type=${type}&audio=${encodeURIComponent(chunk)}&le=en`
}

function baiduUrl(chunk: string, zh: boolean, spd: number): string {
  const q = `lan=${zh ? 'zh' : 'en'}&text=${encodeURIComponent(chunk)}&spd=${spd}&source=web`
  // 电脑浏览器带 Origin: localhost 时，百度会返回空 HTML。开发/预览走同源代理。
  if (!isAndroidNative()) return `/baidu-tts?${q}`
  return `https://fanyi.baidu.com/gettts?${q}`
}

function rateToBaiduSpd(rate: number): number {
  const n = Math.round(rate * 5)
  if (n < 1) return 1
  if (n > 9) return 9
  return n
}

function splitYoudao(text: string, zh: boolean): string[] {
  const t = text.trim()
  if (!t) return []
  if (zh) return splitChunks(t, 180)
  const parts = t
    .split(/[.!?。！？;；]+/)
    .map((s) => s.replace(/^[,，、\s]+|[,，、\s]+$/g, '').trim())
    .filter(Boolean)
  const out: string[] = []
  for (const p of parts) {
    if (p.length <= 90) out.push(p)
    else out.push(...splitChunks(p, 90))
  }
  return out.length ? out : [t.slice(0, 90)]
}

function youdaoWord(token: string): string {
  return token.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '').trim()
}

async function speakYoudaoChunk(
  chunk: string,
  zh: boolean,
  type: 0 | 1,
  gen: number,
): Promise<void> {
  try {
    await playUrl(youdaoUrl(chunk, zh, type), gen, 20_000)
  } catch (err) {
    if (zh || gen !== playGen) throw err
    const words = chunk.split(/\s+/).map(youdaoWord).filter((w) => w.length > 0)
    if (words.length <= 1) throw err
    for (const w of words) {
      if (gen !== playGen) return
      await playUrl(youdaoUrl(w, zh, type), gen, 15_000)
    }
  }
}

async function speakYoudao(text: string, preset: VoicePreset, zh: boolean, gen: number): Promise<void> {
  const type = preset.youdaoType
  for (const chunk of splitYoudao(text, zh)) {
    if (gen !== playGen) return
    await speakYoudaoChunk(chunk, zh, type, gen)
  }
}

async function speakBaidu(text: string, zh: boolean, rate: number, gen: number): Promise<void> {
  const spd = rateToBaiduSpd(rate)
  for (const chunk of splitChunks(text, 100)) {
    if (gen !== playGen) return
    await playUrl(baiduUrl(chunk, zh, spd), gen, 20_000)
  }
}

const ENGINE_LABEL: Record<Exclude<VoiceEngine, 'system'>, string> = {
  youdao: '有道',
  baidu: '百度',
}

/** 国内免费在线发音。失败或系统音色返回 false，交给系统 TTS。 */
export async function speakNeural(
  text: string,
  preset: VoicePreset,
  lang: string,
  rate: number,
  opts?: { engineOnly?: boolean },
): Promise<boolean> {
  if (preset.engine === 'system') return false

  const gen = playGen
  const zh = lang.toLowerCase().startsWith('zh')
  const preferred: Exclude<VoiceEngine, 'system'> = preset.engine === 'baidu' ? 'baidu' : 'youdao'
  // 有道美英靠 type 区分；失败后改走百度会把两种口音变成同一种听感
  const order: Array<Exclude<VoiceEngine, 'system'>> = opts?.engineOnly
    ? [preferred]
    : preferred === 'baidu'
      ? ['baidu', 'youdao']
      : ['youdao']

  for (const engine of order) {
    if (gen !== playGen) return true
    try {
      if (engine === 'youdao') await speakYoudao(text, preset, zh, gen)
      else await speakBaidu(text, zh, rate, gen)
      if (gen !== playGen) return true
      speakTrace.source = engine
      speakTrace.detail = engine === preset.engine ? preset.name : `${preset.name} · 改用${ENGINE_LABEL[engine]}`
      return true
    } catch {
      /* 试下一个国内源 */
    }
  }
  speakTrace.source = ''
  speakTrace.detail = opts?.engineOnly ? `${preset.name} · 在线发音失败` : ''
  return false
}

export function markSystemSpeak(preset: VoicePreset, voiceName: string): void {
  speakTrace.source = 'system'
  speakTrace.detail = voiceName ? `${preset.name} · ${voiceName}` : `${preset.name} · 系统默认`
}
