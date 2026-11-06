export type SseFrame = {
  event: string
  data: string
}

/** 按文本增量拆 SSE 帧；半帧留在 rest，便于网络切包。 */
export function pullSseFrames(buffer: string): { frames: SseFrame[]; rest: string } {
  const frames: SseFrame[] = []
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  for (const block of parts) {
    const normalized = block.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (!normalized.trim()) continue
    let event = 'message'
    const dataLines: string[] = []
    for (const line of normalized.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) {
        let payload = line.slice(5)
        if (payload.startsWith(' ')) payload = payload.slice(1)
        dataLines.push(payload)
      }
    }
    if (dataLines.length) frames.push({ event, data: dataLines.join('\n') })
  }
  return { frames, rest }
}

export type StreamDeltaHandler = {
  onDelta: (text: string) => void
  onError: (message: string) => void
  onDone: () => void
}

export function applySseFrame(frame: SseFrame, handler: StreamDeltaHandler): boolean {
  if (frame.data.trim() === '[DONE]' || frame.event === 'done') {
    handler.onDone()
    return true
  }
  if (frame.event === 'error') {
    handler.onError(readErrorMessage(frame.data))
    return true
  }
  if (frame.event === 'delta' || frame.event === 'message') {
    const text = readDeltaText(frame.data)
    if (text) handler.onDelta(text)
  }
  return false
}

export function readDeltaText(data: string): string {
  const trimmed = data.trim()
  if (!trimmed || trimmed === '[DONE]') return ''
  try {
    const json = JSON.parse(trimmed) as { text?: unknown; content?: unknown }
    if (typeof json.text === 'string') return json.text
    if (typeof json.content === 'string') return json.content
  } catch {
    return trimmed
  }
  return ''
}

function readErrorMessage(data: string): string {
  try {
    const json = JSON.parse(data) as { message?: unknown }
    if (typeof json.message === 'string' && json.message.trim()) return json.message
  } catch {
    /* plain text */
  }
  return data.trim() || '对话中断，请稍后重试'
}
