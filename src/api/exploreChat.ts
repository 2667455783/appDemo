import { apiRequest } from '@/api/http'
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

export function fetchExploreChatStatus() {
  return apiRequest<ExploreChatStatus>('/api/v1/me/explore/chat/status')
}

export function sendExploreChat(messages: ChatTurn[]) {
  return apiRequest<ExploreChatReply>('/api/v1/me/explore/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })
}
