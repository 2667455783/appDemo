import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applySseFrame, pullSseFrames, readDeltaText } from '../src/services/sse.ts'
import { parseChatMarkdown } from '../src/services/chatMarkdown.ts'
import { TextDecoder } from 'node:util'

describe('sse frames', () => {
  it('keeps a partial frame in rest until a blank line', () => {
    const first = pullSseFrames('event: delta\ndata: {"text":"现"}')
    assert.equal(first.frames.length, 0)
    assert.match(first.rest, /现/)
    const second = pullSseFrames(`${first.rest}\n\nevent: delta\ndata: {"text":"在"}\n\n`)
    assert.deepEqual(
      second.frames.map((f) => readDeltaText(f.data)),
      ['现', '在'],
    )
  })

  it('renders incremental deltas before done', () => {
    const chunks = [
      'event: delta\ndata: {"text":"现"}\n\n',
      'event: delta\ndata: {"text":"在完成"}\n\n',
      'event: done\ndata: {"ok":true}\n\n',
    ]
    let text = ''
    const seen = []
    let done = false
    let buf = ''
    for (const chunk of chunks) {
      buf += chunk
      const pulled = pullSseFrames(buf)
      buf = pulled.rest
      for (const frame of pulled.frames) {
        applySseFrame(frame, {
          onDelta: (t) => {
            text += t
            seen.push(text)
          },
          onError: () => {
            throw new Error('unexpected error')
          },
          onDone: () => {
            done = true
          },
        })
      }
    }
    assert.deepEqual(seen, ['现', '现在完成'])
    assert.equal(done, true)
    assert.notEqual(seen[0], '现在完成')
  })

  it('decodes utf-8 bytes split across network chunks', () => {
    const frame = 'event: delta\ndata: {"text":"你好"}\n\n'
    const bytes = new TextEncoder().encode(frame)
    const decoder = new TextDecoder('utf-8')
    let buf = ''
    const texts = []
    for (const b of bytes) {
      buf += decoder.decode(new Uint8Array([b]), { stream: true })
      const pulled = pullSseFrames(buf)
      buf = pulled.rest
      for (const frame of pulled.frames) {
        const t = readDeltaText(frame.data)
        if (t) texts.push(t)
      }
    }
    buf += decoder.decode()
    const last = pullSseFrames(buf.endsWith('\n\n') ? buf : `${buf}\n\n`)
    for (const frame of last.frames) {
      const t = readDeltaText(frame.data)
      if (t) texts.push(t)
    }
    assert.equal(texts.join(''), '你好')
  })

  it('skips empty and role-only payloads', () => {
    assert.equal(readDeltaText('{"text":""}'), '')
    assert.equal(readDeltaText('{}'), '')
  })

  it('surfaces mid-stream error events', () => {
    let err = ''
    applySseFrame(
      { event: 'error', data: '{"message":"上游中断"}' },
      {
        onDelta: () => {},
        onError: (m) => {
          err = m
        },
        onDone: () => {},
      },
    )
    assert.equal(err, '上游中断')
  })

  it('stops applying later frames after done (stream-end cleanup)', () => {
    let text = ''
    let done = false
    const frames = [
      { event: 'delta', data: '{"text":"半"}' },
      { event: 'done', data: '{"ok":true}' },
      { event: 'delta', data: '{"text":"段"}' },
    ]
    for (const frame of frames) {
      const stop = applySseFrame(frame, {
        onDelta: (t) => {
          if (!done) text += t
        },
        onError: () => {
          throw new Error('unexpected error')
        },
        onDone: () => {
          done = true
        },
      })
      if (stop) break
    }
    assert.equal(done, true)
    assert.equal(text, '半')
  })

  it('leaves an incomplete frame in rest so abort does not flush garbage', () => {
    const pulled = pullSseFrames('event: delta\ndata: {"text":"现"}\n\nevent: delta\ndata: {"text":"在')
    assert.deepEqual(
      pulled.frames.map((f) => readDeltaText(f.data)),
      ['现'],
    )
    assert.match(pulled.rest, /在/)
    assert.equal(pulled.rest.includes('\n\n'), false)
  })
})

describe('safe markdown', () => {
  it('does not interpret html tags as markup', () => {
    const parts = parseChatMarkdown('看 <img src=x onerror=alert(1)> 与 **粗体** 和 `code`')
    const html = parts.filter((p) => p.t === 'text').map((p) => p.v).join('')
    assert.match(html, /<img/)
    assert.equal(parts.some((p) => p.t === 'bold' && p.v === '粗体'), true)
    assert.equal(parts.some((p) => p.t === 'code' && p.v === 'code'), true)
  })
})
