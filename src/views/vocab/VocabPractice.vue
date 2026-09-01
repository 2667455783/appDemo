<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import SpeakWordButton from '@/components/SpeakWordButton.vue'
import { fetchVocabDue, vocabCount } from '@/services/bank'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'
import { newCard } from '@/utils/srs'
import type { VocabWord } from '@/types'

const router = useRouter()
const study = useStudyStore()
const user = useUserStore()

const queue = ref<VocabWord[]>([])
const loading = ref(true)
const total = ref(0)
const idx = ref(0)
const flipped = ref(false)
const done = ref(false)
const remembered = ref(0)
const forgot = ref(0)

const current = computed(() => queue.value[idx.value])
const card = computed(() =>
  current.value ? (study.vocab[current.value.id] ?? newCard()) : newCard(),
)

async function load() {
  loading.value = true
  done.value = false
  idx.value = 0
  flipped.value = false
  remembered.value = 0
  forgot.value = 0
  const dueIds = study.dueWords.map((w) => w.id)
  const [items, n] = await Promise.all([
    fetchVocabDue({ level: user.level, dueIds, count: 8 }),
    total.value ? Promise.resolve(0) : vocabCount(),
  ])
  if (n) total.value = n
  queue.value = items
  loading.value = false
}

onMounted(load)

function flip() {
  flipped.value = true
}

function grade(ok: boolean) {
  if (!current.value) return
  study.answerVocab(current.value.id, ok)
  if (ok) remembered.value += 1
  else forgot.value += 1
  flipped.value = false
  if (idx.value + 1 >= queue.value.length) done.value = true
  else idx.value += 1
}
</script>

<template>
  <div class="page full">
    <PageHeader title="词汇" :subtle="total ? `题库 ${total} 词 · 间隔 1 / 3 / 7 天` : '从题库拉取，间隔 1 / 3 / 7 天'" @back="router.back()" />

    <div v-if="loading" class="card">
      <p>正在从题库拉取…</p>
    </div>

    <div v-else-if="!current || done" class="card">
      <p>本组结束。记住 {{ remembered }} · 再看 {{ forgot }}。</p>
      <p class="page-sub">错的会在明天再次到期。连续做对才会拉长间隔。</p>
      <div class="grid2" style="margin-top: 12px">
        <button class="btn primary" type="button" @click="load">换一组</button>
        <button class="btn ghost" type="button" @click="router.replace('/')">回首页</button>
      </div>
    </div>

    <template v-else>
      <p class="muted">{{ idx + 1 }} / {{ queue.length }} · {{ current.freq === 'must' ? '必考' : current.freq === 'high' ? '高频' : '扩展' }}</p>
      <div class="flash-wrap">
        <SpeakWordButton class="flash-speak" :text="current.word" />
        <button class="flash" type="button" @click="flip">
          <p class="word">{{ current.word }}</p>
          <p class="phon">{{ current.phonetic }} {{ current.pos }}</p>
          <div v-if="flipped" class="mean">
            <p>{{ current.meaning }}</p>
            <p v-if="current.example" class="ex">{{ current.example }}</p>
            <p v-if="current.exampleCn" class="page-sub">{{ current.exampleCn }}</p>
            <p v-if="current.collocation" class="page-sub">搭配 {{ current.collocation }}</p>
            <p v-if="current.root" class="page-sub">词根 {{ current.root }}</p>
            <p v-if="!current.example" class="page-sub">（ECDICT 词条暂无例句，可先记释义）</p>
          </div>
          <p v-else class="page-sub">点卡片看释义与例句</p>
        </button>
      </div>
      <div v-if="flipped" class="grid2" style="margin-top: 12px">
        <button class="btn danger" type="button" @click="grade(false)">没记住</button>
        <button class="btn primary" type="button" @click="grade(true)">记住了</button>
      </div>
      <p class="muted" style="margin-top: 10px">到期日 {{ card.due }} · 间隔 {{ card.interval || 0 }} 天</p>
    </template>
  </div>
</template>

<style scoped>
.flash-wrap {
  position: relative;
  margin-top: 10px;
}
.flash-speak {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
}
.flash {
  width: 100%;
  min-height: 240px;
  border: 1px solid var(--line);
  background: var(--paper-2);
  border-radius: 20px;
  padding: 28px 18px;
  text-align: left;
}
.word {
  font-family: var(--serif);
  font-size: 32px;
}
.phon {
  color: var(--ink-soft);
  margin: 6px 0 16px;
}
.ex {
  margin: 10px 0 4px;
  font-style: italic;
  line-height: 1.5;
}
.mean {
  animation: in 0.2s ease;
}
@keyframes in {
  from {
    opacity: 0;
  }
}
</style>
