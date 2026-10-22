/** 英语题库入口：复用现有 bank，后续可把 data 迁到本目录 */
export {
  fetchVocab,
  fetchVocabDue,
  fetchListening,
  fetchReading,
  fetchWriting,
  fetchTranslation,
  fetchGrammar,
  fetchMockPaper,
  listMockPapers,
  bankStats,
  vocabCount,
  type ListResult,
} from '@/services/bank'
