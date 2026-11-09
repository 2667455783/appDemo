import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isRememberedCard,
  isUnrememberedCard,
  rememberedWordIds,
  unrememberedWordIds,
} from '../src/services/vocabRemembered.ts'

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

describe('vocab wrong book = all unremembered words', () => {
  it('treats new and learning as 未记住; review is not', () => {
    assert.equal(isUnrememberedCard({ status: 'new' }), true)
    assert.equal(isUnrememberedCard({ status: 'learning' }), true)
    assert.equal(isUnrememberedCard({ status: 'review' }), false)
    assert.equal(isUnrememberedCard(undefined), false)
  })

  it('lists every non-review card even if wrong count is 0; remembered with history leave', () => {
    const vocab = {
      forgotten: { status: 'learning', wrong: 2, due: '2026-11-09' },
      neverMarked: { status: 'new', wrong: 0, due: '2026-11-09' },
      nowRemembered: { status: 'review', wrong: 3, due: '2026-11-12' },
    }
    assert.deepEqual(unrememberedWordIds(vocab).sort(), ['forgotten', 'neverMarked'])
  })

  it('is empty when nothing is unremembered', () => {
    assert.deepEqual(unrememberedWordIds({}), [])
    assert.deepEqual(
      unrememberedWordIds({
        a: { status: 'review', wrong: 2 },
      }),
      [],
    )
  })
})
