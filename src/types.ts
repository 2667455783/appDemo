/**
 * 跨学科共享类型 + 英语类型 re-export（兼容现有 import `@/types`）。
 * CET 专有定义在 `@/domains/english/types`。
 */
export type {
  ExamLevel,
  TargetScore,
  FreqTag,
  SkillType,
  ReadingKind,
  ErrorCause,
  VocabWord,
  VocabCardState,
  ChoiceQuestion,
  ListeningItem,
  ClozeItem,
  MatchItem,
  CarefulItem,
  WritingTopic,
  TemplateCategory,
  PhraseLine,
  TemplateSlot,
  ExpressTemplate,
  TransKind,
  TransItem,
  GrammarCard,
  MockSectionKind,
  MockPaper,
  MockAnswers,
  SectionScore,
  MockReport,
  ErrorItem,
  GapTask,
  ExamMemory,
  OfficialScore,
} from '@/domains/english/types'

export {
  ERROR_CAUSE_LABEL,
  LEVEL_LABEL,
  TEMPLATE_CATEGORY_LABEL,
  TRANS_KIND_LABEL,
  CAUSE_OPTIONS,
} from '@/domains/english/types'

/** 跨学科：雷达轴（各学科可自行填 label） */
export type RadarAxis = {
  key: string
  label: string
  value: number
}

/** 跨学科：今日任务 */
export type TodayTask = {
  id: string
  title: string
  desc: string
  minutes: number
  route: string
  done: boolean
}
