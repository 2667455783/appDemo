import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { VOCAB_BANK } from '@/data/vocab'
import { getDomain } from '@/domains/registry'
import type { DomainId } from '@/domains/types'
import { useUserStore } from '@/stores/user'
import type {
  ErrorCause,
  ErrorItem,
  ExamLevel,
  GapTask,
  MockReport,
  RadarAxis,
  SkillType,
  TodayTask,
  VocabCardState,
  VocabWord,
} from '@/types'
import { newCard, reviewCard } from '@/utils/srs'
import { loadState, saveState, todayISO, uid } from '@/utils/storage'

type StudyState = {
  vocab: Record<string, VocabCardState>
  errors: ErrorItem[]
  reports: MockReport[]
  gapPlan: GapTask[]
  gapGeneratedAt: string
  doneTaskIds: string[]
  doneTaskDate: string
  radarBoost: Record<string, number>
}

const empty: StudyState = {
  vocab: {},
  errors: [],
  reports: [],
  gapPlan: [],
  gapGeneratedAt: '',
  doneTaskIds: [],
  doneTaskDate: '',
  radarBoost: {},
}

function storageKey(domainId: DomainId) {
  return `study:${domainId}`
}

/** 将旧版全局 study 迁移到 study:english，只做一次 */
function migrateLegacyEnglish() {
  try {
    const prefix = 'zhijuan:'
    const nextKey = prefix + storageKey('english')
    if (localStorage.getItem(nextKey)) return
    const legacy = localStorage.getItem(prefix + 'study')
    if (!legacy) return
    localStorage.setItem(nextKey, legacy)
  } catch {
    /* ignore */
  }
}

function loadDomainStudy(domainId: DomainId): StudyState {
  if (domainId === 'english') migrateLegacyEnglish()
  const saved = loadState<StudyState>(storageKey(domainId), empty)
  const today = todayISO()
  return {
    ...empty,
    ...saved,
    doneTaskIds: saved.doneTaskDate === today ? saved.doneTaskIds : [],
    doneTaskDate: saved.doneTaskDate === today ? saved.doneTaskDate : today,
  }
}

function wordVisible(word: VocabWord, level: ExamLevel): boolean {
  return word.level === 'both' || word.level === level
}

