import { CAREFUL_ITEMS, CLOZE_ITEMS } from '@/data/reading'
import { LISTENING_ITEMS } from '@/data/listening'
import { REAL_PAPERS } from '@/data/realExams'
import { TRANS_ITEMS } from '@/data/translation'
import { WRITING_TOPICS } from '@/data/writing'
import type { ExamLevel, MockPaper } from '@/types'

const w = (id: string) => WRITING_TOPICS.find((t) => t.id === id)!
const l = (id: string) => LISTENING_ITEMS.find((t) => t.id === id)!
const cz = (id: string) => CLOZE_ITEMS.find((c) => c.id === id)!
const cr = (id: string) => CAREFUL_ITEMS.find((c) => c.id === id)!
const tr = (id: string) => TRANS_ITEMS.find((t) => t.id === id)!

export const MOCK_PAPERS: MockPaper[] = [
  {
    id: 'cet4-sample',
    level: 'cet4',
    title: '四级样卷一 · 校园与学习',
    year: '示例卷',
    writing: w('w-cet4-1'),
    listening: l('l-news-1'),
    cloze: cz('cloze-1'),
    careful: cr('careful-1'),
    translation: tr('t-cet4-1'),
  },
  {
    id: 'cet4-sample-2',
    level: 'cet4',
    title: '四级样卷二 · 食堂与高铁',
    year: '示例卷',
    writing: w('w-cet4-2'),
    listening: l('l-news-2'),
    cloze: cz('cloze-1'),
    careful: cr('careful-1'),
    translation: tr('t-cet4-2'),
  },
  {
    id: 'cet6-sample',
    level: 'cet6',
    title: '六级样卷一 · 实习与乡村',
    year: '示例卷',
    writing: w('w-cet6-1'),
    listening: l('l-conv-1'),
    cloze: cz('cloze-2'),
    careful: cr('careful-2'),
    translation: tr('t-cet6-1'),
  },
  {
    id: 'cet6-sample-2',
    level: 'cet6',
    title: '六级样卷二 · 注意力与非遗',
    year: '示例卷',
    writing: w('w-cet6-2'),
    listening: l('l-lecture-1'),
    cloze: cz('cloze-2'),
    careful: cr('careful-2'),
    translation: tr('t-cet6-2'),
  },
]

export function papersFor(level: ExamLevel): MockPaper[] {
  return MOCK_PAPERS.filter((p) => p.level === level)
}

export function getPaper(id: string): MockPaper | undefined {
  const mock = MOCK_PAPERS.find((p) => p.id === id)
  if (mock) return mock
  const real = REAL_PAPERS.find((p) => p.id === id)
  if (!real) return undefined
  const placeholderListen = LISTENING_ITEMS.find((l) => l.level === real.level) ?? LISTENING_ITEMS[0]
  return {
    id: real.id,
    level: real.level,
    title: real.title,
    year: real.year,
    writing: real.writing,
    listening: placeholderListen,
    cloze: real.cloze,
    careful: real.careful1,
    translation: real.translation,
  }
}
