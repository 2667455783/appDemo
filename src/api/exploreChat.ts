import { apiRequest, apiUrl, ApiError } from '@/api/http'
import { getDeviceId } from '@/utils/deviceId'
import { applySseFrame, pullSseFrames } from '@/services/sse'
import type { ChatTurn } from '@/services/exploreChat'

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

export function fetchExploreChatStatus() {
  return apiRequest<ExploreChatStatus>('/api/v1/me/explore/chat/status')
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
  if (ct.includes('application/json')) {
    let body: { code?: number; message?: string }
    try {
      body = (await res.json()) as { code?: number; message?: string }
    } catch {
      throw new ApiError(res.status, '接口响应不是 JSON')
    }
    throw new ApiError(body.code ?? res.status, body.message || '请求失败')
  }
  if (!res.body) throw new ApiError(502, '对话服务没有返回可用内容')

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
