export type ExamLevel = 'cet4' | 'cet6'

export type TargetScore = 425 | 550 | 600

export type FreqTag = 'must' | 'high' | 'extra'

export type SkillType = 'vocab' | 'listening' | 'reading' | 'writing' | 'translation'

export type ReadingKind = 'cloze' | 'match' | 'careful'

export type ErrorCause =
  | 'vocab'
  | 'locate'
  | 'listen'
  | 'time'
  | 'careless'
  | 'logic'
  | 'template'

export const ERROR_CAUSE_LABEL: Record<ErrorCause, string> = {
  vocab: '词汇不识',
  locate: '定位失败',
  listen: '听不清',
  time: '时间不够',
  careless: '粗心',
  logic: '逻辑干扰',
  template: '表达模板不足',
}

export const LEVEL_LABEL: Record<ExamLevel, string> = {
  cet4: '英语四级',
  cet6: '英语六级',
}

export type VocabWord = {
  id: string
  word: string
  phonetic: string
  pos: string
  meaning: string
  example: string
  exampleCn: string
  level: ExamLevel | 'both'
  freq: FreqTag
  root?: string
  collocation?: string
}

export type VocabCardState = {
  ease: number
  interval: number
  due: string
  correct: number
  wrong: number
  status: 'new' | 'learning' | 'review'
}

export type ChoiceQuestion = {
  id: string
  stem: string
  options: string[]
  answer: number
  analysis: string
  cause: ErrorCause
}

export type ListeningItem = {
  id: string
  title: string
  kind: 'news' | 'conversation' | 'lecture'
  level: ExamLevel
  preReadSec: number
  audioText: string
  sentences: string[]
  blanks: { sentenceIndex: number; answer: string }[]
  questions: ChoiceQuestion[]
}

export type ClozeItem = {
  id: string
  title: string
  level: ExamLevel
  passage: string
  blanks: number
  bank: string[]
  answers: string[]
  analysis: string[]
}

export type MatchItem = {
  id: string
  title: string
  level: ExamLevel
  paragraphs: { key: string; text: string }[]
  statements: { id: string; text: string; answer: string; analysis: string }[]
}

export type CarefulItem = {
  id: string
  title: string
  level: ExamLevel
  passage: string
  questions: ChoiceQuestion[]
}

export type WritingTopic = {
  id: string
  level: ExamLevel
  title: string
  prompt: string
  minutes: number
  scaffold: { label: string; hint: string }[]
  sample: string
  rubric: string[]
  /** 对应题型「模板管理」中的作文模板 id */
  templateId?: string
}

/** 题型 · 模板管理 */
export type TemplateCategory = 'writing' | 'phrases'

export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategory, string> = {
  writing: '作文模板',
  phrases: '必背短句',
}

export type PhraseLine = {
  no: number
  en: string
  zh: string
}

/** 范文提炼模板时的填空槽 */
export type TemplateSlot = {
  key: string
  label: string
  hint: string
}

export type ExpressTemplate = {
  id: string
  category: TemplateCategory
  /** 如：对立观点 / 开头引入 */
  tag: string
  title: string
  summary: string
  /** 作文模板：带占位符的骨架句 */
  paragraphs: string[]
  /** 段落角色，与 paragraphs 一一对应，如 开头 / 论点 / 结尾 */
  roles?: string[]
  /** 套模板练习时的填空项 */
  slots?: TemplateSlot[]
  /** 原创范文全文（非真题） */
  sampleEssay?: string
  /** 必背短句：英汉对照 */
  phrases?: PhraseLine[]
}

export type TransKind = 'zh2en' | 'underline' | 'paragraph'

export const TRANS_KIND_LABEL: Record<TransKind, string> = {
  zh2en: '汉译英',
  underline: '划线句',
  paragraph: '整段翻译',
}

export type TransItem = {
  id: string
  level: ExamLevel
  /** 缺省按汉译英（兼容旧题） */
  kind?: TransKind
  title?: string
  source: string
  sample: string
  /** 划线句：仅译这些句子 */
  sentences?: { no: number; en: string; cn: string }[]
  chunks: { cn: string; en: string }[]
  culture: { term: string; en: string }[]
  tips: string[]
}

export type GrammarCard = {
  id: string
  title: string
  point: string
  example: string
  question: ChoiceQuestion
}

export type MockSectionKind = 'writing' | 'listening' | 'reading' | 'translation'

export type MockPaper = {
  id: string
  level: ExamLevel
  title: string
  year: string
  writing: WritingTopic
  listening: ListeningItem
  cloze: ClozeItem
  careful: CarefulItem
  translation: TransItem
}

export type MockAnswers = {
  writing: string
  writingChecks: boolean[]
  listening: (number | null)[]
  cloze: (string | null)[]
  careful: (number | null)[]
  translation: string
}

export type SectionScore = {
  key: string
  label: string
  score: number
  max: number
  detail: string
}

export type MockReport = {
  id: string
  paperId: string
  paperTitle: string
  level: ExamLevel
  createdAt: string
  total: number
  sections: SectionScore[]
  typeBreakdown: { label: string; rate: number }[]
  nextActions: string[]
  weakCauses: ErrorCause[]
}

export type ErrorItem = {
  id: string
  source: 'mock' | 'practice'
  paperId?: string
  skill: SkillType
  subtype?: string
  question: string
  userAnswer: string
  correctAnswer: string
  analysis: string
  cause: ErrorCause
  createdAt: string
  wrongCount: number
  rightStreak: number
  status: 'open' | 'cleared'
}

export type GapTask = {
  id: string
  dayOffset: number
  title: string
  desc: string
  minutes: number
  skill: SkillType
  route: string
  done: boolean
}

export type RadarAxis = {
  key: string
  label: string
  value: number
}

export type ExamMemory = {
  submitted: boolean
  submittedAt: string
  hardParts: string[]
  writingPrompt: string
  transTopic: string
  estimated: number
}

export type OfficialScore = {
  listening: number
  reading: number
  writingTrans: number
  total: number
  date: string
}

export type TodayTask = {
  id: string
  title: string
  desc: string
  minutes: number
  route: string
  done: boolean
}

export const CAUSE_OPTIONS: { value: ErrorCause; label: string }[] = [
  { value: 'vocab', label: '词汇不识' },
  { value: 'locate', label: '定位失败' },
  { value: 'listen', label: '听不清' },
  { value: 'time', label: '时间不够' },
  { value: 'careless', label: '粗心' },
  { value: 'logic', label: '逻辑干扰' },
  { value: 'template', label: '表达模板不足' },
]
