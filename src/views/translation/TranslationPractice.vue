<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { TRANS_ITEMS } from '@/data/translation'
import { TRANS_KIND_LABEL, type TransKind } from '@/types'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()

const kind = ref<TransKind>('underline')

const pool = computed(() => {
  const byKind = TRANS_ITEMS.filter((t) => (t.kind ?? 'zh2en') === kind.value)
  if (kind.value === 'zh2en') {
    const leveled = byKind.filter((t) => t.level === user.level)
    return leveled.length ? leveled : byKind
  }
  return byKind
})

const itemId = ref(pool.value[0]?.id ?? '')
const item = computed(() => pool.value.find((t) => t.id === itemId.value) ?? pool.value[0]!)

const step = ref<'split' | 'write' | 'result'>('write')
const picked = ref<string[]>([])
const draft = ref('')
const sentenceDrafts = ref<string[]>([])

function reset() {
  step.value = (item.value?.kind ?? 'zh2en') === 'zh2en' ? 'split' : 'write'
  picked.value = []
  draft.value = ''
  sentenceDrafts.value = (item.value?.sentences ?? []).map(() => '')
}

watch(
  [kind, pool],
  () => {
    if (!pool.value.some((t) => t.id === itemId.value)) {
      itemId.value = pool.value[0]?.id ?? ''
    }
    reset()
  },
  { immediate: true },
)

function pickItem(id: string) {
  itemId.value = id
  reset()
}

function setSentence(i: number, v: string) {
  const next = [...sentenceDrafts.value]
  next[i] = v
  sentenceDrafts.value = next
}

function toggleChunk(en: string) {
  if (picked.value.includes(en)) picked.value = picked.value.filter((x) => x !== en)
  else picked.value = [...picked.value, en]
}

function toWrite() {
  step.value = 'write'
}

function isBlank() {
  const k = item.value.kind ?? 'zh2en'
  if (k === 'underline') return sentenceDrafts.value.every((x) => !x.trim())
  return !draft.value.trim()
}

function submit() {
  step.value = 'result'
  user.markStudy()
  study.boostRadar('transCulture', 3)
  if (isBlank()) {
    study.recordPracticeError({
      skill: 'translation',
      question: (item.value.title ?? item.value.source).slice(0, 24) + '…',
      userAnswer: '空白',
      correctAnswer: item.value.sample,
      analysis: '先读清题目要求，再写完整译文。',
      cause: 'time',
    })
  }
}

const subtle = computed(() => {
  const k = item.value?.kind ?? 'zh2en'
  if (k === 'underline') return '只翻译【】内句子 · 英译汉'
  if (k === 'paragraph') return '整篇翻译 · 建议 20–25 分钟'
  return '先拆中文意群，再选英文句式'
})

const shortTitle = (title?: string, fallback?: string) =>
  (title ?? fallback ?? '').replace(/^(划线句|整段|汉译英)\s*/, '')
</script>

