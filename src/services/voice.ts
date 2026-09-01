// 统一语音输入：
//  - App（Capacitor）：本地 Vosk
//  - 浏览器：优先 Web Speech；国内常见 network 失败时，录音结束后用本地 Whisper 识别
import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

export type VoiceLang = 'en-US' | 'zh-CN'

export type VoiceHandlers = {
  onPartial?: (text: string) => void
  onFinal?: (text: string) => void
  onStart?: () => void
  onEnd?: () => void
  onError?: (msg: string) => void
  onDebug?: (step: string) => void
}

export interface VoskSpeechLoadOptions {
  name: string
}
export interface VoskSpeechLoadResult {
  loaded: boolean
  name: string
  cached?: boolean
}
export interface VoskSpeechPermissionStatus {
  speechRecognition: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'
}
export interface VoskSpeechPartialEvent {
  matches: string
}
export interface VoskSpeechResultEvent {
  result: string
}
export interface VoskSpeechFinalEvent {
  final: string
}
export interface VoskSpeechErrorEvent {
  message: string
}

export interface VoskSpeechPlugin {
  loadModel(options: VoskSpeechLoadOptions): Promise<VoskSpeechLoadResult>
  isModelLoaded(): Promise<{ loaded: boolean; name: string | null }>
  startListening(): Promise<{ started: boolean }>
  stopListening(): Promise<void>
  isListening(): Promise<{ isListening: boolean }>
  requestPermissions(): Promise<VoskSpeechPermissionStatus>
  addListener(
    eventName: 'partialResult',
    listener: (e: VoskSpeechPartialEvent) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'onResult',
    listener: (e: VoskSpeechResultEvent) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'onFinalResult',
    listener: (e: VoskSpeechFinalEvent) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'onError',
    listener: (e: VoskSpeechErrorEvent) => void,
  ): Promise<PluginListenerHandle>
}

const VoskSpeech = registerPlugin<VoskSpeechPlugin>('VoskSpeech')

const MODEL_BY_LANG: Record<VoiceLang, string> = {
  'zh-CN': 'vosk-model-small-cn',
  'en-US': 'vosk-model-small-en-us',
}

let listening = false
let nativeBase = ''
let nativeAcc = ''
let nativePartial = ''
let nativeHandlers: VoiceHandlers | null = null
let nativeListeners: PluginListenerHandle[] = []
let nativeSettled = false

let webRec: { stop: () => void; abort: () => void } | null = null
let webAcc = ''
let webBase = ''
let webHandlers: VoiceHandlers | null = null
let webSettled = false
let webLang: VoiceLang = 'zh-CN'
let webSpeechDead = false

let mediaStream: MediaStream | null = null
let mediaRecorder: MediaRecorder | null = null
let mediaChunks: BlobPart[] = []

type WhisperPipe = (audio: Float32Array | string, opts?: Record<string, unknown>) => Promise<{ text: string }>
let whisperPipe: WhisperPipe | null = null
let whisperLoading: Promise<WhisperPipe> | null = null

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

function dbg(step: string): void {
  console.log('[voice] ' + step)
  nativeHandlers?.onDebug?.(step)
  webHandlers?.onDebug?.(step)
}

function webCtor(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

export async function voiceAvailable(): Promise<{ ok: boolean; reason?: string }> {
  if (isNative()) return { ok: true }
  // 浏览器：有麦克风即可（Web Speech 失败时还能走 Whisper）
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: '当前环境无法使用麦克风' }
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return { ok: false, reason: '网页语音需要 HTTPS 或 localhost' }
  }
  return { ok: true }
}

export async function requestPermission(): Promise<boolean> {
  if (isNative()) {
    try {
      const r = await VoskSpeech.requestPermissions()
      return r.speechRecognition === 'granted'
    } catch {
      return false
    }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    return false
  }
}

function nativeSep(): string {
  const a = nativeAcc.trim()
  if (!a) return ''
  return a.endsWith(' ') ? '' : ' '
}

function nativeEmitPartial() {
  const a = nativeAcc.trim()
  const p = nativePartial.trim()
  let shown = nativeBase
  if (shown && !shown.endsWith(' ')) shown += ' '
  shown += a
  if (a && p) shown += ' '
  shown += p
  nativeHandlers?.onPartial?.(shown.trim())
}

function nativeCleanup() {
  for (const l of nativeListeners) {
    try {
      l.remove().catch(() => {})
    } catch {
      /* ignore */
    }
  }
  nativeListeners = []
  nativeHandlers = null
}

