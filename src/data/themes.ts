export type ThemeId = 'forest' | 'ink' | 'dusk' | 'cinnabar' | 'teal' | 'amber' | 'custom'

export type ThemePreset = {
  id: Exclude<ThemeId, 'custom'>
  name: string
  hex: string
}

export const DEFAULT_THEME_HEX = '#1f4d3a'

export type AppearancePref = 'light' | 'dark' | 'system'
export type Appearance = 'light' | 'dark'

export const APPEARANCE_OPTIONS: { id: AppearancePref; name: string; hint: string }[] = [
  { id: 'system', name: '跟随系统', hint: '随手机或电脑的浅色 / 深色设置变化' },
  { id: 'light', name: '白天', hint: '浅色纸面，适合日间阅读' },
  { id: 'dark', name: '夜间', hint: '深色背景，减少刺眼' },
]

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveAppearance(pref: AppearancePref, systemDark = systemPrefersDark()): Appearance {
  if (pref === 'system') return systemDark ? 'dark' : 'light'
  return pref
}

export function parseAppearance(v: unknown): AppearancePref {
  if (v === 'dark' || v === 'system' || v === 'light') return v
  return 'light'
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'forest', name: '松林绿', hex: '#1f4d3a' },
  { id: 'ink', name: '墨蓝', hex: '#1e3a5f' },
  { id: 'dusk', name: '绛紫', hex: '#4a3060' },
  { id: 'cinnabar', name: '朱红', hex: '#8b3a3a' },
  { id: 'teal', name: '青茶', hex: '#2f6a5a' },
  { id: 'amber', name: '琥珀', hex: '#7a5420' },
]

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m?.[1]) return null
  const n = Number.parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(rgb: [number, number, number]) {
  return `#${rgb.map((x) => clamp(x).toString(16).padStart(2, '0')).join('')}`
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function normalizeHex(hex: string): string | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  return toHex(rgb)
}

export function presetByHex(hex: string): ThemePreset | undefined {
  const n = normalizeHex(hex)
  if (!n) return undefined
  return THEME_PRESETS.find((p) => p.hex.toLowerCase() === n.toLowerCase())
}

export function deriveThemeVars(hex: string) {
  const rgb = parseHex(hex) ?? parseHex(DEFAULT_THEME_HEX)!
  const paper: [number, number, number] = [255, 251, 244]
  const black: [number, number, number] = [12, 16, 14]
  const forest2 = mix(rgb, [255, 255, 255], 0.18)
  const moss = mix(rgb, paper, 0.86)
  const stage = mix(rgb, black, 0.42)
  return {
    forest: toHex(rgb),
    forest2: toHex(forest2),
    moss: toHex(moss),
    stage: toHex(stage),
    rgb: `${clamp(rgb[0])}, ${clamp(rgb[1])}, ${clamp(rgb[2])}`,
  }
}

const FOREST_EXACT = {
  forest: '#1f4d3a',
  forest2: '#2d6a52',
  moss: '#e4f0e8',
  stage: '#243028',
  rgb: '31, 77, 58',
}

const LIGHT_SURFACE = {
  paper: '#f3eee4',
  paper2: '#fffbf4',
  ink: '#1c1915',
  inkSoft: '#5c564c',
  muted: '#8a8378',
  line: '#e4d9c8',
  goldSoft: '#f3e6d0',
  coralSoft: '#f6e4df',
  track: '#ece7dc',
  onPrimary: '#f6f1e7',
}

const DARK_SURFACE = {
  paper: '#161512',
  paper2: '#1f1e1a',
  ink: '#f3eee4',
  inkSoft: '#c4beb4',
  muted: '#9a948a',
  line: '#3f3c36',
  goldSoft: '#3d3424',
  coralSoft: '#3c2a26',
  track: '#32302b',
  onPrimary: '#f6f1e7',
}

function applySurface(root: HTMLElement, s: typeof LIGHT_SURFACE) {
  root.style.setProperty('--paper', s.paper)
  root.style.setProperty('--paper-2', s.paper2)
  root.style.setProperty('--ink', s.ink)
  root.style.setProperty('--ink-soft', s.inkSoft)
  root.style.setProperty('--muted', s.muted)
  root.style.setProperty('--line', s.line)
  root.style.setProperty('--gold-soft', s.goldSoft)
  root.style.setProperty('--coral-soft', s.coralSoft)
  root.style.setProperty('--track', s.track)
  root.style.setProperty('--on-primary', s.onPrimary)
}

export function applyThemeToDocument(hex: string, appearance: Appearance = 'light') {
  const root = document.documentElement
  const n = normalizeHex(hex) ?? DEFAULT_THEME_HEX
  const vars =
    appearance === 'light' && n.toLowerCase() === DEFAULT_THEME_HEX ? FOREST_EXACT : deriveThemeVars(n)
  root.style.setProperty('--forest', vars.forest)
  root.style.setProperty('--forest-2', vars.forest2)
  root.style.setProperty('--forest-rgb', vars.rgb)
  root.style.setProperty('--stage', vars.stage)

  if (appearance === 'dark') {
    applySurface(root, DARK_SURFACE)
    const rgb = parseHex(n) ?? parseHex(DEFAULT_THEME_HEX)!
    const paper = parseHex(DARK_SURFACE.paper)!
    root.style.setProperty('--moss', toHex(mix(rgb, paper, 0.78)))
  } else {
    applySurface(root, LIGHT_SURFACE)
    root.style.setProperty('--moss', vars.moss)
  }

  root.dataset.appearance = appearance
  root.style.colorScheme = appearance
}
