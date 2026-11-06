export const MAX_INPUT_CHARS = 2000
export const MAX_HISTORY_TURNS = 20

export type ChatRole = 'user' | 'assistant'

export type ChatTurn = {
  role: ChatRole
  content: string
}

export type ChatUiMessage = ChatTurn & {
  id: string
  pending?: boolean
  error?: string
}

export function canSend(text: string, pending: boolean): boolean {
  return !pending && text.trim().length > 0
}

export function clipInput(text: string): string {
  return text.trim().slice(0, MAX_INPUT_CHARS)
}

export function toProviderMessages(turns: ChatUiMessage[]): ChatTurn[] {
  return turns
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && !t.pending && !t.error)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_INPUT_CHARS) }))
    .slice(-MAX_HISTORY_TURNS)
}

export function notConfiguredHint(missing: string[]): string {
  const keys = missing.length ? missing.join('、') : 'AI_API_KEY、AI_BASE_URL、AI_MODEL'
  return `对话服务尚未在服务器配置（缺少 ${keys}）。请写入 backend/.env.dev 或线上环境变量后重启后端，不要把密钥放进前端。`
}