function nativeForceReset(): void {
  if (isNative()) {
    try {
      VoskSpeech.stopListening().catch(() => {})
    } catch {
      /* ignore */
    }
  }
  for (const l of nativeListeners) {
    try {
      l.remove().catch(() => {})
    } catch {
      /* ignore */
    }
  }
  nativeListeners = []
  nativeHandlers = null
  nativeBase = ''
  nativeAcc = ''
  nativePartial = ''
  nativeSettled = false
  listening = false
}

function nativeFinish(err?: string, text?: string) {
  if (nativeSettled) return
  nativeSettled = true
  listening = false
  if (err) nativeHandlers?.onError?.(err)
  else if (text != null) nativeHandlers?.onFinal?.(text)
  nativeHandlers?.onEnd?.()
  nativeCleanup()
}

async function startNative(lang: VoiceLang, base: string, h: VoiceHandlers): Promise<void> {
  nativeBase = base.replace(/\s+$/, '')
  nativeAcc = ''
  nativePartial = ''
  nativeHandlers = h
  nativeSettled = false

  const modelName = MODEL_BY_LANG[lang]
  dbg('步骤1: 开始加载模型 ' + modelName)

  try {
    const loadRes = await VoskSpeech.loadModel({ name: modelName })
    dbg('步骤2: 模型加载完成 cached=' + !!loadRes.cached)
  } catch (e: any) {
    const msg = e?.message || '语音模型加载失败'
    dbg('步骤2失败: ' + msg)
    nativeFinish(msg)
    return
  }

  dbg('步骤3: 注册结果监听器')
  try {
    nativeListeners.push(
      await VoskSpeech.addListener('partialResult', (e) => {
        if (nativeSettled) return
        nativePartial = e?.matches || ''
        nativeEmitPartial()
      }),
    )
    nativeListeners.push(
      await VoskSpeech.addListener('onResult', (e) => {
        if (nativeSettled) return
        const seg = (e?.result || '').trim()
        if (seg) {
          nativeAcc = (nativeAcc + nativeSep() + seg).trim()
          nativePartial = ''
          nativeEmitPartial()
        }
      }),
    )
    nativeListeners.push(
      await VoskSpeech.addListener('onFinalResult', (e) => {
        if (nativeSettled) return
        const seg = (e?.final || '').trim()
        if (seg) nativeAcc = (nativeAcc + nativeSep() + seg).trim()
        if (!seg && nativePartial) nativeAcc = (nativeAcc + nativeSep() + nativePartial).trim()
        nativePartial = ''
        const out = (nativeBase + (nativeBase && nativeAcc ? ' ' : '') + nativeAcc).trim()
        nativeFinish(undefined, out)
      }),
    )
    nativeListeners.push(
      await VoskSpeech.addListener('onError', (e) => {
        nativeFinish(e?.message || '语音识别失败')
      }),
    )
    dbg('步骤3完成: 4 个监听器已注册')
  } catch (e: any) {
    const msg = e?.message || '监听注册失败'
    dbg('步骤3失败: ' + msg)
    nativeFinish(msg)
    return
  }

  dbg('步骤4: 请求麦克风权限')
  try {
    const perm = await VoskSpeech.requestPermissions()
    dbg('步骤4结果: speechRecognition=' + perm.speechRecognition)
    if (perm.speechRecognition !== 'granted') {
      nativeFinish('麦克风未授权，请在系统设置中允许后重试')
      return
    }
  } catch (e: any) {
    const msg = e?.message || '麦克风权限请求失败'
    dbg('步骤4失败: ' + msg)
    nativeFinish(msg)
    return
  }

  dbg('步骤5: 调用 startListening')
  try {
    h.onStart?.()
    await VoskSpeech.startListening()
    listening = true
    dbg('步骤6: 识别已启动，等待说话')
  } catch (e: any) {
    const msg = e?.message || '启动语音识别失败'
    dbg('步骤5失败: ' + msg)
    nativeFinish(msg)
  }
}

function stopMediaTracks() {
  try {
    mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop()
  } catch {
    /* ignore */
  }
  mediaRecorder = null
  mediaStream?.getTracks().forEach((t) => t.stop())
  mediaStream = null
}

function webForceReset(): void {
  try {
    webRec?.abort()
  } catch {
    /* ignore */
  }
  webRec = null
  stopMediaTracks()
  mediaChunks = []
  webHandlers = null
  webAcc = ''
  webBase = ''
  webSettled = false
  webSpeechDead = false
  listening = false
}

function webFinish(err?: string, text?: string) {
  if (webSettled) return
  webSettled = true
  listening = false
  const h = webHandlers
  webRec = null
  stopMediaTracks()
  webHandlers = null
  if (err) h?.onError?.(err)
  else if (text != null) h?.onFinal?.(text)
  h?.onEnd?.()
}

