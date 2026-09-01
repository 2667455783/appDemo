let current: SpeechSynthesisUtterance | null = null

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopSpeak(): void {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
  current = null
}

export function speakEnglish(text: string, rate = 0.88): Promise<void> {
  if (!canSpeak()) return Promise.resolve()
  stopSpeak()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
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

export function isSpeaking(): boolean {
  return Boolean(current)
}
