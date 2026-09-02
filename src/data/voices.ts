export type VoiceGender = 'female' | 'male'
export type VoiceEngine = 'youdao' | 'baidu' | 'system'
export type VoiceAccent = 'us' | 'uk'

export type VoiceId = 'youdao-us' | 'youdao-uk' | 'baidu-en' | 'system'

export type VoicePreset = {
  id: VoiceId
  name: string
  hint: string
  engine: VoiceEngine
  accent: VoiceAccent
  locale: string
  gender: VoiceGender
  pitch: number
  sample: string
  tags: string[]
  /** 有道 dictvoice type：0 美音，1 英音（2 与 0 同为美音） */
  youdaoType: 0 | 1
  preferredNames: string[]
}

export const DEFAULT_VOICE_ID: VoiceId = 'youdao-us'

const LEGACY_VOICE_ID: Record<string, VoiceId> = {
  'us-female': 'youdao-us',
  'us-male': 'youdao-us',
  'uk-female': 'youdao-uk',
  'uk-male': 'youdao-uk',
  'au-female': 'youdao-us',
  'baidu-us': 'baidu-en',
  'baidu-uk': 'baidu-en',
}

const US_NAMES = ['google us english', 'microsoft zira', 'samantha']
const UK_NAMES = ['google uk english female', 'microsoft hazel', 'kate']

const YOUDAO_SAMPLE = 'Tomato. Schedule. Water. Path.'

function youdaoPreset(id: VoiceId, name: string, hint: string, accent: VoiceAccent): VoicePreset {
  const uk = accent === 'uk'
  return {
    id,
    name,
    hint,
    engine: 'youdao',
    accent,
    locale: uk ? 'en-GB' : 'en-US',
    gender: 'female',
    pitch: 1,
    sample: YOUDAO_SAMPLE,
    tags: ['有道', uk ? '英式' : '美式'],
    youdaoType: uk ? 1 : 0,
    preferredNames: uk ? UK_NAMES : US_NAMES,
  }
}

/** 有道可分美英；百度免费接口英语只有一种听感 */
export const VOICE_PRESETS: VoicePreset[] = [
  youdaoPreset('youdao-us', '有道美式', '适合背单词', 'us'),
  youdaoPreset('youdao-uk', '有道英式', '适合适应听力口音', 'uk'),
  {
    id: 'baidu-en',
    name: '百度英语',
    hint: '适合日常交流',
    engine: 'baidu',
    accent: 'us',
    locale: 'en-US',
    gender: 'female',
    pitch: 1,
    sample: 'Practice makes perfect. This is your study voice.',
    tags: ['百度', '英语'],
    youdaoType: 0,
    preferredNames: US_NAMES,
  },
  {
    id: 'system',
    name: '系统音色',
    hint: '选中后立刻用本机默认语音试听',
    engine: 'system',
    accent: 'us',
    locale: 'en-US',
    gender: 'female',
    pitch: 1,
    sample: 'Practice makes perfect. This is your study voice.',
    tags: ['系统', '本机默认'],
    youdaoType: 0,
    preferredNames: [],
  },
]

export const VOICE_GROUPS: { title: string; engine: VoiceEngine }[] = [
  { title: '有道词典', engine: 'youdao' },
  { title: '百度翻译', engine: 'baidu' },
  { title: '本机', engine: 'system' },
]

export function normalizeVoiceId(id: string | undefined): VoiceId {
  if (id && LEGACY_VOICE_ID[id]) return LEGACY_VOICE_ID[id]!
  if (VOICE_PRESETS.some((v) => v.id === id)) return id as VoiceId
  return DEFAULT_VOICE_ID
}

export function isVoiceId(id: string | undefined): id is VoiceId {
  if (!id) return false
  return VOICE_PRESETS.some((v) => v.id === id) || id in LEGACY_VOICE_ID
}

export function getVoicePreset(id: string | undefined): VoicePreset {
  return VOICE_PRESETS.find((v) => v.id === normalizeVoiceId(id)) ?? VOICE_PRESETS[0]!
}

export function presetsByEngine(engine: VoiceEngine): VoicePreset[] {
  return VOICE_PRESETS.filter((v) => v.engine === engine)
}