<template>
  <div class="page full">
    <PageHeader :title="item?.title ?? '翻译'" :subtle="subtle" @back="router.back()" />

    <div class="chips" style="margin-bottom: 10px">
      <button
        v-for="(label, key) in TRANS_KIND_LABEL"
        :key="key"
        class="chip"
        :class="{ on: kind === key }"
        type="button"
        @click="kind = key as TransKind"
      >
        {{ label }}
      </button>
    </div>

    <div class="topic-list">
      <button
        v-for="t in pool"
        :key="t.id"
        class="chip"
        :class="{ on: t.id === item?.id }"
        type="button"
        @click="pickItem(t.id)"
      >
        {{ shortTitle(t.title, t.id) }}
      </button>
    </div>

    <p v-if="!item" class="page-sub">该分类暂无题目。</p>

    <template v-else-if="(item.kind ?? 'zh2en') === 'zh2en'">
      <p class="passage">{{ item.source }}</p>
      <p class="section-h">文化词</p>
      <div class="chips">
        <span v-for="c in item.culture" :key="c.term" class="tag">{{ c.term }} · {{ c.en }}</span>
      </div>

      <template v-if="step === 'split'">
        <p class="section-h">点选意群（顺序即你的句子骨架）</p>
        <div class="chips">
          <button
            v-for="c in item.chunks"
            :key="c.en"
            class="chip"
            :class="{ on: picked.includes(c.en) }"
            type="button"
            @click="toggleChunk(c.en)"
          >
            {{ c.cn }}
          </button>
        </div>
        <p class="page-sub" style="margin-top: 10px">{{ picked.join(' / ') || '尚未选择' }}</p>
        <button class="btn primary block" style="margin-top: 14px" type="button" @click="toWrite">去写译文</button>
      </template>

      <template v-else-if="step === 'write'">
        <p class="section-h">提示</p>
        <p v-for="t in item.tips" :key="t" class="page-sub">· {{ t }}</p>
        <div class="field" style="margin-top: 12px">
          <label>译文（英）</label>
          <textarea v-model="draft" />
        </div>
        <button class="btn primary block" type="button" @click="submit">对照参考译文</button>
      </template>

      <template v-else>
        <p class="section-h">参考译文</p>
        <p class="passage sample">{{ item.sample }}</p>
        <p class="section-h">你的译文</p>
        <p class="passage">{{ draft || '（空白）' }}</p>
        <button class="btn ghost block" style="margin-top: 12px" type="button" @click="router.replace('/')">完成</button>
      </template>
    </template>

    <template v-else-if="item.kind === 'underline'">
      <p class="passage">{{ item.source }}</p>
      <p class="page-sub" style="margin: 8px 0">只翻译文中【】内的句子。</p>

      <template v-if="step === 'write'">
        <p class="section-h">逐句翻译</p>
        <div v-for="(s, i) in item.sentences" :key="s.no" class="field" style="margin-bottom: 10px">
          <label>{{ s.no }}. {{ s.en }}</label>
          <input
            :value="sentenceDrafts[i]"
            :placeholder="`译文 ${s.no}`"
            @input="setSentence(i, ($event.target as HTMLInputElement).value)"
          />
        </div>
        <p v-for="t in item.tips" :key="t" class="page-sub">· {{ t }}</p>
        <button class="btn primary block" style="margin-top: 12px" type="button" @click="submit">对照参考译文</button>
      </template>

      <template v-else>
        <p class="section-h">参考译文</p>
        <div v-for="s in item.sentences" :key="s.no" class="card" style="margin-top: 8px">
          <p class="page-sub">{{ s.no }}. {{ s.en }}</p>
          <p style="margin-top: 6px">{{ s.cn }}</p>
          <p class="page-sub" style="margin-top: 6px">你的：{{ sentenceDrafts[s.no - 1]?.trim() || '（空白）' }}</p>
        </div>
        <button class="btn ghost block" style="margin-top: 12px" type="button" @click="router.replace('/')">完成</button>
      </template>
    </template>

    <template v-else>
      <p class="passage">{{ item.source }}</p>

      <template v-if="step === 'write'">
        <p class="section-h">提示</p>
        <p v-for="t in item.tips" :key="t" class="page-sub">· {{ t }}</p>
        <div class="field" style="margin-top: 12px">
          <label>译文（中）</label>
          <textarea v-model="draft" placeholder="把整段译成中文" />
        </div>
        <button class="btn primary block" type="button" @click="submit">对照参考译文</button>
      </template>

      <template v-else>
        <p class="section-h">参考译文</p>
        <p class="passage sample">{{ item.sample }}</p>
        <p class="section-h">你的译文</p>
        <p class="passage sample">{{ draft || '（空白）' }}</p>
        <button class="btn ghost block" style="margin-top: 12px" type="button" @click="router.replace('/')">完成</button>
      </template>
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
.sample {
  white-space: pre-line;
}
</style>
