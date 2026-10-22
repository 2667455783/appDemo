import type { TodayTask } from '@/types'

export type DomainId = 'english' | 'programming' | 'medical'

export type DomainLevel = {
  id: string
  label: string
}

export type DomainTab = {
  id: string
  label: string
  /** 相对路径，如 /vocab、/d/programming/learn */
  route: string
  icon: 'home' | 'vocab' | 'write' | 'learn' | 'practice' | 'me'
}

export type DomainShortcut = {
  label: string
  desc: string
  route: string
}

export type TodayTaskContext = {
  phase: 'normal' | 'sprint' | 'final'
  dueCount: number
  wrongCount: number
  doneIds: Set<string>
}

export type DomainManifest = {
  id: DomainId
  name: string
  /** 短标签，用于首页等 */
  shortName: string
  enabled: boolean
  /** false = 占位学科，无真实题库 */
  hasContent: boolean
  levels: DomainLevel[]
  /** 中间两个 Tab（首页、我的由壳层固定） */
  tabs: DomainTab[]
  homeShortcuts: DomainShortcut[]
  /** 首页副文案 */
  homePhaseText: (phase: TodayTaskContext['phase']) => string
  /** 提醒相关文案 */
  reminderHint: string
  buildTodayTasks: (ctx: TodayTaskContext) => TodayTask[]
}
