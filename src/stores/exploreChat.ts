import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiError } from '@/api/http'
import { fetchExploreChatStatus, streamExploreChat, type ExploreChatStatus } from '@/api/exploreChat'
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
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(
        messages.filter(
          (m) => !m.pending && !(m.role === 'assistant' && !m.content.trim() && m.error),
        ),
      ),
    )
  } catch {
    /* quota / private mode */
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isAbort(err: unknown) {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  )
}

export const useExploreChatStore = defineStore('exploreChat', () => {
  const messages = ref<ChatUiMessage[]>(loadSession())
  const input = ref('')
  const pending = ref(false)
  const status = ref<ExploreChatStatus | null>(null)
  const statusError = ref('')
  const sendError = ref('')
  const statusLoaded = ref(false)
  let abort: AbortController | null = null

  function syncPersist() {
    persist(messages.value)
  }

  function patchLastAssistant(patch: Partial<ChatUiMessage>) {
    const list = messages.value
    const last = list[list.length - 1]
    if (!last || last.role !== 'assistant') return
    messages.value = [...list.slice(0, -1), { ...last, ...patch }]
  }

  /** 重试复用同一条助手气泡，避免再插一条。 */
  function takeAssistantSlot(): string {
    const last = messages.value[messages.value.length - 1]
    if (last?.role === 'assistant' && (last.pending || last.error)) {
      patchLastAssistant({ content: '', pending: true, error: undefined })
      return last.id
    }
    const id = uid()
    messages.value = [...messages.value, { id, role: 'assistant', content: '', pending: true }]
    return id
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
    sendError.value = ''
    input.value = ''
    messages.value = [...messages.value, { id: uid(), role: 'user', content: text }]
    syncPersist()
    takeAssistantSlot()
    await requestReply()
  }

  async function retryLast() {
    if (pending.value) return
    const lastUser = [...messages.value].reverse().find((m) => m.role === 'user' && !m.error)
    if (!lastUser) return
    sendError.value = ''
    takeAssistantSlot()
    await requestReply()
  }

  async function requestReply() {
    abort?.abort()
    abort = new AbortController()
    const ac = abort
    pending.value = true
    try {
      const payload = toProviderMessages(messages.value)
      await streamExploreChat(
        payload,
        {
          onDelta: (text) => {
            const last = messages.value[messages.value.length - 1]
            if (!last || last.role !== 'assistant') return
            patchLastAssistant({ content: last.content + text, pending: true })
          },
        },
        ac.signal,
      )
      const last = messages.value[messages.value.length - 1]
      if (last?.role === 'assistant' && !last.content.trim()) {
        throw new ApiError(502, '对话服务没有返回可用内容')
      }
      patchLastAssistant({ pending: false, error: undefined })
      sendError.value = ''
      syncPersist()
    } catch (err) {
      if (isAbort(err) || ac.signal.aborted) {
        const last = messages.value[messages.value.length - 1]
        if (last?.role === 'assistant' && last.pending) {
          if (last.content.trim()) {
            patchLastAssistant({ pending: false, error: undefined })
            sendError.value = ''
          } else {
            messages.value = messages.value.slice(0, -1)
            sendError.value = '已取消生成'
          }
          syncPersist()
        }
        return
      }
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : '发送失败，请稍后重试'
      const last = messages.value[messages.value.length - 1]
      if (last?.role === 'assistant') {
        patchLastAssistant({ pending: false, error: message })
      }
      sendError.value = message
      syncPersist()
    } finally {
      if (abort === ac) abort = null
      pending.value = false
    }
  }

  function stop() {
    if (!pending.value) return
    abort?.abort()
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
    stop,
  }
})
