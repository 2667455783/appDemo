import { apiRequest, apiUrl, ApiError } from '@/api/http'
import { getDeviceId } from '@/utils/deviceId'
import { applySseFrame, pullSseFrames } from '@/services/sse'
import { rewriteExploreBackendMessage, type ChatTurn } from '@/services/exploreChat'

export type ExploreChatStatus = {
  configured: boolean
  hasApiKey: boolean
  hasBaseUrl: boolean
  hasModel: boolean
  missing: string[]
}

export type ExploreChatReply = {
  reply: string
}

export type ExploreChatStreamHandlers = {
  onDelta: (text: string) => void
}

export async function fetchExploreChatStatus() {
  try {
    return await apiRequest<ExploreChatStatus>('/api/v1/me/explore/chat/status')
  } catch (err) {
    if (err instanceof ApiError) {
      throw new ApiError(err.code, rewriteExploreBackendMessage(err.code, err.message))
    }
    throw err
  }
}

export function sendExploreChat(messages: ChatTurn[]) {
  return apiRequest<ExploreChatReply>('/api/v1/me/explore/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })
}

export async function streamExploreChat(
  messages: ChatTurn[],
  handlers: ExploreChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const url = apiUrl('/api/v1/me/explore/chat/stream')
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'X-Device-Id': getDeviceId(),
      },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const tip = err instanceof Error ? err.message : String(err)
    throw new ApiError(0, `网络请求失败：${tip}。若在 App 内，请确认可访问线上 API`)
  }

  const ct = (res.headers.get('content-type') || '').toLowerCase()
  if (!res.ok || ct.includes('application/json') || !ct.includes('text/event-stream')) {
    let raw = ''
    try {
      raw = await res.text()
    } catch {
      raw = ''
    }
    let message = raw
    try {
      const body = JSON.parse(raw) as { message?: string }
      if (typeof body.message === 'string' && body.message.trim()) message = body.message
    } catch {
      /* 404 空包、HTML 代理错误等 */
    }
    throw new ApiError(
      res.status || 502,
      rewriteExploreBackendMessage(
        res.status || 502,
        message || (res.ok ? '对话服务没有返回可用内容' : '请求失败'),
      ),
    )
  }
  if (!res.body) throw new ApiError(502, rewriteExploreBackendMessage(502, ''))

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buf = ''
  let finished = false
  let sawDelta = false
  const onDelta = (text: string) => {
    if (!text) return
    sawDelta = true
    handlers.onDelta(text)
  }

  try {
    while (!finished) {
      const { done, value } = await reader.read()
      if (done) {
        buf += decoder.decode()
        const last = pullSseFrames(buf.endsWith('\n\n') ? buf : `${buf}\n\n`)
        finished = consumeFrames(last.frames, onDelta)
        break
      }
      buf += decoder.decode(value, { stream: true })
      const pulled = pullSseFrames(buf)
      buf = pulled.rest
      finished = consumeFrames(pulled.frames, onDelta)
    }
  } finally {
    try {
      await reader.cancel()
    } catch {
      /* ignore */
    }
  }

  if (!finished && !sawDelta) {
    throw new ApiError(502, '对话服务没有返回可用内容')
  }
}

function consumeFrames(
  frames: { event: string; data: string }[],
  onDelta: (text: string) => void,
): boolean {
  let finished = false
  for (const frame of frames) {
    applySseFrame(frame, {
      onDelta,
      onError: (message) => {
        throw new ApiError(502, message)
      },
      onDone: () => {
        finished = true
      },
    })
    if (finished) return true
  }
  return false
}
