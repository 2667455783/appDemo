import { GRAMMAR_CARDS } from '@/data/grammar'
import { LISTENING_ITEMS } from '@/data/listening'
import { MOCK_PAPERS, papersFor } from '@/data/mockExam'
import { REAL_PAPERS } from '@/data/realExams'
import { CAREFUL_ITEMS, CLOZE_ITEMS, MATCH_ITEMS } from '@/data/reading'
import { TRANS_ITEMS } from '@/data/translation'
import { VOCAB_BANK, getAllVocab } from '@/data/vocab'
import { WRITING_TOPICS } from '@/data/writing'
import type {
  ExamLevel,
  GrammarCard,
  ListeningItem,
  MockPaper,
  ReadingKind,
  CarefulItem,
  ClozeItem,
  MatchItem,
  TransItem,
  VocabWord,
  WritingTopic,
} from '@/types'

const LATENCY = 280

// 把真题并入各题型池，让练习与模考都能抽到真题
const REAL_CAREFUL: CarefulItem[] = REAL_PAPERS.flatMap((p) => [p.careful1, p.careful2])
const REAL_CLOZE: ClozeItem[] = REAL_PAPERS.map((p) => p.cloze)
const REAL_MATCH: MatchItem[] = REAL_PAPERS.map((p) => p.match)
const REAL_WRITING: WritingTopic[] = REAL_PAPERS.map((p) => p.writing)
const REAL_TRANS: TransItem[] = REAL_PAPERS.map((p) => p.translation)

const ALL_CAREFUL = [...CAREFUL_ITEMS, ...REAL_CAREFUL]
const ALL_CLOZE = [...CLOZE_ITEMS, ...REAL_CLOZE]
const ALL_MATCH = [...MATCH_ITEMS, ...REAL_MATCH]
const ALL_WRITING = [...WRITING_TOPICS, ...REAL_WRITING]
const ALL_TRANS = [...TRANS_ITEMS, ...REAL_TRANS]

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)]
}

function matchLevel<T extends { level: ExamLevel | 'both' }>(items: T[], level: ExamLevel): T[] {
  return items.filter((i) => i.level === 'both' || i.level === level)
}

export type ListResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

const PAGE_SIZE = 8

export async function fetchVocab(opts: {
  level: ExamLevel
  page?: number
  random?: boolean
}): Promise<ListResult<VocabWord>> {
  const all = await getAllVocab()
  const matched = matchLevel(all, opts.level)
  const ordered = opts.random ? shuffle(matched) : matched
  const page = opts.page ?? 1
  const start = (page - 1) * PAGE_SIZE
  const items = ordered.slice(start, start + PAGE_SIZE)
  return delay({
    items,
    total: ordered.length,
    page,
    pageSize: PAGE_SIZE,
    hasMore: start + PAGE_SIZE < ordered.length,
  })
}

export async function fetchVocabDue(opts: {
  level: ExamLevel
  dueIds: string[]
  count?: number
}): Promise<VocabWord[]> {
  const all = await getAllVocab()
  const matched = matchLevel(all, opts.level)
  const due = matched.filter((w) => opts.dueIds.includes(w.id))
  const fill = matched.filter((w) => !opts.dueIds.includes(w.id))
  const count = opts.count ?? 8
  const pool = [...shuffle(due), ...shuffle(fill)]
  return delay(pool.slice(0, count))
}

export async function fetchListening(opts: {
  level: ExamLevel
  kind?: ListeningItem['kind']
  random?: boolean
}): Promise<ListeningItem> {
  let pool = matchLevel(LISTENING_ITEMS, opts.level)
  if (opts.kind) pool = pool.filter((i) => i.kind === opts.kind)
  if (pool.length === 0) pool = LISTENING_ITEMS
  return delay((opts.random ? pickRandom(pool) : pool[0])!)
}

export async function fetchReading(
  kind: ReadingKind,
  opts: { level: ExamLevel; random?: boolean },
): Promise<CarefulItem | ClozeItem | MatchItem> {
  if (kind === 'cloze') {
    const pool = matchLevel(ALL_CLOZE, opts.level)
    return delay((opts.random ? pickRandom(pool) : pool[0]) ?? ALL_CLOZE[0]!)
  }
  if (kind === 'match') {
    const pool = matchLevel(ALL_MATCH, opts.level)
    return delay((opts.random ? pickRandom(pool) : pool[0]) ?? ALL_MATCH[0]!)
  }
  const pool = matchLevel(ALL_CAREFUL, opts.level)
  return delay((opts.random ? pickRandom(pool) : pool[0]) ?? ALL_CAREFUL[0]!)
}

export async function fetchWriting(opts: {
  level: ExamLevel
  random?: boolean
}): Promise<WritingTopic> {
  const pool = matchLevel(ALL_WRITING, opts.level)
  return delay((opts.random ? pickRandom(pool) : pool[0]) ?? ALL_WRITING[0]!)
}

export async function fetchTranslation(opts: {
  level: ExamLevel
  random?: boolean
}): Promise<TransItem> {
  const pool = matchLevel(ALL_TRANS, opts.level)
  return delay((opts.random ? pickRandom(pool) : pool[0]) ?? ALL_TRANS[0]!)
}

export async function fetchGrammar(random = true): Promise<GrammarCard> {
  return delay((random ? pickRandom(GRAMMAR_CARDS) : GRAMMAR_CARDS[0])!)
}

export async function fetchMockPaper(opts: {
  level: ExamLevel
  excludeIds?: string[]
}): Promise<MockPaper> {
  const pool = papersFor(opts.level).filter((p) => !opts.excludeIds?.includes(p.id))
  const all = pool.length ? pool : papersFor(opts.level)
  return delay((all.length ? pickRandom(all) : MOCK_PAPERS[0])!)
}

export async function listMockPapers(level: ExamLevel): Promise<MockPaper[]> {
  return delay(papersFor(level))
}

export function realPaperList(level: ExamLevel) {
  return REAL_PAPERS.filter((p) => p.level === level)
}

export async function fetchRealPaper(id: string) {
  return delay(REAL_PAPERS.find((p) => p.id === id) ?? REAL_PAPERS[0])
}

export const bankStats = {
  listening: LISTENING_ITEMS.length,
  careful: ALL_CAREFUL.length,
  cloze: ALL_CLOZE.length,
  match: ALL_MATCH.length,
  writing: ALL_WRITING.length,
  translation: ALL_TRANS.length,
  grammar: GRAMMAR_CARDS.length,
  mock: MOCK_PAPERS.length,
  real: REAL_PAPERS.length,
  vocabHand: VOCAB_BANK.length,
}

export async function vocabCount(): Promise<number> {
  return (await getAllVocab()).length
}
