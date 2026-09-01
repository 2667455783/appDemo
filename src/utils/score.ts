import type { ErrorCause, MockAnswers, MockPaper, MockReport, SectionScore } from '@/types'
import { uid } from '@/utils/storage'

const LISTEN_MAX = 249
const READ_MAX = 249
const WRITE_MAX = 106
const TRANS_MAX = 106

function rateScore(correct: number, total: number, max: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * max)
}

function countCorrect(answers: (number | null)[], keys: number[]): number {
  return answers.reduce<number>((n, a, i) => n + (a === keys[i] ? 1 : 0), 0)
}

export function gradeMock(paper: MockPaper, answers: MockAnswers): MockReport {
  const listenKeys = paper.listening.questions.map((q) => q.answer)
  const listenCorrect = countCorrect(answers.listening, listenKeys)
  const listenScore = rateScore(listenCorrect, listenKeys.length, LISTEN_MAX)

  const clozeCorrect = answers.cloze.reduce<number>(
    (n, a, i) => n + (a && a === paper.cloze.answers[i] ? 1 : 0),
    0,
  )
  const carefulKeys = paper.careful.questions.map((q) => q.answer)
  const carefulCorrect = countCorrect(answers.careful, carefulKeys)
  const readTotal = paper.cloze.answers.length + carefulKeys.length
  const readCorrect = clozeCorrect + carefulCorrect
  const readScore = rateScore(readCorrect, readTotal, READ_MAX)

  const checkCount = answers.writingChecks.filter(Boolean).length
  const checkTotal = Math.max(paper.writing.rubric.length, 1)
  const words = answers.writing.trim().split(/\s+/).filter(Boolean).length
  const lengthRate = Math.min(1, words / 120)
  const writeScore = Math.round(WRITE_MAX * (0.45 * lengthRate + 0.55 * (checkCount / checkTotal)))

  const transWords = answers.translation.trim().length
  const sampleLen = paper.translation.sample.length
  const transRate = Math.min(1, transWords / Math.max(sampleLen * 0.45, 40))
  const transScore = Math.round(TRANS_MAX * (0.35 + 0.65 * transRate))

  const sections: SectionScore[] = [
    {
      key: 'listening',
      label: '听力',
      score: listenScore,
      max: LISTEN_MAX,
      detail: `${listenCorrect}/${listenKeys.length} 题正确`,
    },
    {
      key: 'reading',
      label: '阅读',
      score: readScore,
      max: READ_MAX,
      detail: `选词 ${clozeCorrect}/${paper.cloze.answers.length} · 仔细阅读 ${carefulCorrect}/${carefulKeys.length}`,
    },
    {
      key: 'writing',
      label: '写作',
      score: writeScore,
      max: WRITE_MAX,
      detail: `约 ${words} 词 · 自检 ${checkCount}/${checkTotal}`,
    },
    {
      key: 'translation',
      label: '翻译',
      score: transScore,
      max: TRANS_MAX,
      detail: transWords ? '已提交译文' : '未作答（空白失分）',
    },
  ]

  const total = listenScore + readScore + writeScore + transScore
  const typeBreakdown = [
    { label: '听力题', rate: listenKeys.length ? listenCorrect / listenKeys.length : 0 },
    { label: '选词填空', rate: paper.cloze.answers.length ? clozeCorrect / paper.cloze.answers.length : 0 },
    { label: '仔细阅读', rate: carefulKeys.length ? carefulCorrect / carefulKeys.length : 0 },
    { label: '写作完成度', rate: 0.45 * lengthRate + 0.55 * (checkCount / checkTotal) },
    { label: '翻译完成度', rate: transRate },
  ]

  const weakCauses: ErrorCause[] = []
  if (listenCorrect < listenKeys.length) weakCauses.push('listen')
  if (clozeCorrect < paper.cloze.answers.length) weakCauses.push('vocab')
  if (carefulCorrect < carefulKeys.length) weakCauses.push('locate')
  if (checkCount < checkTotal) weakCauses.push('template')
  if (!answers.translation.trim()) weakCauses.push('time')

  const nextActions: string[] = []
  if ((typeBreakdown[0]?.rate ?? 1) < 0.7) {
    nextActions.push(`精听本卷听力 ${paper.listening.questions.length} 题，逐句听写`)
  }
  if ((typeBreakdown[1]?.rate ?? 1) < 0.7) {
    nextActions.push(`复习本卷选词 ${paper.cloze.answers.length - clozeCorrect} 个空的词性与搭配`)
  }
  if ((typeBreakdown[2]?.rate ?? 1) < 0.7) {
    nextActions.push('重做仔细阅读错题，先划题干定位词再回原文')
  }
  if ((typeBreakdown[3]?.rate ?? 1) < 0.7) {
    nextActions.push('用脚手架重写本篇提纲，不必再写全文')
  }
  if (nextActions.length === 0) {
    nextActions.push('保持包：高频词 + 再听一遍本套听力')
  }

  return {
    id: uid('report'),
    paperId: paper.id,
    paperTitle: paper.title,
    level: paper.level,
    createdAt: new Date().toISOString(),
    total,
    sections,
    typeBreakdown,
    nextActions: nextActions.slice(0, 3),
    weakCauses,
  }
}

export function estimateBand(total: number): string {
  if (total >= 600) return '冲刺档'
  if (total >= 550) return '优秀档'
  if (total >= 425) return '过线档'
  return '未过线'
}
