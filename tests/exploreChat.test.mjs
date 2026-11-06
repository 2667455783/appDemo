import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MAX_HISTORY_TURNS,
  canSend,
  clipInput,
  notConfiguredHint,
  toProviderMessages,
} from '../src/services/exploreChat.ts'

describe('explore chat helpers', () => {
  it('blocks blank and in-flight sends', () => {
    assert.equal(canSend('  ', false), false)
    assert.equal(canSend('你好', true), false)
    assert.equal(canSend('你好', false), true)
  })

  it('clips input and drops pending/error turns from provider payload', () => {
    assert.equal(clipInput('  abc  '), 'abc')
    const payload = toProviderMessages([
      { id: '1', role: 'user', content: '第一问' },
      { id: '2', role: 'assistant', content: '第一答' },
      { id: '3', role: 'assistant', content: '', pending: true },
      { id: '4', role: 'assistant', content: '失败', error: 'timeout' },
      { id: '5', role: 'user', content: '追问' },
    ])
    assert.deepEqual(payload, [
      { role: 'user', content: '第一问' },
      { role: 'assistant', content: '第一答' },
      { role: 'user', content: '追问' },
    ])
  })

  it('keeps only the latest history window for follow-ups', () => {
    const turns = []
    for (let i = 0; i < MAX_HISTORY_TURNS + 6; i++) {
      turns.push({ id: String(i), role: i % 2 === 0 ? 'user' : 'assistant', content: `m${i}` })
    }
    const payload = toProviderMessages(turns)
    assert.equal(payload.length, MAX_HISTORY_TURNS)
    assert.equal(payload[0].content, `m${turns.length - MAX_HISTORY_TURNS}`)
    assert.equal(payload.at(-1).content, `m${turns.length - 1}`)
  })

  it('names the exact missing server env keys', () => {
    const hint = notConfiguredHint(['AI_API_KEY', 'AI_MODEL'])
    assert.match(hint, /AI_API_KEY、AI_MODEL/)
    assert.match(hint, /backend\/.env.dev/)
  })
})
