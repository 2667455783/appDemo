<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import TimerBar from '@/components/TimerBar.vue'
import { getTemplate } from '@/data/templates'
import { WRITING_TOPICS } from '@/data/writing'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()

const topics = computed(() => {
  const list = WRITING_TOPICS.filter((t) => t.level === user.level || t.id.startsWith('w-sim-'))
  return list.length ? list : WRITING_TOPICS
})

const topicId = ref(topics.value[0]?.id ?? '')
const topic = computed(() => topics.value.find((t) => t.id === topicId.value) ?? topics.value[0]!)
const linkedTemplate = computed(() => (topic.value.templateId ? getTemplate(topic.value.templateId) : undefined))

watch(topics, (list) => {
  if (!list.some((t) => t.id === topicId.value)) {
    topicId.value = list[0]?.id ?? ''
  }
})

const mode = ref<'write' | 'review'>('write')
const draft = ref('')
const outline = ref<string[]>([])
const checks = ref<boolean[]>([])
const timed = ref(false)
const demoSec = 8 * 60

function pickTopic(id: string) {
  topicId.value = id
  mode.value = 'write'
  draft.value = ''
  outline.value = []
  checks.value = []
  timed.value = false
}

function startTimed() {
  timed.value = true
}

function setOutline(i: number, v: string) {
  const next = [...outline.value]
  next[i] = v
  outline.value = next
}

function submit() {
  checks.value = topic.value.rubric.map(() => false)
  mode.value = 'review'
  user.markStudy()
  if (!draft.value.trim() && outline.value.every((x) => !x)) {
    study.recordPracticeError({
      skill: 'writing',
      question: topic.value.title,
      userAnswer: '空白',
      correctAnswer: '完整提纲或成稿',
      analysis: '写作空白计失分。先填四段脚手架。',
      cause: 'time',
    })
  }
}

function toggleCheck(i: number) {
  const next = [...checks.value]
  next[i] = !next[i]
  checks.value = next
}

function shortTitle(title: string) {
  return title.replace(/^模拟\d+：/, '').replace(/^(议论文|应用文|名言评述|图表作文)：/, '')
}
</script>

<template>
  <div class="page full">
    <PageHeader :title="topic.title" subtle="限时 30 分钟；演示可用缩短计时" @back="router.back()" />

    <div class="topic-list">
      <button
        v-for="t in topics"
        :key="t.id"
        class="chip"
        :class="{ on: t.id === topic.id }"
        type="button"
        @click="pickTopic(t.id)"
      >
        {{ shortTitle(t.title) }}
      </button>
    </div>

    <p v-if="linkedTemplate" class="page-sub tpl-link">
      套用模板：{{ linkedTemplate.title }}
      <button class="btn sm ghost" type="button" @click="router.push('/train/templates')">去模板管理</button>
    </p>

    <template v-if="mode === 'write'">
      <p class="passage">{{ topic.prompt }}</p>
      <div class="row space" style="margin: 12px 0">
        <button class="btn sm ghost" type="button" @click="startTimed">开始计时（演示 8 分钟）</button>
        <TimerBar v-if="timed" :seconds="demoSec" />
      </div>
      <p class="section-h">结构脚手架</p>
      <div v-for="(s, i) in topic.scaffold" :key="s.label" class="field" style="margin-bottom: 10px">
        <label>{{ s.label }} · {{ s.hint }}</label>
        <input :value="outline[i]" :placeholder="s.label" @input="setOutline(i, ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="field">
        <label>成稿（可后写）</label>
        <textarea v-model="draft" placeholder="至少 120 词。交卷后才给范文。" />
      </div>
      <button class="btn primary block" type="button" @click="submit">交卷对照范文</button>
    </template>

    <template v-else>
      <p class="section-h">范文</p>
      <p class="passage sample">{{ topic.sample }}</p>
      <p class="section-h">自检表</p>
      <button
        v-for="(r, i) in topic.rubric"
        :key="r"
        class="option"
        :class="{ on: checks[i] }"
        type="button"
        @click="toggleCheck(i)"
      >
        {{ r }}
      </button>
      <p class="page-sub" style="margin-top: 10px">一期不做 AI 批改。勾完自检即回写「表达模板」弱项。</p>
      <button class="btn ghost block" style="margin-top: 12px" type="button" @click="router.replace('/')">完成</button>
    </template>
  </div>
</template>

<style scoped>
.topic-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
}
.tpl-link {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
}
.sample {
  white-space: pre-line;
}
</style>
