<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import TimerBar from '@/components/TimerBar.vue'
import { getPaper } from '@/data/mockExam'
import { useStudyStore } from '@/stores/study'
import { speakEnglish, stopSpeak } from '@/utils/audio'
import { gradeMock } from '@/utils/score'
import type { MockAnswers } from '@/types'

const route = useRoute()
const router = useRouter()
const study = useStudyStore()
const paper = computed(() => getPaper(String(route.params.id)))

const section = ref(0)
const timedMode = ref<'demo' | 'full'>('demo')
const started = ref(false)
const answers = reactive<MockAnswers>({
  writing: '',
  writingChecks: [],
  listening: [],
  cloze: [],
  careful: [],
  translation: '',
})
const clozePicks = ref<(string | null)[]>([])
const playing = ref(false)

const demoSeconds = [180, 90, 240, 120]
const fullSeconds = [30 * 60, 8 * 60, 25 * 60, 15 * 60]
const sectionSec = computed(() => (timedMode.value === 'demo' ? demoSeconds : fullSeconds)[section.value] ?? 180)
const names = ['写作', '听力', '阅读', '翻译']

function begin() {
  if (!paper.value) return
  answers.writingChecks = paper.value.writing.rubric.map(() => false)
  answers.listening = paper.value.listening.questions.map(() => null)
  answers.cloze = paper.value.cloze.answers.map(() => null)
  answers.careful = paper.value.careful.questions.map(() => null)
  clozePicks.value = paper.value.cloze.answers.map(() => null)
  started.value = true
  section.value = 0
}

const clozeParts = computed(() => paper.value?.cloze.passage.split(/__\d__/) ?? [])

function useWord(word: string) {
  if (clozePicks.value.includes(word)) return
  const empty = clozePicks.value.findIndex((x) => !x)
  if (empty < 0) return
  const next = [...clozePicks.value]
  next[empty] = word
  clozePicks.value = next
  answers.cloze = next
}

async function playListen() {
  if (!paper.value) return
  playing.value = true
  await speakEnglish(paper.value.listening.audioText, 0.9)
  playing.value = false
}

function nextSection() {
  stopSpeak()
  if (section.value < 3) section.value += 1
  else submit()
}

function submit() {
  if (!paper.value) return
  answers.cloze = clozePicks.value
  const report = gradeMock(paper.value, answers)
  paper.value.listening.questions.forEach((q, i) => {
    if (answers.listening[i] !== q.answer) {
      study.pushError({
        source: 'mock',
        paperId: paper.value!.id,
        skill: 'listening',
        question: q.stem,
        userAnswer: answers.listening[i] == null ? '空白' : q.options[answers.listening[i]!] ?? '',
        correctAnswer: q.options[q.answer] ?? '',
        analysis: q.analysis,
        cause: answers.listening[i] == null ? 'time' : q.cause,
      })
    }
  })
  paper.value.cloze.answers.forEach((ans, i) => {
    if (clozePicks.value[i] !== ans) {
      study.pushError({
        source: 'mock',
        paperId: paper.value!.id,
        skill: 'reading',
        subtype: 'cloze',
        question: `${paper.value!.cloze.title} 空${i + 1}`,
        userAnswer: clozePicks.value[i] ?? '空白',
        correctAnswer: ans,
        analysis: paper.value!.cloze.analysis[i] ?? '',
        cause: 'vocab',
      })
    }
  })
  paper.value.careful.questions.forEach((q, i) => {
    if (answers.careful[i] !== q.answer) {
      study.pushError({
        source: 'mock',
        paperId: paper.value!.id,
        skill: 'reading',
        subtype: 'careful',
        question: q.stem,
        userAnswer: answers.careful[i] == null ? '空白' : q.options[answers.careful[i]!] ?? '',
        correctAnswer: q.options[q.answer] ?? '',
        analysis: q.analysis,
        cause: answers.careful[i] == null ? 'time' : q.cause,
      })
    }
  })
  study.addReport(report)
  router.replace(`/mock/${paper.value.id}/report`)
}

