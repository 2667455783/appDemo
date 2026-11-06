import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiError } from '@/api/http'
import { fetchExploreChatStatus, sendExploreChat, type ExploreChatStatus } from '@/api/exploreChat'
import {
  canSend,
  clipInput,
  notConfiguredHint,
  toProviderMessages,
  type ChatUiMessage,
} from '@/services/exploreChat'

const SESSION_KEY = 'exploreChat:messages'

function loadSession(): ChatUiMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatUiMessage[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
  } catch {
    return []
  }
}

function persist(messages: ChatUiMessage[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.filter((m) => !m.pending)))
  } catch {
    /* quota / private mode */
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useExploreChatStore = defineStore('exploreChat', () => {
  const messages = ref<ChatUiMessage[]>(loadSession())
  const input = ref('')
  const pending = ref(false)
  const status = ref<ExploreChatStatus | null>(null)
  const statusError = ref('')
  const sendError = ref('')
  const statusLoaded = ref(false)

  function syncPersist() {
    persist(messages.value)
  }

  async function loadStatus() {
    statusError.value = ''
    try {
      status.value = await fetchExploreChatStatus()
      if (status.value && !status.value.configured) {
        statusError.value = notConfiguredHint(status.value.missing || [])
      }
    } catch (err) {
      status.value = null
      statusError.value =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : '无法确认对话服务状态，请检查网络后重试'
    } finally {
      statusLoaded.value = true
    }
  }

  async function send() {
    if (!canSend(input.value, pending.value)) return
    const text = clipInput(input.value)
    if (!text) return
    pending.value = true
    sendError.value = ''
    input.value = ''
    messages.value = [...messages.value, { id: uid(), role: 'user', content: text }]
    syncPersist()
    await requestReply()
  }

  async function retryLast() {
    if (pending.value) return
    const lastUser = [...messages.value].reverse().find((m) => m.role === 'user' && !m.error)
    if (!lastUser) return
    sendError.value = ''
    pending.value = true
    await requestReply()
  }

  async function requestReply() {
    try {
      const payload = toProviderMessages(messages.value)
      const data = await sendExploreChat(payload)
      const reply = (data.reply || '').trim()
      if (!reply) {
        throw new ApiError(502, '对话服务没有返回可用内容')
      }
      messages.value = [...messages.value, { id: uid(), role: 'assistant', content: reply }]
      sendError.value = ''
      syncPersist()
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : '发送失败，请稍后重试'
      sendError.value = message
    } finally {
      pending.value = false
    }
  }

  return {
    messages,
    input,
    pending,
    status,
    statusError,
    sendError,
    statusLoaded,
    loadStatus,
    send,
    retryLast,
  }
})