async function ensureWhisper(): Promise<WhisperPipe> {
  if (whisperPipe) return whisperPipe
  if (whisperLoading) return whisperLoading
  whisperLoading = (async () => {
    dbg('Whisper: 加载本地模型（首次需下载，请稍候）')
    const mod = await import('@xenova/transformers')
    // 国内镜像，避免 huggingface.co 直连失败
    mod.env.allowLocalModels = false
    mod.env.useBrowserCache = true
    try {
      ;(mod.env as { remoteHost?: string }).remoteHost = 'https://hf-mirror.com/'
    } catch {
      /* ignore */
    }
    const pipe = (await mod.pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny',
      { quantized: true },
    )) as unknown as WhisperPipe
    whisperPipe = pipe
    dbg('Whisper: 模型就绪')
    return pipe
  })()
  try {
    return await whisperLoading
  } catch (e) {
    whisperLoading = null
    throw e
  }
}

async function blobToFloat32(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer()
  const ctx = new AudioContext({ sampleRate: 16000 })
  try {
    const decoded = await ctx.decodeAudioData(buf.slice(0))
    const ch0 = decoded.getChannelData(0)
    if (decoded.numberOfChannels === 1) return ch0
    // 简易混音
    const out = new Float32Array(decoded.length)
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      const data = decoded.getChannelData(c)
      for (let i = 0; i < data.length; i++) out[i]! += data[i]! / decoded.numberOfChannels
    }
    return out
  } finally {
    await ctx.close().catch(() => {})
  }
}

async function transcribeWithWhisper(blob: Blob, lang: VoiceLang): Promise<string> {
  if (blob.size < 800) return ''
  const pipe = await ensureWhisper()
  const audio = await blobToFloat32(blob)
  dbg('Whisper: 开始识别 audioSamples=' + audio.length)
  const result = await pipe(audio, {
    language: lang === 'zh-CN' ? 'chinese' : 'english',
    task: 'transcribe',
  })
  return (result?.text || '').trim()
}

function collectMediaBlob(): Promise<Blob> {
  return new Promise((resolve) => {
    const rec = mediaRecorder
    if (!rec || rec.state === 'inactive') {
      resolve(new Blob(mediaChunks, { type: 'audio/webm' }))
      return
    }
    rec.onstop = () => {
      resolve(new Blob(mediaChunks, { type: rec.mimeType || 'audio/webm' }))
    }
    try {
      rec.stop()
    } catch {
      resolve(new Blob(mediaChunks, { type: 'audio/webm' }))
    }
  })
}

async function startMediaCapture(): Promise<boolean> {
  try {
    mediaChunks = []
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
    mediaRecorder = mime ? new MediaRecorder(mediaStream, { mimeType: mime }) : new MediaRecorder(mediaStream)
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) mediaChunks.push(e.data)
    }
    mediaRecorder.start(250)
    dbg('MediaRecorder: 已开始备份录音')
    return true
  } catch (e: any) {
    dbg('MediaRecorder 启动失败: ' + (e?.message || ''))
    return false
  }
}

function startWebSpeech(lang: VoiceLang): void {
  const Ctor = webCtor()
  if (!Ctor) {
    webSpeechDead = true
    dbg('Web Speech: 不可用，仅用本地识别')
    return
  }

  const r = new Ctor()
  webRec = r
  r.lang = lang
  r.interimResults = true
  r.continuous = true
  r.maxAlternatives = 1
  const sep = () => (webAcc && !webAcc.endsWith(' ') ? ' ' : '')

  r.onstart = () => dbg('Web Speech: onstart')
  r.onresult = (e: any) => {
    if (webSettled || webSpeechDead) return
    let interim = ''
    let finalChunk = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0]?.transcript || ''
      if (e.results[i].isFinal) finalChunk += t
      else interim += t
    }
    if (finalChunk) webAcc = (webAcc + sep() + finalChunk).trim()
    const shown = (webAcc + (interim ? sep() + interim : '')).trim()
    webHandlers?.onPartial?.(shown)
  }
  r.onerror = (e: any) => {
    const code = e?.error || ''
    dbg('Web Speech: onerror ' + code)
    if (code === 'no-speech' || code === 'aborted') return
    if (code === 'network' || code === 'service-not-allowed') {
      // 国内常见：谷歌识别挂了，不中断会话，改走录音 + Whisper
      webSpeechDead = true
      try {
        r.abort()
      } catch {
        /* ignore */
      }
      webRec = null
      dbg('Web Speech: 在线识别不可用，继续录音，停止后用本地模型')
      webHandlers?.onDebug?.('提示: 浏览器在线语音不可用（国内常见），说完请点「停止」，将用本地识别')
      return
    }
    if (code === 'not-allowed') {
      webFinish('麦克风未授权，请允许后重试')
      return
    }
    if (code === 'audio-capture') {
      webFinish('找不到麦克风')
    }
  }
  r.onend = () => {
    if (webSettled || webSpeechDead || !listening) return
    try {
      r.start()
    } catch {
      webSpeechDead = true
    }
  }

  try {
    r.start()
    dbg('Web Speech: 已启动 lang=' + lang)
  } catch (e: any) {
    webSpeechDead = true
    webRec = null
    dbg('Web Speech start 失败: ' + (e?.message || ''))
  }
}

