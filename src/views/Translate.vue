<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { translateAuto, translateText, TRANSLATE_MAX_CHARS, type Lang } from '@/services/translate'

const input = ref('')
const output = ref('')
const alts = ref<string[]>([])
const from = ref<Lang>('en')
const to = ref<Lang>('zh')
const auto = ref(true)
const loading = ref(false)
const err = ref('')

type HistoryItem = { id: string; input: string; output: string; from: Lang; to: Lang; at: string }
const history = ref<HistoryItem[]>(JSON.parse(localStorage.getItem('translateHistory') || '[]'))

function swap() {
  auto.value = false
  const f = from.value
  from.value = to.value
  to.value = f
}

async function run() {
  if (!input.value.trim() || loading.value) return
  loading.value = true
  err.value = ''
  output.value = ''
  alts.value = []
  try {
    if (auto.value) {
      const r = await translateAuto(input.value)
      from.value = r.from
      to.value = r.to
      output.value = r.text
      alts.value = r.matches
    } else {
      const r = await translateText(input.value, from.value, to.value)
      output.value = r.text
      alts.value = r.matches
    }
    if (output.value) {
      history.value.unshift({
        id: Date.now().toString(),
        input: input.value.trim(),
        output: output.value,
        from: from.value,
        to: to.value,
        at: new Date().toLocaleTimeString(),
      })
      history.value = history.value.slice(0, 20)
      localStorage.setItem('translateHistory', JSON.stringify(history.value))
    }
  } catch (e: any) {
    err.value = e?.message || '翻译失败，请检查网络后重试'
  } finally {
    loading.value = false
  }
}

function useHistory(h: HistoryItem) {
  input.value = h.input
  output.value = h.output
  from.value = h.from
  to.value = h.to
  auto.value = false
}

function clearHistory() {
  history.value = []
  localStorage.removeItem('translateHistory')
}

async function copyOut() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
  } catch {
    // ignore
  }
}

const langLabel: Record<Lang, string> = { en: '英', zh: '中' }

// 语音输入（原生优先，Web 兜底）
import { startVoice, stopVoice, forceStop, voiceAvailable, requestPermission, isListening, voiceLangLabel, type VoiceLang } from '@/services/voice'

const recording = ref(false)
const micErr = ref('')
const micStatus = ref('')
/** 听写语言：跟翻译方向解耦，避免「自动+空输入」误用英文听中文 */
const listenLang = ref<VoiceLang>('zh-CN')
const diag = ref<string[]>([])
const showDiag = ref(false)

function pushDiag(step: string) {
  const t = new Date().toLocaleTimeString()
  diag.value.push(`[${t}] ${step}`)
  showDiag.value = true
}

function clearDiag() {
  diag.value = []
  showDiag.value = false
}

async function toggleMic() {
  micErr.value = ''
  if (recording.value) {
    recording.value = false
    micStatus.value = '正在整理识别结果…'
    pushDiag('用户点击停止')
    await stopVoice()
    return
  }
  clearDiag()
  pushDiag('用户点击语音按钮 listenLang=' + listenLang.value)
  const check = await voiceAvailable()
  pushDiag('voiceAvailable.ok=' + check.ok + (check.reason ? ' reason=' + check.reason : ''))
  if (!check.ok) {
    micErr.value = check.reason || '语音输入不可用'
    return
  }
  const granted = await requestPermission()
  pushDiag('requestPermission.granted=' + granted)
  if (!granted) {
    micErr.value = '麦克风未授权：请点击地址栏锁图标允许麦克风，或检查系统隐私设置'
    return
  }
  recording.value = true
  micStatus.value = `正在听${voiceLangLabel(listenLang.value)}…请说话，说完点「停止」`
  pushDiag('进入 startVoice')
  await startVoice(listenLang.value, input.value, {
    onStart: () => {
      micStatus.value = `● 正在听${voiceLangLabel(listenLang.value)}…说完请点「停止」`
      pushDiag('onStart: 开始录音')
    },
    onPartial: (t) => {
      input.value = t
      micStatus.value = t.trim()
        ? `识别中：${t.slice(-40)}`
        : `● 正在听${voiceLangLabel(listenLang.value)}…`
    },
    onFinal: (t) => {
      input.value = t
      micStatus.value = t.trim() ? '识别完成' : ''
      pushDiag('onFinal: ' + (t || '(空)'))
      recording.value = false
      if (t && t.trim()) run()
    },
    onError: (m) => {
      micErr.value = m
      recording.value = false
      micStatus.value = ''
      pushDiag('onError: ' + m)
    },
    onEnd: () => {
      recording.value = false
      pushDiag('onEnd')
    },
    onDebug: (step) => {
      pushDiag(step)
      if (step.includes('本地识别') || step.includes('在线识别不可用')) {
        micStatus.value = step.replace(/^提示:\s*/, '')
      }
    },
  })
  pushDiag('startVoice 返回 isListening=' + isListening())
  if (!isListening()) recording.value = false
}

// 离开页面时静默清理语音状态，避免 listening 残留导致下次点击"压根没效果"
onUnmounted(() => {
  forceStop()
})
</script>

