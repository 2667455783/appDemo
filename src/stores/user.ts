import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getDomain, isDomainId } from '@/domains/registry'
import type { DomainId } from '@/domains/types'
import type { ExamLevel, ExamMemory, OfficialScore, TargetScore } from '@/types'
import { addDays, daysUntil, loadState, saveState, todayISO } from '@/utils/storage'

type UserState = {
  onboarded: boolean
  name: string
  birthday: string
  motto: string
  /** @deprecated 兼容旧数据；读写走 domainLevels + level computed */
  level: ExamLevel
  targetScore: TargetScore
  examDate: string
  streak: number
  lastStudyDate: string
  officialScore: OfficialScore | null
  examMemory: ExamMemory | null
  activeDomainId: DomainId
  /** 各学科当前等级 id（英语为 cet4/cet6） */
  domainLevels: Partial<Record<DomainId, string>>
}

const defaultDate = addDays(todayISO(), 46)

const defaults: UserState = {
  onboarded: false,
  name: '学习者',
  birthday: '',
  motto: '',
  level: 'cet4',
  targetScore: 425,
  examDate: defaultDate,
  streak: 0,
  lastStudyDate: '',
  officialScore: null,
  examMemory: null,
  activeDomainId: 'english',
  domainLevels: { english: 'cet4' },
}

function persist(state: UserState) {
  saveState('user', state)
}

function migrateUser(saved: UserState): UserState {
  const activeDomainId =
    saved.activeDomainId && isDomainId(saved.activeDomainId) ? saved.activeDomainId : 'english'
  const domainLevels: Partial<Record<DomainId, string>> = {
    english: saved.level || 'cet4',
    ...(saved.domainLevels || {}),
  }
  if (!domainLevels.english) domainLevels.english = saved.level || 'cet4'
  return {
    ...defaults,
    ...saved,
    activeDomainId,
    domainLevels,
    level: (domainLevels.english as ExamLevel) || saved.level || 'cet4',
  }
}

export const useUserStore = defineStore('user', () => {
  const saved = migrateUser(loadState<UserState>('user', defaults))
  const onboarded = ref(saved.onboarded)
  const name = ref(saved.name)
  const birthday = ref(saved.birthday)
  const motto = ref(saved.motto)
  const level = ref<ExamLevel>(saved.level)
  const targetScore = ref<TargetScore>(saved.targetScore)
  const examDate = ref(saved.examDate)
  const streak = ref(saved.streak)
  const lastStudyDate = ref(saved.lastStudyDate)
  const officialScore = ref<OfficialScore | null>(saved.officialScore)
  const examMemory = ref<ExamMemory | null>(saved.examMemory)
  const activeDomainId = ref<DomainId>(saved.activeDomainId)
  const domainLevels = ref<Partial<Record<DomainId, string>>>({ ...saved.domainLevels })

  const daysLeft = computed(() => daysUntil(examDate.value))
  const phase = computed<'normal' | 'sprint' | 'final'>(() => {
    const d = daysLeft.value
    if (d <= 3 && d >= 0) return 'final'
    if (d <= 14 && d >= 0) return 'sprint'
    return 'normal'
  })

  const activeDomain = computed(() => getDomain(activeDomainId.value))

  const activeLevelId = computed(() => {
    const id = domainLevels.value[activeDomainId.value]
    if (id) return id
    return activeDomain.value.levels[0]?.id ?? ''
  })

  const activeLevelLabel = computed(() => {
    const lv = activeDomain.value.levels.find((l) => l.id === activeLevelId.value)
    return lv?.label ?? activeDomain.value.name
  })

  function snapshot(): UserState {
    return {
      onboarded: onboarded.value,
      name: name.value,
      birthday: birthday.value,
      motto: motto.value,
      level: level.value,
      targetScore: targetScore.value,
      examDate: examDate.value,
      streak: streak.value,
      lastStudyDate: lastStudyDate.value,
      officialScore: officialScore.value,
      examMemory: examMemory.value,
      activeDomainId: activeDomainId.value,
      domainLevels: { ...domainLevels.value },
    }
  }

  function flush() {
    persist(snapshot())
  }

  function setActiveDomain(id: DomainId) {
    if (!isDomainId(id)) return
    const domain = getDomain(id)
    if (!domain.enabled) return
    activeDomainId.value = id
    if (!domainLevels.value[id]) {
      domainLevels.value = {
        ...domainLevels.value,
        [id]: domain.levels[0]?.id ?? '',
      }
    }
    flush()
  }

  function setDomainLevel(domainId: DomainId, levelId: string) {
    domainLevels.value = { ...domainLevels.value, [domainId]: levelId }
    if (domainId === 'english' && (levelId === 'cet4' || levelId === 'cet6')) {
      level.value = levelId
    }
    flush()
  }

  function completeOnboarding(payload: {
    name: string
    level: ExamLevel
    targetScore: TargetScore
    examDate: string
    domainId?: DomainId
  }) {
    name.value = payload.name.trim() || '学习者'
    level.value = payload.level
    targetScore.value = payload.targetScore
    examDate.value = payload.examDate
    activeDomainId.value = payload.domainId && isDomainId(payload.domainId) ? payload.domainId : 'english'
    domainLevels.value = {
      ...domainLevels.value,
      english: payload.level,
    }
    onboarded.value = true
    flush()
  }

  function updateProfile(
    payload: Partial<Pick<UserState, 'name' | 'birthday' | 'motto' | 'level' | 'targetScore' | 'examDate'>>,
  ) {
    if (payload.name !== undefined) name.value = payload.name.trim() || '学习者'
    if (payload.birthday !== undefined) birthday.value = payload.birthday
    if (payload.motto !== undefined) motto.value = payload.motto
    if (payload.level) {
      level.value = payload.level
      domainLevels.value = { ...domainLevels.value, english: payload.level }
    }
    if (payload.targetScore) targetScore.value = payload.targetScore
    if (payload.examDate) examDate.value = payload.examDate
    flush()
  }

  function markStudy() {
    const today = todayISO()
    if (lastStudyDate.value === today) {
      flush()
      return
    }
    const yesterday = addDays(today, -1)
    streak.value = lastStudyDate.value === yesterday ? streak.value + 1 : 1
    lastStudyDate.value = today
    flush()
  }

  function saveMemory(memory: ExamMemory) {
    examMemory.value = memory
    flush()
  }

  function saveOfficial(score: OfficialScore) {
    officialScore.value = score
    flush()
  }

  function resetAll() {
    localStorage.clear()
    onboarded.value = false
    name.value = defaults.name
    birthday.value = defaults.birthday
    motto.value = defaults.motto
    level.value = defaults.level
    targetScore.value = defaults.targetScore
    examDate.value = addDays(todayISO(), 46)
    streak.value = 0
    lastStudyDate.value = ''
    officialScore.value = null
    examMemory.value = null
    activeDomainId.value = defaults.activeDomainId
    domainLevels.value = { ...defaults.domainLevels }
    flush()
  }

  return {
    onboarded,
    name,
    birthday,
    motto,
    level,
    targetScore,
    examDate,
    streak,
    lastStudyDate,
    officialScore,
    examMemory,
    activeDomainId,
    domainLevels,
    activeDomain,
    activeLevelId,
    activeLevelLabel,
    daysLeft,
    phase,
    setActiveDomain,
    setDomainLevel,
    completeOnboarding,
    updateProfile,
    markStudy,
    saveMemory,
    saveOfficial,
    resetAll,
  }
})