async function startWeb(lang: VoiceLang, base: string, h: VoiceHandlers): Promise<void> {
  webForceReset()
  listening = true
  webSettled = false
  webSpeechDead = false
  webHandlers = h
  webLang = lang
  webBase = base.replace(/\s+$/, '')
  webAcc = webBase

  const ok = await startMediaCapture()
  if (!ok) {
    webFinish('无法打开麦克风')
    return
  }

  h.onStart?.()
  startWebSpeech(lang)
  dbg('Web: 正在听，说完请点停止')
}

export async function startVoice(lang: VoiceLang, base: string, h: VoiceHandlers): Promise<void> {
  if (listening) {
    console.log('[voice] 检测到残留 listening=true，强制重置后重新启动')
    if (isNative()) nativeForceReset()
    else webForceReset()
  }

  nativeHandlers = isNative() ? h : null
  webHandlers = isNative() ? null : h
  dbg('步骤0: 点击语音按钮 platform=' + (isNative() ? 'native' : 'web') + ' lang=' + lang)

  const check = await voiceAvailable()
  if (!check.ok) {
    const msg = check.reason || '语音不可用'
    dbg('步骤0失败: ' + msg)
    h.onError?.(msg)
    listening = false
    return
  }

  if (isNative()) {
    listening = true
    dbg('步骤0完成: 进入 native 分支')
    await startNative(lang, base, h)
    return
  }

  await startWeb(lang, base, h)
}

export async function stopVoice(): Promise<void> {
  if (!listening && !webRec && !mediaRecorder) {
    dbg('stopVoice: 当前未在识别，直接返回')
    return
  }
  if (isNative()) {
    dbg('stopVoice: 主动停止，合并 partial 后交付')
    const a = nativeAcc.trim()
    const p = nativePartial.trim()
    let out = nativeBase
    if (out && !out.endsWith(' ')) out += ' '
    out += a
    if (a && p) out += ' '
    out += p
    out = out.trim()
    try {
      await VoskSpeech.stopListening()
    } catch (e: any) {
      dbg('stopVoice: stopListening 异常 ' + (e?.message || ''))
    }
    if (out) nativeFinish(undefined, out)
    else nativeFinish('未识别到内容，请再说一次')
    return
  }

  dbg('stopVoice: Web 停止，整理结果')
  listening = false
  try {
    webRec?.stop()
  } catch {
    try {
      webRec?.abort()
    } catch {
      /* ignore */
    }
  }
  webRec = null

  const speechText = webAcc.trim()
  const base = webBase.trim()
  const speechOnly = speechText && speechText !== base ? speechText : ''

  if (speechOnly) {
    dbg('stopVoice: 使用 Web Speech 结果')
    webFinish(undefined, speechOnly)
    return
  }

  // 无在线结果 → Whisper 本地识别
  try {
    webHandlers?.onDebug?.('正在本地识别，首次需下载模型…')
    const blob = await collectMediaBlob()
    stopMediaTracks()
    dbg('stopVoice: 录音大小=' + blob.size)
    const text = await transcribeWithWhisper(blob, webLang)
    const out = (base + (base && text ? ' ' : '') + text).trim()
    if (out) webFinish(undefined, out)
    else webFinish('未识别到内容，请靠近麦克风再说一次')
  } catch (e: any) {
    dbg('Whisper 失败: ' + (e?.message || ''))
    webFinish(
      '浏览器在线语音不可用，本地识别也失败。请用手机 App（离线可用），或检查网络后重试。' +
        (e?.message ? `（${e.message}）` : ''),
    )
  }
}

export async function forceStop(): Promise<void> {
  if (isNative()) {
    if (listening) {
      try {
        await VoskSpeech.stopListening()
      } catch {
        /* ignore */
      }
    }
    nativeForceReset()
    return
  }
  webForceReset()
}

export function isListening(): boolean {
  return listening
}

export function voiceLangLabel(lang: VoiceLang): string {
  return lang === 'zh-CN' ? '中文' : '英文'
}