<template>
  <div class="page">
    <PageHeader title="翻译" subtle="中英互译 · 超长文本自动分段" :back="false" />

    <div class="card">
      <div class="langbar">
        <button class="chip" :class="{ on: auto }" type="button" @click="auto = true">自动</button>
        <button
          class="chip"
          :class="{ on: !auto && from === 'en' }"
          type="button"
          @click="auto = false; from = 'en'; to = 'zh'; listenLang = 'en-US'"
        >
          英→中
        </button>
        <button
          class="chip"
          :class="{ on: !auto && from === 'zh' }"
          type="button"
          @click="auto = false; from = 'zh'; to = 'en'; listenLang = 'zh-CN'"
        >
          中→英
        </button>
        <button class="chip ghost" type="button" @click="swap" :disabled="auto">⇄</button>
      </div>
      <div class="langbar listen-bar">
        <span class="muted">听写语言</span>
        <button class="chip" :class="{ on: listenLang === 'zh-CN' }" type="button" :disabled="recording" @click="listenLang = 'zh-CN'">听中文</button>
        <button class="chip" :class="{ on: listenLang === 'en-US' }" type="button" :disabled="recording" @click="listenLang = 'en-US'">听英文</button>
      </div>

      <textarea
        v-model="input"
        class="tinput"
        :class="{ rec: recording }"
        rows="4"
        :placeholder="recording ? '正在聆听…请说话，说完点下方红色「停止」' : '输入要翻译的文本，支持单词或整段'"
        @keydown.ctrl.enter="run"
      ></textarea>

      <p class="char-hint muted">
        {{ input.length }} 字
        <template v-if="input.trim().length > TRANSLATE_MAX_CHARS"> · 将自动分段翻译</template>
      </p>

      <!-- 录音中：全宽停止，避免小 chip 看不见 -->
      <button
        v-if="recording"
        class="btn danger block stop-btn"
        type="button"
        @click="toggleMic"
      >
        ● 正在听{{ voiceLangLabel(listenLang) }}… 点击停止
      </button>

      <div v-else class="actions">
        <button class="btn ghost" type="button" @click="toggleMic">语音输入</button>
        <button class="btn primary" type="button" :disabled="loading || !input.trim()" @click="run">
          {{ loading ? '翻译中…' : '翻译' }}
        </button>
      </div>

      <p class="page-sub tip">电脑浏览器若在线语音失败，点停止后会自动用本地识别（首次稍慢）。</p>
      <p v-if="micErr" class="page-sub" style="color: var(--danger); margin: 0 0 6px">⚠ {{ micErr }}</p>
      <p v-if="micStatus" class="page-sub" :style="{ margin: '0 0 6px', color: recording ? 'var(--danger)' : 'var(--ink-soft)' }">
        {{ recording ? '● ' : '' }}{{ micStatus }}
      </p>

      <!-- 语音诊断面板：显示每次点击语音后的逐步进度/错误，便于反馈卡在哪一步 -->
      <div v-if="showDiag" class="diag">
        <div class="row space" style="margin-bottom: 4px">
          <span class="diag-title">语音诊断</span>
          <button class="chip ghost" type="button" @click="clearDiag">清除</button>
        </div>
        <ol class="diag-list">
          <li v-for="(d, i) in diag" :key="i">{{ d }}</li>
        </ol>
      </div>

      <div v-if="err" class="page-sub" style="color: var(--danger)">{{ err }}</div>

      <div v-if="output" class="out">
        <div class="row space">
          <p class="out-label">译为{{ langLabel[to] }}文</p>
          <button class="chip ghost" type="button" @click="copyOut">复制</button>
        </div>
        <p class="out-text">{{ output }}</p>
        <div v-if="alts.length" class="alts">
          <p class="muted">其他译法</p>
          <p v-for="a in alts" :key="a" class="page-sub">· {{ a }}</p>
        </div>
      </div>
    </div>

    <div v-if="history.length" style="margin-top: 14px">
      <div class="row space" style="margin-bottom: 8px">
        <p class="section-h" style="margin: 0">历史</p>
        <button class="chip ghost" type="button" @click="clearHistory">清空</button>
      </div>
      <article
        v-for="h in history"
        :key="h.id"
        class="card mini"
        style="cursor: pointer"
        @click="useHistory(h)"
      >
        <p class="h-src">{{ langLabel[h.from] }} → {{ langLabel[h.to] }} · {{ h.at }}</p>
        <p class="h-in">{{ h.input }}</p>
        <p class="page-sub">{{ h.output }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.langbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.listen-bar {
  margin-top: -4px;
}
.tinput {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  font-size: 16px;
  background: var(--paper-2);
  color: var(--ink);
  resize: vertical;
  font-family: inherit;
}
.out {
  margin-top: 6px;
  border-top: 1px dashed var(--line);
  padding-top: 10px;
}
.out-label {
  font-weight: 700;
}
.out-text {
  margin: 6px 0 0;
  font-size: 17px;
  line-height: 1.6;
}
.alts {
  margin-top: 8px;
}
.h-src {
  font-size: 12px;
  color: var(--ink-soft);
}
.h-in {
  margin: 4px 0 2px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chip.ghost {
  background: transparent;
  border: 1px solid var(--line);
}
.char-hint {
  margin: 8px 0 10px;
  font-size: 13px;
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.actions .btn {
  width: 100%;
}
.stop-btn {
  margin-bottom: 8px;
  height: 48px;
  font-size: 16px;
  animation: pulse 1.2s ease-in-out infinite;
}
.tip {
  margin: 8px 0 6px;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.82;
  }
}
.tinput.rec {
  border-color: var(--danger);
  box-shadow: 0 0 0 2px rgba(220, 60, 60, 0.15);
}
.diag {
  margin: 6px 0 0;
  padding: 8px 10px;
  border: 1px dashed var(--line);
  border-radius: 10px;
  background: var(--paper-2);
  font-size: 12px;
  color: var(--ink-soft);
}
.diag-title {
  font-weight: 700;
  color: var(--ink);
}
.diag-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.6;
  max-height: 160px;
  overflow: auto;
}
.diag-list li {
  word-break: break-all;
}
</style>
