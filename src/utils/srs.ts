import type { VocabCardState } from '@/types'
import { addDays, todayISO } from '@/utils/storage'

export function newCard(): VocabCardState {
  return {
    ease: 2.3,
    interval: 0,
    due: todayISO(),
    correct: 0,
    wrong: 0,
    status: 'new',
  }
}

export function reviewCard(card: VocabCardState, remembered: boolean): VocabCardState {
  const today = todayISO()
  if (!remembered) {
    return {
      ...card,
      ease: Math.max(1.3, card.ease - 0.2),
      interval: 1,
      due: addDays(today, 1),
      wrong: card.wrong + 1,
      status: 'learning',
    }
  }
  const nextInterval = card.interval === 0 ? 1 : card.interval === 1 ? 3 : Math.round(card.interval * card.ease)
  return {
    ...card,
    ease: Math.min(3.2, card.ease + 0.05),
    interval: nextInterval,
    due: addDays(today, nextInterval),
    correct: card.correct + 1,
    status: 'review',
  }
}
