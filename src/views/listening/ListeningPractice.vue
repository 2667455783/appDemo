<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import TimerBar from '@/components/TimerBar.vue'
import { fetchListening } from '@/services/bank'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'
import { speakEnglish, stopSpeak } from '@/utils/audio'
import type { ListeningItem } from '@/types'

const router = useRouter()
const study = useStudyStore()
const user = useUserStore()

const item = ref<ListeningItem | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  phase.value = 'preread'
  picks.value = []
  revealed.value = false
  dictation.value = ''
  dictationOk.value = null
  item.value = await fetchListening({ level: user.level, random: true })
  loading.value = false
}

onMounted(load)

const phase = ref<'preread' | 'play' | 'quiz' | 'dictation' | 'result'>('preread')
const rate = ref(0.88)
const playing = ref(false)
const picks = ref<(number | null)[]>([])
const revealed = ref(false)
const dictation = ref('')
const dictationOk = ref<boolean | null>(null)

const blank = computed(() => item.value?.blanks[0])
const blankSentence = computed(() => {
  if (!item.value) return ''
  const s = item.value.sentences[blank.value?.sentenceIndex ?? 0] ?? ''
  const ans = blank.value?.answer ?? ''
  return s.replace(new RegExp(ans, 'i'), '______')
})

const cur = computed(() => item.value!)

function startPlay() {
  phase.value = 'play'
  playAll()
}

async function playAll() {
  if (!item.value) return
  playing.value = true
  await speakEnglish(item.value.audioText, rate.value)
  playing.value = false
}

async function playSentence(i: number) {
  if (!item.value) return
  playing.value = true
  await speakEnglish(item.value.sentences[i] ?? '', rate.value)
  playing.value = false
}

function toQuiz() {
  if (!item.value) return
  stopSpeak()
  picks.value = item.value.questions.map(() => null)
  phase.value = 'quiz'
}

function choose(qi: number, oi: number) {
  if (revealed.value) return
  const next = [...picks.value]
  next[qi] = oi
  picks.value = next
}

function submitQuiz() {
  if (!item.value) return
  revealed.value = true
  item.value.questions.forEach((q, i) => {
    const pick = picks.value[i]
    if (pick !== q.answer) {
      study.recordPracticeError({
        skill: 'listening',
        subtype: item.value!.kind,
        question: q.stem,
        userAnswer: pick == null ? '空白' : q.options[pick] ?? '',
        correctAnswer: q.options[q.answer] ?? '',
        analysis: q.analysis,
        cause: q.cause,
      })
    }
  })
  study.completeTask('listen')
  study.completeTask('final-listen')
  study.boostRadar('listenDetail', 2)
  user.markStudy()
}

function checkDictation() {
  const ans = (blank.value?.answer ?? '').toLowerCase()
  dictationOk.value = dictation.value.trim().toLowerCase() === ans
  if (dictationOk.value) study.boostRadar('listenMain', 3)
}

onBeforeUnmount(() => stopSpeak())
</script>

<template>
  <div class="page full">
    <div v-if="loading" class="card">
      <p>正在从题库拉取听力…</p>
    </div>
    <template v-else>
    <PageHeader :title="cur.title" :subtle="cur.kind === 'news' ? '新闻短篇 · 先预读选项' : cur.kind === 'lecture' ? '讲座 · 抓主旨与态度' : '长对话 · 抓冲突与决定'" @back="router.back()" />

    <div v-if="phase === 'preread'" class="stack">
      <div class="card">
        <div class="row space">
          <p>听前读选项</p>
          <TimerBar :seconds="cur.preReadSec" @done="startPlay" />
        </div>
        <p class="page-sub">还原考场：先看题干和选项里的数字、态度词。</p>
      </div>
      <div v-for="q in cur.questions" :key="q.id" class="card">
        <p>{{ q.stem }}</p>
        <p v-for="o in q.options" :key="o" class="page-sub">{{ o }}</p>
      </div>
      <button class="btn primary block" type="button" @click="startPlay">预读完，播放</button>
    </div>

    <div v-else-if="phase === 'play'" class="stack">
      <div class="chips">
        <button class="chip" :class="{ on: rate === 0.8 }" type="button" @click="rate = 0.8">0.8x</button>
        <button class="chip" :class="{ on: rate === 0.88 }" type="button" @click="rate = 0.88">1.0x</button>
        <button class="chip" :class="{ on: rate === 1.15 }" type="button" @click="rate = 1.15">1.2x</button>
      </div>
      <button class="btn primary block" type="button" :disabled="playing" @click="playAll">
        {{ playing ? '播放中…' : '播放全文（演示语音）' }}
      </button>
      <p class="muted">本页为扩展练习：系统语音朗读原创样稿，非考试原声。</p>
      <button class="btn ghost block" type="button" @click="toQuiz">去答题</button>
    </div>

    <div v-else-if="phase === 'quiz'" class="stack">
      <div v-for="(q, qi) in cur.questions" :key="q.id">
        <p style="font-weight: 700; margin-bottom: 8px">{{ q.stem }}</p>
        <button
          v-for="(o, oi) in q.options"
          :key="o"
          class="option"
          :class="{
            on: picks[qi] === oi && !revealed,
            right: revealed && oi === q.answer,
            wrong: revealed && picks[qi] === oi && oi !== q.answer,
          }"
          type="button"
          @click="choose(qi, oi)"
        >
          {{ o }}
        </button>
        <p v-if="revealed" class="page-sub" style="margin-top: 6px">{{ q.analysis }}</p>
      </div>
      <button v-if="!revealed" class="btn primary block" type="button" @click="submitQuiz">交卷</button>
      <button v-else class="btn gold block" type="button" @click="phase = 'dictation'">去精听填空</button>
    </div>

    <div v-else class="stack">
      <p class="muted">逐句精听</p>
      <button
        v-for="(s, i) in cur.sentences"
        :key="s"
        class="option"
        type="button"
        @click="playSentence(i)"
      >
        第 {{ i + 1 }} 句
      </button>
      <div class="field">
        <label>{{ blankSentence }}</label>
        <input v-model="dictation" placeholder="填所缺词" />
      </div>
      <button class="btn primary block" type="button" @click="checkDictation">核对</button>
      <p v-if="dictationOk === true" class="page-sub">正确。</p>
      <p v-else-if="dictationOk === false" class="page-sub">答案是 {{ blank?.answer }}。</p>
      <button class="btn ghost block" type="button" @click="router.replace('/diagnosis/errors')">去错题本</button>
    </div>
    </template>
  </div>
</template>
