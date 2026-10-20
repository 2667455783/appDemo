<script lang="ts">
import type { ExamLevel } from '@/types'

/** 用法页返回时恢复：词表、字母、搜索和列表滚动位置 */
const dictBrowse = {
  level: 'cet4' as ExamLevel,
  letter: 'A',
  q: '',
  scrollTop: 0,
}
</script>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import SpeakWordButton from '@/components/SpeakWordButton.vue'
import {
  filterVocabByLevel,
  getDictionaryVocab,
  groupVocabByLetter,
} from '@/data/vocab'
import type { VocabWord } from '@/types'

defineOptions({ name: 'VocabDictionary' })

const router = useRouter()
const loading = ref(true)
const all = ref<VocabWord[]>([])
const level = ref<ExamLevel>(dictBrowse.level)
const letter = ref(dictBrowse.letter)
const q = ref(dictBrowse.q)
const pageEl = ref<HTMLElement | null>(null)
let restoringScroll = false
let freezeScroll = false

onMounted(async () => {
  try {
    all.value = await getDictionaryVocab()
  } finally {
    loading.value = false
  }
  await restoreScroll()
})

onActivated(() => {
  if (!loading.value) void restoreScroll()
})

const leveled = computed(() => filterVocabByLevel(all.value, level.value))

const grouped = computed(() => groupVocabByLetter(leveled.value))

const letters = computed(() => grouped.value.map((g) => g.letter))

const filtered = computed(() => {
  const key = q.value.trim().toLowerCase()
  if (key) {
    return leveled.value
      .filter(
        (w) =>
          w.word.toLowerCase().includes(key) ||
          w.meaning.toLowerCase().includes(key) ||
          (w.collocation || '').toLowerCase().includes(key),
      )
      .slice()
      .sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }))
  }
  const g = grouped.value.find((x) => x.letter === letter.value)
  return g?.words ?? []
})

watch(level, (value) => {
  dictBrowse.level = value
  q.value = ''
  if (!letters.value.includes(letter.value)) {
    letter.value = letters.value[0] || 'A'
  }
})

watch(letter, (value) => {
  dictBrowse.letter = value
})

watch(q, (value) => {
  dictBrowse.q = value
})

watch(letters, (ls) => {
  if (ls.length && !ls.includes(letter.value)) letter.value = ls[0]!
})

function usageOf(w: VocabWord): string {
  if (w.collocation) return w.collocation
  if (w.example) return w.exampleCn ? `${w.example}（${w.exampleCn}）` : w.example
  if (w.root) return w.root
  return ''
}

function rememberScroll() {
  if (freezeScroll || restoringScroll || loading.value || !pageEl.value) return
  dictBrowse.scrollTop = pageEl.value.scrollTop
}

function scrollToTop() {
  dictBrowse.scrollTop = 0
  if (pageEl.value) pageEl.value.scrollTop = 0
}

async function restoreScroll() {
  const top = dictBrowse.scrollTop
  if (top <= 0) {
    freezeScroll = false
    return
  }
  restoringScroll = true
  const apply = () => {
    if (pageEl.value) pageEl.value.scrollTop = top
  }
  await nextTick()
  apply()
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(() => {
      apply()
      restoringScroll = false
      freezeScroll = false
    })
  })
}

function setLevel(lv: ExamLevel) {
  level.value = lv
  scrollToTop()
}

function pickLetter(L: string) {
  q.value = ''
  letter.value = L
  scrollToTop()
}

function openWord(w: VocabWord) {
  rememberScroll()
  router.push(`/train/dictionary/${w.id}`)
}

onBeforeRouteLeave(() => {
  rememberScroll()
  freezeScroll = true
})
</script>

<template>
  <div ref="pageEl" class="page full dict-page" @scroll.passive="rememberScroll">
    <div class="dict-top">
      <PageHeader title="四六级词典" subtle="点击单词，查看句型与用法" @back="router.back()" />
    </div>

    <div class="dict-sticky">
      <div class="chips">
        <button class="chip" :class="{ on: level === 'cet4' }" type="button" @click="setLevel('cet4')">四级词表</button>
        <button class="chip" :class="{ on: level === 'cet6' }" type="button" @click="setLevel('cet6')">六级词表</button>
      </div>
      <div class="field search">
        <input v-model="q" type="search" placeholder="搜索单词 / 释义 / 搭配" />
      </div>
      <div v-if="!loading && !q.trim()" class="az">
        <button
          v-for="L in letters"
          :key="L"
          class="az-btn"
          :class="{ on: letter === L }"
          type="button"
          @click="pickLetter(L)"
        >
          {{ L }}
        </button>
      </div>
      <p v-if="!loading" class="page-sub count">
        {{ level === 'cet4' ? '四级' : '六级' }}共 {{ leveled.length }} 词
        <template v-if="!q.trim()"> · 当前 {{ letter }}（{{ filtered.length }}）</template>
        <template v-else> · 搜索命中 {{ filtered.length }}</template>
      </p>
    </div>

    <div v-if="!loading" class="dict-list">
        <p v-if="!filtered.length" class="page-sub empty">没有匹配的词。</p>
        <article
          v-for="w in filtered"
          :key="w.id"
          class="card word"
          tabindex="0"
          @click="openWord(w)"
          @keydown.enter.prevent="openWord(w)"
        >
          <div class="row space top">
            <div>
              <p class="head">
                <span class="w">{{ w.word }}</span>
                <span v-if="w.phonetic" class="ph">{{ w.phonetic }}</span>
              </p>
              <p v-if="w.pos" class="pos">{{ w.pos }}</p>
            </div>
            <div class="aside">
              <SpeakWordButton :text="w.word" />
              <span class="tag">{{ w.level === 'both' ? '四六级' : w.level === 'cet4' ? '四级' : '六级' }}</span>
            </div>
          </div>
          <p class="meaning">{{ w.meaning || '（暂无释义）' }}</p>
          <p v-if="usageOf(w)" class="usage">
            <span class="u-label">用法</span>{{ usageOf(w) }}
          </p>
          <p class="more">查看用法 <span aria-hidden="true">›</span></p>
        </article>
      </div>
  </div>
</template>

<style scoped>
.dict-page {
  padding: 0 0 24px;
}
.dict-top {
  padding: 16px 18px 0;
}
.search {
  margin: 10px 0;
}
.search:last-child {
  margin-bottom: 0;
}
.count {
  margin: 8px 0 10px;
}
.dict-sticky {
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 8px 18px 0;
  background: var(--paper);
  border-radius: 0 0 16px 16px;
  box-shadow: 0 10px 14px var(--paper);
}
.az {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dict-list {
  padding: 0 18px 8px;
}
.empty {
  margin-top: 16px;
}
.az-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--paper-2, #fff);
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  padding: 0;
}
.az-btn.on {
  background: var(--forest);
  color: var(--on-primary);
  border-color: var(--forest);
}
.word {
  margin-top: 10px;
  text-align: left;
  cursor: pointer;
}
.word:active {
  border-color: var(--forest);
}
.more {
  margin: 10px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--forest);
}
.aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
.top {
  align-items: flex-start;
}
.head {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}
.w {
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 700;
}
.ph {
  color: var(--ink-soft);
  font-size: 13px;
}
.pos {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--ink-soft);
}
.meaning {
  margin: 10px 0 0;
  line-height: 1.55;
}
.usage {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-soft);
}
.u-label {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--moss, #e7efe6);
  color: var(--forest);
  font-size: 11px;
  font-weight: 700;
}
</style>
