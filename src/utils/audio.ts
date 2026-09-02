import { Capacitor, registerPlugin } from '@capacitor/core'
import { VOICE_PRESETS, getVoicePreset, type VoiceGender, type VoicePreset } from '@/data/voices'
import { useVoicePrefStore } from '@/stores/voicePref'
import { markSystemSpeak, neuralGeneration, speakNeural, stopNeural } from '@/utils/neuralTts'
import { loadState } from '@/utils/storage'

let current: SpeechSynthesisUtterance | null = null
let keepAliveTimer: number | null = null

export type SpeakLang = 'en' | 'zh' | 'en-US' | 'zh-CN'

interface AppTtsPlugin {
  speak(options: {
    text: string
    lang?: string
    rate?: number
    gender?: VoiceGender
    pitch?: number
    useDefault?: boolean
  }): Promise<{ ok?: boolean }>
  stop(): Promise<{ ok?: boolean }>
}

const AppTts = registerPlugin<AppTtsPlugin>('AppTts')

function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function isAndroidWeb(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

function clearKeepAlive() {
  if (keepAliveTimer != null) {
    window.clearInterval(keepAliveTimer)
    keepAliveTimer = null
  }
}

function selectedPreset(): VoicePreset {
  try {
    return useVoicePrefStore().current
  } catch {
    const id = loadState<{ id: string }>('voicePref', { id: 'youdao-us' }).id
    return getVoicePreset(id)
  }
}

function resolveSpeakLang(lang: SpeakLang): string {
  if (lang === 'zh' || lang === 'zh-CN') return 'zh-CN'
  return selectedPreset().locale
}

export function canSpeak(): boolean {
  if (typeof window === 'undefined') return false
  if (isAndroidNative()) return true
  if (typeof Audio !== 'undefined') return true
  return 'speechSynthesis' in window
}

export async function stopSpeak(): Promise<void> {
  stopNeural()
  if (isAndroidNative()) {
    try {
      await AppTts.stop()
    } catch {
      /* ignore */
    }
    current = null
    return
  }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  clearKeepAlive()
  window.speechSynthesis.cancel()
  current = null
}

function waitVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([])
  const list = () => window.speechSynthesis.getVoices()
  const now = list()
  if (now.length) return Promise.resolve(now)
  return new Promise((resolve) => {
    const finish = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', finish)
      resolve(list())
    }
    window.speechSynthesis.addEventListener('voiceschanged', finish)
    window.setTimeout(finish, timeoutMs)
  })
}

function englishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith('en') || /english/i.test(v.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  preset: VoicePreset,
  lang: string,
): SpeechSynthesisVoice | null {
  if (preset.engine === 'system') return null
  if (lang.toLowerCase().startsWith('zh')) {
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith('zh')) ||
      voices.find((v) => /chinese|huihui|yaoyao|xiaoxiao|普通话/i.test(v.name)) ||
      null
    )
  }
  const en = englishVoices(voices)
  if (!en.length) return null
  for (const h of preset.preferredNames) {
    const hit = en.find((v) => v.name.toLowerCase().includes(h))
    if (hit) return hit
  }
  const idx = Math.max(0, VOICE_PRESETS.findIndex((p) => p.id === preset.id))
  return en[idx % en.length] ?? en[0] ?? null
}

function synthPitch(preset: VoicePreset): number {
  return preset.pitch
}

function synthRate(_preset: VoicePreset, base: number): number {
  return base
}

async function speakWeb(text: string, lang: string, rate: number, preset: VoicePreset): Promise<void> {
  if (!('speechSynthesis' in window)) return
  clearKeepAlive()
  window.speechSynthesis.cancel()
  await new Promise((r) => setTimeout(r, isAndroidWeb() ? 60 : 20))
  const voices = await waitVoices()
  await new Promise<void>((resolve) => {
    let settled = false
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = synthRate(preset, rate)
    u.pitch = synthPitch(preset)
    const voice = pickVoice(voices, preset, lang)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang || lang
    }
    markSystemSpeak(preset, voice?.name || '')
    const done = () => {
      if (settled) return
      settled = true
      clearKeepAlive()
      if (current === u) current = null
      resolve()
    }
    u.onend = done
    u.onerror = done
    current = u
    if (window.speechSynthesis.paused) window.speechSynthesis.resume()
    window.speechSynthesis.speak(u)
    if (isAndroidWeb()) {
      window.setTimeout(() => {
        if (!settled && window.speechSynthesis.paused) window.speechSynthesis.resume()
      }, 80)
      keepAliveTimer = window.setInterval(() => {
        if (settled || !window.speechSynthesis.speaking) {
          clearKeepAlive()
          return
        }
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }, 8000)
    }
    const estimate = Math.min(60_000, Math.max(2_500, Math.round((text.length * 180) / Math.max(rate, 0.3))))
    window.setTimeout(() => {
      if (!settled && !window.speechSynthesis.speaking) done()
    }, estimate)
  })
}

export type SpeakOpts = { engineOnly?: boolean }

/** 按语言朗读文本（翻译结果、单词等）。语色以「语色管理」当前选择为准。 */
export async function speakText(
  text: string,
  lang: SpeakLang = 'en-US',
  rate = 0.88,
  opts?: SpeakOpts,
): Promise<void> {
  if (!canSpeak()) return
  const t = text.trim()
  if (!t) return
  const preset = selectedPreset()
  const resolved = resolveSpeakLang(lang)
  const gender = preset.gender
  const pitch = preset.pitch

  await stopSpeak()
  const gen = neuralGeneration()
  const system = preset.engine === 'system'

  if (!system) {
    const neuralOk = await speakNeural(t, preset, resolved, rate, opts)
    if (gen !== neuralGeneration()) return
    if (neuralOk) return
    if (opts?.engineOnly) return
  }

  if (isAndroidNative()) {
    const timeoutMs = Math.min(60_000, Math.max(8_000, t.length * 250))
    try {
      await Promise.race([
        AppTts.speak({
          text: t,
          lang: resolved,
          rate,
          gender: system ? undefined : gender,
          pitch: system ? 1 : pitch,
          useDefault: system,
        }),
        new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
      ])
    } catch {
      /* ignore */
    }
    if (system) markSystemSpeak(preset, '本机默认')
    else markSystemSpeak(preset, '在线发音失败，已用系统语音')
    return
  }

  await speakWeb(t, resolved, rate, preset)
}

export function speakEnglish(text: string, rate = 0.88, opts?: SpeakOpts): Promise<void> {
  return speakText(text, 'en-US', rate, opts)
}

export function isSpeaking(): boolean {
  return Boolean(current)
}

export function warmupWebVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.getVoices()
}
