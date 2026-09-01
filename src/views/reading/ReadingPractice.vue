<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { CAREFUL_ITEMS, CLOZE_ITEMS, MATCH_ITEMS } from '@/data/reading'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'
import type { ReadingKind } from '@/types'

const route = useRoute()
const router = useRouter()
const study = useStudyStore()
const user = useUserStore()
const kind = computed(() => route.params.kind as ReadingKind)

const cloze = CLOZE_ITEMS[0]!
const match = MATCH_ITEMS[0]!
const careful = CAREFUL_ITEMS[0]!

const clozePicks = ref<(string | null)[]>(Array.from({ length: cloze.blanks }, () => null))
const matchPicks = ref<Record<string, string>>({})
const carefulPicks = ref<(number | null)[]>(careful.questions.map(() => null))
const revealed = ref(false)
const started = ref(Date.now())
const wpm = ref(0)

watch(kind, () => {
  revealed.value = false
  started.value = Date.now()
  clozePicks.value = Array.from({ length: cloze.blanks }, () => null)
  matchPicks.value = {}
  carefulPicks.value = careful.questions.map(() => null)
})

const clozeParts = computed(() => cloze.passage.split(/__\d__/))

function useBankWord(word: string) {
  if (revealed.value) return
  if (clozePicks.value.includes(word)) return
  const empty = clozePicks.value.findIndex((x) => !x)
  if (empty < 0) return
  const next = [...clozePicks.value]
  next[empty] = word
  clozePicks.value = next
}

function clearBlank(i: number) {
  if (revealed.value) return
  const next = [...clozePicks.value]
  next[i] = null
  clozePicks.value = next
}

function submitCloze() {
  revealed.value = true
  cloze.answers.forEach((ans, i) => {
    if (clozePicks.value[i] !== ans) {
      study.recordPracticeError({
        skill: 'reading',
        subtype: 'cloze',
        question: `空 ${i + 1}`,
        userAnswer: clozePicks.value[i] ?? '空白',
        correctAnswer: ans,
        analysis: cloze.analysis[i] ?? '',
        cause: 'vocab',
      })
    }
  })
  finishRead()
}

function submitMatch() {
  revealed.value = true
  match.statements.forEach((s) => {
    const pick = matchPicks.value[s.id]
    if (pick !== s.answer) {
      study.recordPracticeError({
        skill: 'reading',
        subtype: 'match',
        question: s.text,
        userAnswer: pick ?? '空白',
        correctAnswer: s.answer,
        analysis: s.analysis,
        cause: 'locate',
      })
    }
  })
  finishRead()
}

function submitCareful() {
  revealed.value = true
  careful.questions.forEach((q, i) => {
    const pick = carefulPicks.value[i]
    if (pick !== q.answer) {
      study.recordPracticeError({
        skill: 'reading',
        subtype: 'careful',
        question: q.stem,
        userAnswer: pick == null ? '空白' : q.options[pick] ?? '',
        correctAnswer: q.options[q.answer] ?? '',
        analysis: q.analysis,
        cause: q.cause,
      })
    }
  })
  finishRead()
}

function finishRead() {
  const mins = Math.max(0.4, (Date.now() - started.value) / 60000)
  const words = (careful.passage + cloze.passage).split(/\s+/).length
  wpm.value = Math.round(words / mins)
  study.completeTask('read')
  study.boostRadar('readLocate', 2)
  user.markStudy()
}

const title = computed(() => {
  if (kind.value === 'cloze') return cloze.title
  if (kind.value === 'match') return match.title
  return careful.title
})
</script>

<template>
  <div class="page full">
    <PageHeader :title="title" subtle="交卷后才给解析" @back="router.back()" />

    <template v-if="kind === 'cloze'">
      <p class="passage">
        <template v-for="(part, i) in clozeParts" :key="i">
          {{ part }}
          <button v-if="i < cloze.blanks" class="blank" type="button" @click="clearBlank(i)">
            {{ clozePicks[i] ?? i + 1 }}
          </button>
        </template>
      </p>
      <p class="section-h">词库</p>
      <div class="word-bank">
        <button
          v-for="w in cloze.bank"
          :key="w"
          type="button"
          :class="{ used: clozePicks.includes(w) }"
          @click="useBankWord(w)"
        >
          {{ w }}
        </button>
      </div>
      <button v-if="!revealed" class="btn primary block" style="margin-top: 16px" type="button" @click="submitCloze">交卷</button>
      <div v-else class="card" style="margin-top: 12px">
        <p v-for="(a, i) in cloze.answers" :key="a">空{{ i + 1 }} {{ clozePicks[i] === a ? '✓' : '✗' }} {{ a }} · {{ cloze.analysis[i] }}</p>
      </div>
    </template>

    <template v-else-if="kind === 'match'">
      <div v-for="p in match.paragraphs" :key="p.key" class="card">
        <p><b>{{ p.key }}.</b> {{ p.text }}</p>
      </div>
      <div v-for="s in match.statements" :key="s.id" class="card">
        <p>{{ s.text }}</p>
        <div class="chips" style="margin-top: 8px">
          <button
            v-for="p in match.paragraphs"
            :key="p.key"
            class="chip"
            :class="{
              on: matchPicks[s.id] === p.key,
              right: revealed && p.key === s.answer,
            }"
            type="button"
            @click="matchPicks[s.id] = p.key"
          >
            {{ p.key }}
          </button>
        </div>
        <p v-if="revealed" class="page-sub">{{ s.analysis }}</p>
      </div>
      <button v-if="!revealed" class="btn primary block" type="button" @click="submitMatch">交卷</button>
    </template>

    <template v-else>
      <p class="passage">{{ careful.passage }}</p>
      <div v-for="(q, qi) in careful.questions" :key="q.id" style="margin-top: 14px">
        <p style="font-weight: 700; margin-bottom: 8px">{{ q.stem }}</p>
        <button
          v-for="(o, oi) in q.options"
          :key="o"
          class="option"
          :class="{
            on: carefulPicks[qi] === oi && !revealed,
            right: revealed && oi === q.answer,
            wrong: revealed && carefulPicks[qi] === oi && oi !== q.answer,
          }"
          type="button"
          @click="carefulPicks[qi] = oi"
        >
          {{ o }}
        </button>
        <p v-if="revealed" class="page-sub" style="margin-top: 6px">{{ q.analysis }}</p>
      </div>
      <button v-if="!revealed" class="btn primary block" style="margin-top: 12px" type="button" @click="submitCareful">交卷</button>
    </template>

    <p v-if="revealed && wpm" class="muted" style="margin-top: 12px">本次阅读速度约 {{ wpm }} WPM（演示估算）。正确率低时不要盲目提速。</p>
  </div>
</template>

<style scoped>
.chip.right {
  background: var(--moss);
  border-color: var(--forest);
}
</style>
