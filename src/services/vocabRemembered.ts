/** 本 App「已记住」= 背词点「记住了」后的 SRS status `review`；其余为未记住。 */
export type RememberedLook = {
  status?: string
  pendingRetestOn?: string
  due?: string
  wrong?: number
}

export function isRememberedCard(card: RememberedLook | undefined | null): boolean {
  return card?.status === 'review'
}

export function isUnrememberedCard(card: RememberedLook | undefined | null): boolean {
  return Boolean(card) && !isRememberedCard(card)
}

/** 复测本：全部已记住单词，不依赖 pendingRetestOn。 */
export function rememberedWordIds(vocab: Record<string, RememberedLook>): string[] {
  return Object.entries(vocab)
    .filter(([, c]) => isRememberedCard(c))
    .sort((a, b) => {
      const da = a[1].pendingRetestOn || a[1].due || ''
      const db = b[1].pendingRetestOn || b[1].due || ''
      const byDate = db.localeCompare(da)
      if (byDate) return byDate
      return a[0].localeCompare(b[0])
    })
    .map(([id]) => id)
}

/** 错词本：全部未记住单词，不依赖历史 wrong 次数。 */
export function unrememberedWordIds(vocab: Record<string, RememberedLook>): string[] {
  return Object.entries(vocab)
    .filter(([, c]) => isUnrememberedCard(c))
    .sort((a, b) => {
      const byWrong = (b[1].wrong ?? 0) - (a[1].wrong ?? 0)
      if (byWrong) return byWrong
      return a[0].localeCompare(b[0])
    })
    .map(([id]) => id)
}