onBeforeUnmount(() => stopSpeak())
</script>

<template>
  <div class="page full">
    <PageHeader v-if="paper" :title="paper.title" :subtle="started ? `第 ${section + 1}/4 部分 · ${names[section]}` : '交卷后出诊断，未答计入空白失分'" @back="router.back()" />
    <p v-else>试卷不存在。</p>

    <template v-if="paper && !started">
      <div class="card">
        <p>时间轴：写作 → 听力 → 阅读 → 翻译。听力播放中请勿回看写作。</p>
        <p class="page-sub">演示模式缩短各部分时长，便于走通闭环；正式计时接近考场。</p>
      </div>
      <div class="chips" style="margin: 12px 0">
        <button class="chip" :class="{ on: timedMode === 'demo' }" type="button" @click="timedMode = 'demo'">缩短演示</button>
        <button class="chip" :class="{ on: timedMode === 'full' }" type="button" @click="timedMode = 'full'">正式计时</button>
      </div>
      <button class="btn primary block" type="button" @click="begin">开始</button>
    </template>

    <template v-else-if="paper && started">
      <div class="row space" style="margin-bottom: 10px">
        <span class="tag">{{ names[section] }}</span>
        <TimerBar :seconds="sectionSec" :key="section + timedMode" @done="nextSection" />
      </div>

      <div v-if="section === 0" class="stack">
        <p class="passage">{{ paper.writing.prompt }}</p>
        <div class="field">
          <label>作文</label>
          <textarea v-model="answers.writing" placeholder="交卷前可先写。到时自动进入下一部分。" />
        </div>
        <p class="muted">自检将在报告页勾选，计入写作成绩。</p>
      </div>

      <div v-else-if="section === 1" class="stack">
        <button class="btn primary block" type="button" :disabled="playing" @click="playListen">
          {{ playing ? '播放中…' : '播放听力（演示语音）' }}
        </button>
        <div v-for="(q, qi) in paper.listening.questions" :key="q.id">
          <p style="font-weight: 700; margin: 8px 0">{{ q.stem }}</p>
          <button
            v-for="(o, oi) in q.options"
            :key="o"
            class="option"
            :class="{ on: answers.listening[qi] === oi }"
            type="button"
            @click="answers.listening[qi] = oi"
          >
            {{ o }}
          </button>
        </div>
      </div>

      <div v-else-if="section === 2" class="stack">
        <p class="muted">选词填空</p>
        <p class="passage">
          <template v-for="(part, i) in clozeParts" :key="i">
            {{ part }}
            <span v-if="i < paper.cloze.blanks" class="blank">{{ clozePicks[i] ?? i + 1 }}</span>
          </template>
        </p>
        <div class="word-bank">
          <button
            v-for="w in paper.cloze.bank"
            :key="w"
            type="button"
            :class="{ used: clozePicks.includes(w) }"
            @click="useWord(w)"
          >
            {{ w }}
          </button>
        </div>
        <p class="muted">仔细阅读</p>
        <p class="passage">{{ paper.careful.passage }}</p>
        <div v-for="(q, qi) in paper.careful.questions" :key="q.id">
          <p style="font-weight: 700; margin: 8px 0">{{ q.stem }}</p>
          <button
            v-for="(o, oi) in q.options"
            :key="o"
            class="option"
            :class="{ on: answers.careful[qi] === oi }"
            type="button"
            @click="answers.careful[qi] = oi"
          >
            {{ o }}
          </button>
        </div>
      </div>

      <div v-else class="stack">
        <p class="passage">{{ paper.translation.source }}</p>
        <div class="field">
          <label>译文</label>
          <textarea v-model="answers.translation" />
        </div>
      </div>

      <button class="btn gold block" style="margin-top: 16px" type="button" @click="nextSection">
        {{ section < 3 ? '下一部分' : '交卷出报告' }}
      </button>
    </template>
  </div>
</template>
