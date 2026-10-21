import { CAREFUL_ITEMS, CLOZE_ITEMS } from '@/data/reading'
import { LISTENING_ITEMS } from '@/data/listening'
import { TRANS_ITEMS } from '@/data/translation'
import { WRITING_TOPICS } from '@/data/writing'
import type { ExamLevel, MockPaper } from '@/types'

const w = (id: string) => WRITING_TOPICS.find((t) => t.id === id)!
const l = (id: string) => LISTENING_ITEMS.find((t) => t.id === id)!
const cz = (id: string) => CLOZE_ITEMS.find((c) => c.id === id)!
const cr = (id: string) => CAREFUL_ITEMS.find((c) => c.id === id)!
const tr = (id: string) => TRANS_ITEMS.find((t) => t.id === id)!

/** 原创示例卷（非考试真题），仅作结构演示；主产品已转向单词+写作模板 */
export const MOCK_PAPERS: MockPaper[] = [
  {
    id: 'cet4-sample',
    level: 'cet4',
    title: '四级模拟卷一 · 校园与学习',
    year: '模拟卷',
    writing: w('w-cet4-1'),
    listening: l('l-news-1'),
    cloze: cz('cloze-1'),
    careful: cr('careful-1'),
    translation: tr('t-cet4-1'),
  },
  {
    id: 'cet4-sample-2',
    level: 'cet4',
    title: '四级模拟卷二 · 食堂与高铁',
    year: '模拟卷',
    writing: w('w-cet4-2'),
    listening: l('l-news-2'),
    cloze: cz('cloze-1'),
    careful: cr('careful-1'),
    translation: tr('t-cet4-2'),
  },
  {
    id: 'cet6-sample',
    level: 'cet6',
    title: '六级模拟卷一 · 实习与乡村',
    year: '模拟卷',
    writing: w('w-cet6-1'),
    listening: l('l-conv-1'),
    cloze: cz('cloze-2'),
    careful: cr('careful-2'),
    translation: tr('t-cet6-1'),
  },
  {
    id: 'cet6-sample-2',
    level: 'cet6',
    title: '六级模拟卷二 · 注意力与非遗',
    year: '模拟卷',
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
  return MOCK_PAPERS.find((p) => p.id === id)
}
