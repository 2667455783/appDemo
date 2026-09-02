import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_VOICE_ID,
  VOICE_PRESETS,
  getVoicePreset,
  normalizeVoiceId,
  type VoiceId,
} from '@/data/voices'
import { loadState, saveState } from '@/utils/storage'

type VoicePrefState = { id: VoiceId }

function readOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine
}

export const useVoicePrefStore = defineStore('voicePref', () => {
  const saved = loadState<VoicePrefState>('voicePref', { id: DEFAULT_VOICE_ID })
  const id = ref<VoiceId>(normalizeVoiceId(saved.id))
  const online = ref(readOnline())
  const current = computed(() => getVoicePreset(id.value))

  function syncOnline() {
    online.value = readOnline()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', syncOnline)
    window.addEventListener('offline', syncOnline)
  }

  function select(next: VoiceId) {
    id.value = normalizeVoiceId(next)
    saveState<VoicePrefState>('voicePref', { id: id.value })
  }

  return {
    id,
    online,
    effectiveId: id,
    current,
    presets: VOICE_PRESETS,
    select,
  }
})
