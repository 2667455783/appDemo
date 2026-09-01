let current: SpeechSynthesisUtterance | null = null

export type SpeakLang = 'en' | 'zh' | 'en-US' | 'zh-CN'

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopSpeak(): void {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
  current = null
}

function resolveSpeakLang(lang: SpeakLang): string {
  if (lang === 'zh' || lang === 'zh-CN') return 'zh-CN'
  return 'en-US'
}

/** 按语言朗读文本（翻译结果、单词等） */
export function speakText(text: string, lang: SpeakLang = 'en-US', rate = 0.88): Promise<void> {
  if (!canSpeak()) return Promise.resolve()
  const t = text.trim()
  if (!t) return Promise.resolve()
  stopSpeak()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(t)
    u.lang = resolveSpeakLang(lang)
    u.rate = rate
    u.onend = () => {
      current = null
      resolve()
    }
    u.onerror = () => {
      current = null
      resolve()
    }
    current = u
    window.speechSynthesis.speak(u)
  })
}

export function speakEnglish(text: string, rate = 0.88): Promise<void> {
  return speakText(text, 'en-US', rate)
}

export function isSpeaking(): boolean {
  return Boolean(current)
}
