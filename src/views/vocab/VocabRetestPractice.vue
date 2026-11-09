<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import SpeakWordButton from '@/components/SpeakWordButton.vue'
import { getAllVocab } from '@/data/vocab'
import { buildVocabMeaningQuiz, fetchVocabByIds } from '@/services/bank'
import { useStudyStore } from '@/stores/study'
import type { VocabWord } from '@/types'

const router = useRouter()
const route = useRoute()
const study = useStudyStore()

const scopeYesterday = computed(() => String(route.query.scope || '') === 'yesterday')
const queue = ref<VocabWord[]>([])
const pool = ref<VocabWord[]>([])
const loading = ref(true)
const idx = ref(0)
const done = ref(false)
const picked = ref<number | null>(null)
const revealed = ref(false)
const right = ref(0)
const wrong = ref(0)

const current = computed(() => queue.value[idx.value])
const quiz = computed(() => {
  const w = current.value
  if (!w) return null
  return buildVocabMeaningQuiz(w, pool.value.length ? pool.value : queue.value)
})

async function load() {
  loading.value = true
  done.value = false
  idx.value = 0
  picked.value = null
  revealed.value = false
  right.value = 0
  wrong.value = 0
  const ids = scopeYesterday.value ? study.yesterdayRetestWordIds : study.retestWordIds
  const [items, all] = await Promise.all([fetchVocabByIds(ids), getAllVocab()])
  queue.value = items.slice(0, 8)
  pool.value = all
  loading.value = false
  if (!queue.value.length) done.value = true
}

onMounted(load)

function choose(oi: number) {
  if (!current.value || !quiz.value || revealed.value) return
  picked.value = oi
  revealed.value = true
  const ok = oi === quiz.value.answerIndex
  study.answerRetest(current.value.id, ok)
  if (ok) {
    right.value += 1
    if (scopeYesterday.value) study.enqueueDictation(current.value.id)
  } else {
    wrong.value += 1
  }
  window.setTimeout(() => {
    picked.value = null
    revealed.value = false
    if (idx.value + 1 >= queue.value.length) {
      done.value = true
      if (scopeYesterday.value) study.completeTask('yesterday-retest')
    } else {
      idx.value += 1
    }
  }, 650)
}

const canDictation = computed(
  () => scopeYesterday.value && study.dictationWordIds.length > 0,
)
</script>

<template>
  <div class="page full">
    <PageHeader
      :title="scopeYesterday ? '昨日巩固' : '复测'"
      :subtle="scopeYesterday ? '验证昨天记住的词' : '四选一 · 选正确释义'"
      @back="router.back()"
    />

    <div v-if="loading" class="card"><p>正在出题…</p></div>

    <div v-else-if="!current || done" class="card">
      <template v-if="!queue.length && !right && !wrong">
        <p>{{ scopeYesterday ? '昨日暂无待巩固的词。' : '复测本是空的。' }}</p>
        <p class="page-sub">先去背词点「记住了」，词会进入复测本。</p>
      </template>
      <template v-else>
        <p>本组结束。对 {{ right }} · 错 {{ wrong }}。</p>
        <p v-if="scopeYesterday" class="page-sub">答对的词会记入今日默写；答错的明天还会到期。</p>
        <p v-else class="page-sub">答对仍留在复测本（已记住）；答错会离开复测本并进入错词本。</p>
      </template>
      <div v-if="canDictation" class="end-actions">
        <button class="btn primary block" type="button" @click="router.replace('/train/vocab-dictation')">
          去默写巩固好的词（{{ study.dictationWordIds.length }}）
        </button>
        <div class="grid2">
          <button class="btn ghost" type="button" @click="load">再测一组</button>
          <button class="btn ghost" type="button" @click="router.replace('/')">返回</button>
        </div>
      </div>
      <div v-else class="end-actions">
        <div class="grid2">
          <button class="btn primary" type="button" @click="load">再测一组</button>
          <button
            class="btn ghost"
            type="button"
            @click="router.replace(scopeYesterday ? '/' : '/vocab/retest')"
          >
            返回
          </button>
        </div>
        <button
          v-if="scopeYesterday"
          class="btn ghost block"
          type="button"
          @click="router.replace('/train/vocab')"
        >
          去今日背词
        </button>
      </div>
    </div>

    <template v-else-if="quiz">
      <p class="muted">{{ idx + 1 }} / {{ queue.length }}</p>
      <div class="flash-wrap">
        <SpeakWordButton class="flash-speak" :text="current.word" />
        <div class="flash">
          <p class="word">{{ current.word }}</p>
          <p class="phon">{{ current.phonetic }} {{ current.pos }}</p>
          <p class="page-sub">请选择正确的中文释义</p>
        </div>
      </div>
      <button
        v-for="(o, oi) in quiz.options"
        :key="`${current.id}-${oi}-${o}`"
        class="option"
        :class="{
          on: picked === oi && !revealed,
          right: revealed && oi === quiz.answerIndex,
          wrong: revealed && picked === oi && oi !== quiz.answerIndex,
        }"
        type="button"
        @click="choose(oi)"
      >
        {{ o }}
      </button>
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
  min-height: 140px;
  border: 1px solid var(--line);
  background: var(--paper-2);
  border-radius: 20px;
  padding: 28px 18px;
  text-align: left;
  box-sizing: border-box;
}
.word {
  font-family: var(--serif);
  font-size: 32px;
}
.phon {
  color: var(--ink-soft);
  margin: 6px 0 12px;
}
.end-actions {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
