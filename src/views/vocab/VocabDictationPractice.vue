<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import SpeakWordButton from '@/components/SpeakWordButton.vue'
import { fetchVocabByIds } from '@/services/bank'
import { useStudyStore } from '@/stores/study'
import type { VocabWord } from '@/types'

const router = useRouter()
const study = useStudyStore()

const queue = ref<VocabWord[]>([])
const loading = ref(true)
const idx = ref(0)
const done = ref(false)
const input = ref('')
const revealed = ref(false)
const ok = ref<boolean | null>(null)
const right = ref(0)
const wrong = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)

const current = computed(() => queue.value[idx.value])

function normalize(s: string) {
  return s.trim().toLowerCase()
}

async function load() {
  loading.value = true
  done.value = false
  idx.value = 0
  input.value = ''
  revealed.value = false
  ok.value = null
  right.value = 0
  wrong.value = 0
  const ids = study.dictationWordIds
  queue.value = ids.length ? await fetchVocabByIds(ids) : []
  loading.value = false
  if (!queue.value.length) done.value = true
  else await focusInput()
}

async function focusInput() {
  await nextTick()
  inputEl.value?.focus()
}

onMounted(load)

function submit() {
  if (!current.value || revealed.value) return
  const ans = normalize(input.value)
  if (!ans) return
  revealed.value = true
  const match = ans === normalize(current.value.word)
  ok.value = match
  if (match) right.value += 1
  else wrong.value += 1
  window.setTimeout(() => {
    advance()
  }, match ? 650 : 1200)
}

function advance() {
  input.value = ''
  revealed.value = false
  ok.value = null
  if (idx.value + 1 >= queue.value.length) {
    done.value = true
    study.clearDictation()
  } else {
    idx.value += 1
    void focusInput()
  }
}

function goVocab() {
  router.replace('/train/vocab')
}
</script>

<template>
  <div class="page full">
    <PageHeader title="巩固默写" subtle="只看译文 · 写出英文单词" @back="router.back()" />

    <div v-if="loading" class="card"><p>正在出题…</p></div>

    <div v-else-if="!queue.length" class="card">
      <p>暂无待默写的词。</p>
      <p class="page-sub">在「今日背词」点「记住了」，或在「昨日巩固」答对后，词会进入这里。</p>
      <div class="grid2" style="margin-top: 12px">
        <button class="btn primary" type="button" @click="goVocab">去今日背词</button>
        <button
          class="btn ghost"
          type="button"
          @click="router.replace('/train/vocab-retest?scope=yesterday')"
        >
          去昨日巩固
        </button>
      </div>
    </div>

    <div v-else-if="done" class="card">
      <p>本组结束。对 {{ right }} · 错 {{ wrong }}。</p>
      <p class="page-sub">默写不改间隔；想加深记忆可继续背今日词。</p>
      <div class="grid2" style="margin-top: 12px">
        <button class="btn primary" type="button" @click="goVocab">去今日背词</button>
        <button class="btn ghost" type="button" @click="router.replace('/')">回首页</button>
      </div>
    </div>

    <template v-else-if="current">
      <p class="muted">{{ idx + 1 }} / {{ queue.length }}</p>
      <div class="flash-wrap">
        <SpeakWordButton v-if="revealed" class="flash-speak" :text="current.word" />
        <div class="flash">
          <p class="pos">{{ current.pos }}</p>
          <p class="meaning">{{ current.meaning }}</p>
          <p class="page-sub">根据释义默写英文单词</p>
          <p v-if="revealed && ok" class="feedback right">正确</p>
          <p v-else-if="revealed && ok === false" class="feedback wrong">
            正确答案：{{ current.word }}
          </p>
        </div>
      </div>
      <form class="dict-form" @submit.prevent="submit">
        <input
          ref="inputEl"
          v-model="input"
          class="dict-input"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :disabled="revealed"
          placeholder="输入英文单词"
        />
        <button class="btn primary block" type="submit" :disabled="revealed || !input.trim()">
          提交
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.flash-wrap {
  position: relative;
  margin: 10px 0 12px;
}
.flash-speak {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
}
.flash {
  width: 100%;
  min-height: 160px;
  border: 1px solid var(--line);
  background: var(--paper-2);
  border-radius: 20px;
  padding: 28px 18px;
  text-align: left;
  box-sizing: border-box;
}
.pos {
  color: var(--ink-soft);
  margin-bottom: 8px;
}
.meaning {
  font-family: var(--serif);
  font-size: 22px;
  line-height: 1.45;
}
.feedback {
  margin-top: 14px;
  font-weight: 600;
}
.feedback.right {
  color: var(--green, #1a7f4b);
}
.feedback.wrong {
  color: var(--danger, #b42318);
}
.dict-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dict-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 18px;
  background: var(--paper);
  color: var(--ink);
}
.dict-input:disabled {
  opacity: 0.7;
}
</style>
