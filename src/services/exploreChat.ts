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

export const MISSING_EXPLORE_API_HINT =
  '当前连上的后端还没有拓展对话接口。本地 npm run dev 默认走本机 8080，不是线上 tjb666.space；线上服务器也还是旧包，需要把本 PR 的 jar 部署上去后才会有 /api/v1/me/explore/chat/stream。'

/** 线上旧包没有该 Controller 时，Spring 会 404 空包或 500 No static resource。 */
export function rewriteExploreBackendMessage(status: number, message: string): string {
  const text = (message || '').trim()
  if (status === 404 || status === 405 || /no static resource/i.test(text)) {
    return MISSING_EXPLORE_API_HINT
  }
  return text || '发送失败，请稍后重试'
}