export const useStudyStore = defineStore('study', () => {
  const userStore = useUserStore()
  let boundDomain = userStore.activeDomainId

  const initial = loadDomainStudy(boundDomain)
  const vocab = ref<Record<string, VocabCardState>>(initial.vocab)
  const errors = ref<ErrorItem[]>(initial.errors)
  const reports = ref<MockReport[]>(initial.reports)
  const gapPlan = ref<GapTask[]>(initial.gapPlan)
  const gapGeneratedAt = ref(initial.gapGeneratedAt)
  const doneTaskIds = ref<string[]>(initial.doneTaskIds)
  const doneTaskDate = ref(initial.doneTaskDate)
  const radarBoost = ref<Record<string, number>>(initial.radarBoost)

  function snapshot(): StudyState {
    return {
      vocab: vocab.value,
      errors: errors.value,
      reports: reports.value,
      gapPlan: gapPlan.value,
      gapGeneratedAt: gapGeneratedAt.value,
      doneTaskIds: doneTaskIds.value,
      doneTaskDate: doneTaskDate.value,
      radarBoost: radarBoost.value,
    }
  }

  function flush() {
    saveState(storageKey(boundDomain), snapshot())
  }

  function applyState(s: StudyState) {
    vocab.value = s.vocab
    errors.value = s.errors
    reports.value = s.reports
    gapPlan.value = s.gapPlan
    gapGeneratedAt.value = s.gapGeneratedAt
    doneTaskIds.value = s.doneTaskIds
    doneTaskDate.value = s.doneTaskDate
    radarBoost.value = s.radarBoost
  }

  function switchDomain(next: DomainId) {
    if (next === boundDomain) return
    flush()
    boundDomain = next
    applyState(loadDomainStudy(next))
  }

  watch(
    () => userStore.activeDomainId,
    (id) => switchDomain(id),
  )

  const user = () => userStore

  const visibleWords = computed(() => {
    if (boundDomain !== 'english') return [] as VocabWord[]
    return VOCAB_BANK.filter((w) => wordVisible(w, user().level))
  })

  const dueWordIds = computed(() => {
    const today = todayISO()
    const fromCards = Object.entries(vocab.value)
      .filter(([, c]) => (c.due || '') <= today)
      .map(([id]) => id)
    if (fromCards.length) return fromCards
    return visibleWords.value.filter((w) => w.freq === 'must').map((w) => w.id)
  })

  const dueWords = computed(() => {
    const today = todayISO()
    return visibleWords.value.filter((w) => {
      const card = vocab.value[w.id] ?? newCard()
      return card.due <= today
    })
  })

  const wrongWordIds = computed(() =>
    Object.entries(vocab.value)
      .filter(([, c]) => (c.wrong ?? 0) > 0)
      .sort((a, b) => (b[1].wrong ?? 0) - (a[1].wrong ?? 0))
      .map(([id]) => id),
  )

  const openErrors = computed(() => errors.value.filter((e) => e.status === 'open'))

  const latestReport = computed(() => reports.value[0] ?? null)

  const radar = computed<RadarAxis[]>(() => {
    if (boundDomain !== 'english') return []
    const r = latestReport.value
    const listen = r ? r.sections.find((s) => s.key === 'listening') : null
    const read = r ? r.sections.find((s) => s.key === 'reading') : null
    const write = r ? r.sections.find((s) => s.key === 'writing') : null
    const trans = r ? r.sections.find((s) => s.key === 'translation') : null
    const pct = (score?: number, max?: number) => (score != null && max ? Math.round((score / max) * 100) : 35)
    const b = radarBoost.value
    return [
      { key: 'listenDetail', label: '听力细节', value: Math.min(100, pct(listen?.score, listen?.max) + (b.listenDetail ?? 0)) },
      { key: 'listenMain', label: '听力主旨', value: Math.min(100, pct(listen?.score, listen?.max) - 4 + (b.listenMain ?? 0)) },
      { key: 'readLocate', label: '阅读定位', value: Math.min(100, pct(read?.score, read?.max) + (b.readLocate ?? 0)) },
      { key: 'readVocab', label: '阅读词汇', value: Math.min(100, pct(read?.score, read?.max) - 6 + (b.readVocab ?? 0)) },
      { key: 'writeGrammar', label: '写译语法', value: Math.min(100, pct(write?.score, write?.max) + (b.writeGrammar ?? 0)) },
      { key: 'transCulture', label: '翻译文化词', value: Math.min(100, pct(trans?.score, trans?.max) + (b.transCulture ?? 0)) },
    ]
  })

  const weakest = computed(() => {
    return [...radar.value].sort((a, b) => a.value - b.value)[0]
  })

  const todayTasks = computed<TodayTask[]>(() => {
    const domain = getDomain(boundDomain)
    return domain.buildTodayTasks({
      phase: user().phase,
      dueCount: dueWordIds.value.length,
      wrongCount: wrongWordIds.value.length,
      doneIds: new Set(doneTaskIds.value),
    })
  })

  function ensureCard(id: string): VocabCardState {
    if (!vocab.value[id]) vocab.value[id] = newCard()
    return vocab.value[id]
  }

  function answerVocab(id: string, remembered: boolean) {
    const current = ensureCard(id)
    vocab.value = { ...vocab.value, [id]: reviewCard(current, remembered) }
    user().markStudy()
    completeTask('vocab')
    completeTask('final-vocab')
    flush()
  }

  function completeTask(id: string) {
    if (doneTaskDate.value !== todayISO()) {
      doneTaskDate.value = todayISO()
      doneTaskIds.value = []
    }
    if (!doneTaskIds.value.includes(id)) doneTaskIds.value = [...doneTaskIds.value, id]
    flush()
  }

  function pushError(partial: Omit<ErrorItem, 'id' | 'createdAt' | 'wrongCount' | 'rightStreak' | 'status'>) {
    const exist = errors.value.find(
      (e) => e.question === partial.question && e.correctAnswer === partial.correctAnswer && e.status === 'open',
    )
    if (exist) {
      exist.wrongCount += 1
      exist.userAnswer = partial.userAnswer
      errors.value = [...errors.value]
      flush()
      return
    }
    errors.value = [
      {
        ...partial,
        id: uid('err'),
        createdAt: new Date().toISOString(),
        wrongCount: 1,
        rightStreak: 0,
        status: 'open',
      },
      ...errors.value,
    ]
    flush()
  }

  function updateErrorCause(id: string, cause: ErrorCause) {
    errors.value = errors.value.map((e) => (e.id === id ? { ...e, cause } : e))
    flush()
  }

  function retryError(id: string, correct: boolean) {
    errors.value = errors.value.map((e) => {
      if (e.id !== id) return e
      if (correct) {
        const streak = e.rightStreak + 1
        return { ...e, rightStreak: streak, status: streak >= 2 ? 'cleared' : e.status }
      }
      return { ...e, wrongCount: e.wrongCount + 1, rightStreak: 0 }
    })
    user().markStudy()
    completeTask('final-error')
    flush()
  }

  function addReport(report: MockReport) {
    reports.value = [report, ...reports.value].slice(0, 12)
    rebuildGapPlan(report)
    user().markStudy()
    flush()
  }

  function rebuildGapPlan(report: MockReport) {
    const tasks: GapTask[] = []
    const listenRate = report.typeBreakdown[0]?.rate ?? 1
    const clozeRate = report.typeBreakdown[1]?.rate ?? 1
    const carefulRate = report.typeBreakdown[2]?.rate ?? 1
    const writeRate = report.typeBreakdown[3]?.rate ?? 1

    const pack: { cond: boolean; title: string; desc: string; skill: SkillType; route: string; minutes: number }[] = [
      {
        cond: listenRate < 0.7,
        title: '听力细节听写',
        desc: '每天 15 分钟逐句听写',
        skill: 'listening',
        route: '/train/listening',
        minutes: 15,
      },
      {
        cond: clozeRate < 0.7,
        title: '选词词性与搭配',
        desc: '每天 10 个词性练习',
        skill: 'vocab',
        route: '/train/vocab',
        minutes: 10,
      },
      {
        cond: carefulRate < 0.7,
        title: '阅读定位回找',
        desc: '重做仔细阅读错题',
        skill: 'reading',
        route: '/train/reading/careful',
        minutes: 12,
      },
      {
        cond: writeRate < 0.7,
        title: '写作提纲一则',
        desc: '只写结构，不必全文',
        skill: 'writing',
        route: '/train/writing',
        minutes: 12,
      },
    ]

    const active = pack.filter((p) => p.cond)
    const fallback = pack[0]!
    const source = active.length ? active : [fallback]

    for (let day = 0; day < 7; day++) {
      const item = source[day % source.length]!
      tasks.push({
        id: `gap-${day}-${item.skill}`,
        dayOffset: day,
        title: item.title,
        desc: item.desc,
        minutes: item.minutes,
        skill: item.skill,
        route: item.route,
        done: false,
      })
    }
    gapPlan.value = tasks
    gapGeneratedAt.value = todayISO()
    flush()
  }

  function toggleGapTask(id: string) {
    gapPlan.value = gapPlan.value.map((g) => (g.id === id ? { ...g, done: !g.done } : g))
    const hit = gapPlan.value.find((g) => g.id === id)
    if (hit?.done) {
      const map: Record<SkillType, string> = {
        listening: 'listenDetail',
        reading: 'readLocate',
        vocab: 'readVocab',
        writing: 'writeGrammar',
        translation: 'transCulture',
      }
      const key = map[hit.skill]
      radarBoost.value = { ...radarBoost.value, [key]: (radarBoost.value[key] ?? 0) + 3 }
      completeTask('gap')
      user().markStudy()
    }
    flush()
  }

  function recordPracticeError(opts: {
    skill: SkillType
    subtype?: string
    question: string
    userAnswer: string
    correctAnswer: string
    analysis: string
    cause: ErrorCause
  }) {
    pushError({ source: 'practice', ...opts })
  }

  function boostRadar(key: string, delta = 4) {
    radarBoost.value = { ...radarBoost.value, [key]: (radarBoost.value[key] ?? 0) + delta }
    flush()
  }

  return {
    vocab,
    errors,
    reports,
    gapPlan,
    gapGeneratedAt,
    visibleWords,
    dueWords,
    dueWordIds,
    wrongWordIds,
    openErrors,
    latestReport,
    radar,
    weakest,
    todayTasks,
    ensureCard,
    answerVocab,
    completeTask,
    pushError,
    updateErrorCause,
    retryError,
    addReport,
    toggleGapTask,
    recordPracticeError,
    boostRadar,
    switchDomain,
  }
})
