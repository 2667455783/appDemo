import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isRememberedCard, rememberedWordIds } from '../src/services/vocabRemembered.ts'

describe('vocab retest book = all remembered words', () => {
  it('treats status review as 已记住; new and learning are not', () => {
    assert.equal(isRememberedCard({ status: 'new' }), false)
    assert.equal(isRememberedCard({ status: 'learning' }), false)
    assert.equal(isRememberedCard({ status: 'review' }), true)
    assert.equal(isRememberedCard(undefined), false)
  })

  it('lists every review card even after pendingRetestOn is cleared', () => {
    const vocab = {
      keep: { status: 'review', pendingRetestOn: '2026-11-08', due: '2026-11-09' },
      stillRemembered: { status: 'review', pendingRetestOn: undefined, due: '2026-11-10' },
      forgotten: { status: 'learning', pendingRetestOn: undefined, due: '2026-11-09' },
      untouched: { status: 'new', due: '2026-11-08' },
    }
    assert.deepEqual(rememberedWordIds(vocab).sort(), ['keep', 'stillRemembered'])
  })

  it('is empty when nothing is remembered', () => {
    assert.deepEqual(rememberedWordIds({}), [])
    assert.deepEqual(
      rememberedWordIds({
        a: { status: 'new' },
        b: { status: 'learning' },
      }),
      [],
    )
  })
})
