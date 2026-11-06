<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import ChatMarkdown from '@/components/ChatMarkdown.vue'
import PageHeader from '@/components/PageHeader.vue'
import { MAX_INPUT_CHARS, canSend } from '@/services/exploreChat'
import { useExploreChatStore } from '@/stores/exploreChat'
import { useUserStore } from '@/stores/user'

const user = useUserStore()
const chat = useExploreChatStore()
const listEl = ref<HTMLElement | null>(null)
const fieldEl = ref<HTMLTextAreaElement | null>(null)

const canSubmit = computed(() => canSend(chat.input, chat.pending))

function resizeField() {
  const el = fieldEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
}

async function scrollToEnd() {
  await nextTick()
  const el = listEl.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

async function onSend() {
  if (chat.pending) return
  if (!canSubmit.value) return
  await chat.send()
  resizeField()
  await scrollToEnd()
}

async function onRetry() {
  await chat.retryLast()
  await scrollToEnd()
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key !== 'Enter') return
  if (ev.shiftKey) return
  if (ev.isComposing) return
  if (ev.ctrlKey || ev.metaKey) {
    ev.preventDefault()
    void onSend()
  }
}

watch(
  () => {
    const last = chat.messages[chat.messages.length - 1]
    return [chat.messages.length, last?.content ?? '', chat.pending, chat.sendError]
  },
  () => {
    void scrollToEnd()
  },
)

watch(
  () => chat.input,
  () => resizeField(),
)

onMounted(() => {
  if (user.activeDomainId !== 'explore') user.setActiveDomain('explore')
  void chat.loadStatus()
  void scrollToEnd()
  resizeField()
})

onUnmounted(() => {
  chat.stop()
})
</script>

<template>
  <div class="page chat-page">
    <PageHeader title="拓展" subtle="回复会边生成边显示，支持追问" :back="false" />

    <div v-if="chat.statusError" class="banner" role="status">
      <p class="banner-title">{{ chat.status?.configured === false ? '尚未配置对话服务' : '暂时无法对话' }}</p>
      <p class="page-sub">{{ chat.statusError }}</p>
      <button class="btn ghost sm" type="button" style="margin-top: 10px" @click="chat.loadStatus()">
        重新检查
      </button>
    </div>

    <div ref="listEl" class="thread" aria-live="polite">
      <div v-if="!chat.messages.length && !chat.pending" class="empty">
        <p class="t-title">想问什么都可以先打出来</p>
        <p class="page-sub">例如：帮我解释一个语法点、改一句英文、出一道练习题。本次打开 App 期间会记住上下文。</p>
      </div>

      <div
        v-for="m in chat.messages"
        :key="m.id"
        class="bubble-row"
        :class="m.role === 'user' ? 'from-user' : 'from-assistant'"
      >
        <div class="bubble" :class="[m.role, { pending: m.pending, failed: !!m.error }]">
          <p class="who">
            {{ m.role === 'user' ? '我' : m.pending ? '助手 · 正在生成' : '助手' }}
          </p>
          <p v-if="m.role === 'assistant' && m.pending && !m.content" class="body muted-body">正在生成…</p>
          <ChatMarkdown v-else-if="m.role === 'assistant' && m.content" class="body" :text="m.content" />
          <p v-else class="body">{{ m.content }}</p>
        </div>
      </div>

      <div v-if="chat.sendError && !chat.pending" class="error-card">
        <p class="t-title">{{ chat.messages.some((m) => m.role === 'assistant' && m.content && m.error) ? '生成中断' : '这次没有收到回复' }}</p>
        <p class="page-sub">{{ chat.sendError }}</p>
        <button class="btn primary sm" type="button" style="margin-top: 10px" @click="onRetry">重试</button>
      </div>
    </div>

    <form class="composer" @submit.prevent="onSend">
      <label class="sr-only" for="explore-chat-input">对话内容</label>
      <textarea
        id="explore-chat-input"
        ref="fieldEl"
        v-model="chat.input"
        rows="1"
        :maxlength="MAX_INPUT_CHARS"
        :disabled="chat.pending"
        placeholder="输入内容，和助手对话"
        enterkeyhint="send"
        @keydown="onKeydown"
      />
      <button
        v-if="chat.pending"
        class="btn ghost send"
        type="button"
        @click="chat.stop()"
      >
        停止
      </button>
      <button v-else class="btn primary send" type="submit" :disabled="!canSubmit">发送</button>
    </form>
    <p class="hint">最多 {{ MAX_INPUT_CHARS }} 字 · 空白不能发 · 生成时可停止 · 回复逐段出现</p>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 10px;
  min-height: 0;
}
.banner {
  flex-shrink: 0;
  background: var(--gold-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px 14px;
  margin-bottom: 10px;
}
.banner-title,
.t-title {
  font-weight: 700;
  font-size: 14px;
}
.thread {
  flex: 1;
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0 8px;
}
.empty {
  margin: auto 0;
  padding: 8px 4px 16px;
}
.bubble-row {
  display: flex;
  width: 100%;
}
.bubble-row.from-user {
  justify-content: flex-end;
}
.bubble-row.from-assistant {
  justify-content: flex-start;
}
.bubble {
  max-width: min(86%, 360px);
  border-radius: 14px;
  padding: 8px 12px 10px;
  border: 1px solid var(--line);
}
.bubble.user {
  background: var(--moss);
  border-color: color-mix(in srgb, var(--forest) 28%, var(--line));
}
.bubble.assistant {
  background: var(--paper-2);
}
.bubble.pending {
  opacity: 0.9;
}
.bubble.failed {
  border-color: color-mix(in srgb, var(--coral) 35%, var(--line));
}
.who {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
}
.body {
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.muted-body {
  color: var(--muted);
}
.error-card {
  background: var(--coral-soft);
  border: 1px solid color-mix(in srgb, var(--coral) 35%, var(--line));
  border-radius: var(--radius);
  padding: 12px 14px;
  color: var(--coral);
}
.error-card .page-sub {
  color: var(--coral);
}
.composer {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-top: 6px;
}
.composer textarea {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  max-height: 120px;
  resize: none;
  border: 1px solid var(--line);
  background: var(--paper-2);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 15px;
  line-height: 1.45;
  color: var(--ink);
}
.send {
  height: 44px;
  min-width: 72px;
  padding: 0 14px;
  flex-shrink: 0;
}
.hint {
  flex-shrink: 0;
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 360px) {
  .bubble {
    max-width: 92%;
  }
  .send {
    min-width: 64px;
    padding: 0 10px;
  }
}
</style>
