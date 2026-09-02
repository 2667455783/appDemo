import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ExamLevel, ExamMemory, OfficialScore, TargetScore } from '@/types'
import { addDays, daysUntil, loadState, saveState, todayISO } from '@/utils/storage'

type UserState = {
  onboarded: boolean
  name: string
  birthday: string
  motto: string
  level: ExamLevel
  targetScore: TargetScore
  examDate: string
  streak: number
  lastStudyDate: string
  officialScore: OfficialScore | null
  examMemory: ExamMemory | null
}

const defaultDate = addDays(todayISO(), 46)

const defaults: UserState = {
  onboarded: false,
  name: '考生',
  birthday: '',
  motto: '',
  level: 'cet4',
  targetScore: 425,
  examDate: defaultDate,
  streak: 0,
  lastStudyDate: '',
  officialScore: null,
  examMemory: null,
}

function persist(state: UserState) {
  saveState('user', state)
}

export const useUserStore = defineStore('user', () => {
  const saved = loadState<UserState>('user', defaults)
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

  const daysLeft = computed(() => daysUntil(examDate.value))
  const phase = computed<'normal' | 'sprint' | 'final'>(() => {
    const d = daysLeft.value
    if (d <= 3 && d >= 0) return 'final'
    if (d <= 14 && d >= 0) return 'sprint'
    return 'normal'
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
    }
  }

  function flush() {
    persist(snapshot())
  }

  function completeOnboarding(payload: {
    name: string
    level: ExamLevel
    targetScore: TargetScore
    examDate: string
  }) {
    name.value = payload.name.trim() || '考生'
    level.value = payload.level
    targetScore.value = payload.targetScore
    examDate.value = payload.examDate
    onboarded.value = true
    flush()
  }

  function updateProfile(
    payload: Partial<Pick<UserState, 'name' | 'birthday' | 'motto' | 'level' | 'targetScore' | 'examDate'>>,
  ) {
    if (payload.name !== undefined) name.value = payload.name.trim() || '考生'
    if (payload.birthday !== undefined) birthday.value = payload.birthday
    if (payload.motto !== undefined) motto.value = payload.motto
    if (payload.level) level.value = payload.level
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
    daysLeft,
    phase,
    completeOnboarding,
    updateProfile,
    markStudy,
    saveMemory,
    saveOfficial,
    resetAll,
  }
})
