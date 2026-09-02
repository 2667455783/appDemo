import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  APPEARANCE_OPTIONS,
  DEFAULT_THEME_HEX,
  THEME_PRESETS,
  applyThemeToDocument,
  normalizeHex,
  parseAppearance,
  presetByHex,
  resolveAppearance,
  systemPrefersDark,
  type Appearance,
  type AppearancePref,
  type ThemeId,
} from '@/data/themes'
import { loadState, saveState } from '@/utils/storage'

type ThemeState = { id: ThemeId; hex: string; appearance: AppearancePref }

function readSaved(): ThemeState {
  const saved = loadState<ThemeState>('theme', { id: 'forest', hex: DEFAULT_THEME_HEX, appearance: 'light' })
  const hex = normalizeHex(saved.hex) ?? DEFAULT_THEME_HEX
  const preset = presetByHex(hex)
  return { id: preset?.id ?? 'custom', hex, appearance: parseAppearance(saved.appearance) }
}

export const useThemeStore = defineStore('theme', () => {
  const saved = readSaved()
  const id = ref<ThemeId>(saved.id)
  const hex = ref(saved.hex)
  const appearance = ref<AppearancePref>(saved.appearance)
  const systemDark = ref(systemPrefersDark())

  const current = computed(() => {
    const p = presetByHex(hex.value)
    return p ?? { id: 'custom' as const, name: '自定义', hex: hex.value }
  })

  const resolvedAppearance = computed<Appearance>(() => resolveAppearance(appearance.value, systemDark.value))

  const appearanceLabel = computed(
    () => APPEARANCE_OPTIONS.find((o) => o.id === appearance.value)?.name ?? '白天',
  )

  const resolvedAppearanceLabel = computed(() => (resolvedAppearance.value === 'dark' ? '夜间' : '白天'))

  function persist() {
    saveState<ThemeState>('theme', { id: id.value, hex: hex.value, appearance: appearance.value })
  }

  function paint() {
    applyThemeToDocument(hex.value, resolvedAppearance.value)
  }

  function apply(nextHex: string, nextId: ThemeId) {
    const n = normalizeHex(nextHex)
    if (!n) return
    hex.value = n
    id.value = nextId
    persist()
    paint()
  }

  function selectPreset(presetId: Exclude<ThemeId, 'custom'>) {
    const p = THEME_PRESETS.find((t) => t.id === presetId)
    if (!p) return
    apply(p.hex, p.id)
  }

  function selectCustom(nextHex: string) {
    const n = normalizeHex(nextHex)
    if (!n) return
    const p = presetByHex(n)
    apply(n, p?.id ?? 'custom')
  }

  function setAppearance(next: AppearancePref) {
    appearance.value = next
    persist()
    paint()
  }

  function bindSystemListener() {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      systemDark.value = mq.matches
      if (appearance.value === 'system') paint()
    }
    systemDark.value = mq.matches
    mq.addEventListener('change', sync)
  }

  bindSystemListener()
  paint()

  return {
    id,
    hex,
    appearance,
    appearanceLabel,
    resolvedAppearance,
    resolvedAppearanceLabel,
    current,
    presets: THEME_PRESETS,
    selectPreset,
    selectCustom,
    setAppearance,
  }
})
