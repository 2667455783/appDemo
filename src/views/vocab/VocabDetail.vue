<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import SpeakWordButton from '@/components/SpeakWordButton.vue'
import { getDictionaryVocab } from '@/data/vocab'
import { usageDetail, usageSourceLabel } from '@/data/vocabUsage'
import type { VocabWord } from '@/types'

const route = useRoute()
const router = useRouter()
const pageEl = ref<HTMLElement | null>(null)
const loading = ref(true)
const word = ref<VocabWord | null>(null)
const all = ref<VocabWord[]>([])

function routeId(): string {
  const id = route.params.id
  return (Array.isArray(id) ? id[0] : id) || ''
}

async function load() {
  const first = all.value.length === 0
  if (first) loading.value = true
  const list = first ? await getDictionaryVocab() : all.value
  all.value = list
  word.value = list.find((item) => item.id === routeId()) ?? null
  loading.value = false
  if (pageEl.value) pageEl.value.scrollTop = 0
}

watch(() => route.params.id, () => void load(), { immediate: true })

const detail = computed(() => (word.value ? usageDetail(word.value) : null))

const related = computed(() => {
  if (!detail.value) return []
  return detail.value.seeAlso
    .map((name) => all.value.find((item) => item.word.toLowerCase() === name.toLowerCase()))
    .filter((item): item is VocabWord => !!item)
})

const bankExample = computed(() => {
  if (!word.value?.example || !detail.value) return null
  const duplicated = detail.value.patterns.some((item) => item.example === word.value?.example)
  if (duplicated) return null
  return { en: word.value.example, cn: word.value.exampleCn }
})

function levelText(w: VocabWord): string {
  if (w.level === 'both') return '四六级'
  return w.level === 'cet4' ? '四级' : '六级'
}

function openRelated(item: VocabWord) {
  router.push(`/train/dictionary/${item.id}`)
}
</script>

<template>
  <div ref="pageEl" class="page full detail">
    <PageHeader title="用法详解" subtle="句型 · 搭配 · 例句" @back="router.back()" />

    <div v-if="loading" class="card">
      <p>正在打开词条…</p>
    </div>

    <div v-else-if="!word || !detail" class="card">
      <p>没有找到这个词。</p>
      <button class="btn ghost block" style="margin-top: 12px" type="button" @click="router.replace('/train/dictionary')">
        返回词典
      </button>
    </div>

    <template v-else>
      <section class="card head-card">
        <div class="row space top">
          <div>
            <p class="head">
              <span class="w">{{ word.word }}</span>
              <span v-if="word.phonetic" class="ph">{{ word.phonetic }}</span>
            </p>
            <p v-if="detail.senses.some((s) => s.pos) || word.pos" class="pos">
              {{ [...new Set(detail.senses.map((s) => s.pos).filter(Boolean))].join(' / ') || word.pos }}
            </p>
          </div>
          <div class="aside">
            <SpeakWordButton :text="word.word" />
            <span class="tag">{{ levelText(word) }}</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>释义</h2>
        <ul class="senses">
          <li v-for="(sense, i) in detail.senses" :key="i">
            <span v-if="sense.pos" class="pos-chip">{{ sense.pos }}</span>
            <span>{{ sense.gloss }}</span>
          </li>
        </ul>
      </section>

      <section class="card">
        <h2>用法</h2>
        <p class="page-sub source">{{ usageSourceLabel(detail.source) }}</p>
        <p v-if="detail.tip" class="tip">{{ detail.tip }}</p>
        <article v-for="(item, i) in detail.patterns" :key="item.pattern" class="pat">
          <p class="pat-no">句型 {{ i + 1 }}</p>
          <p class="pat-en">{{ item.pattern }}</p>
          <p class="pat-cn">{{ item.gloss }}</p>
          <div v-if="item.example" class="ex">
            <div class="row space">
              <p class="ex-en">{{ item.example }}</p>
              <SpeakWordButton :text="item.example" title="朗读例句" />
            </div>
            <p v-if="item.exampleCn" class="ex-cn">{{ item.exampleCn }}</p>
          </div>
        </article>
      </section>

      <section v-if="bankExample" class="card">
        <h2>例句</h2>
        <div class="row space">
          <p class="ex-en">{{ bankExample.en }}</p>
          <SpeakWordButton :text="bankExample.en" title="朗读例句" />
        </div>
        <p v-if="bankExample.cn" class="ex-cn">{{ bankExample.cn }}</p>
      </section>

      <section v-if="word.root" class="card">
        <h2>记忆</h2>
        <p class="root">{{ word.root }}</p>
      </section>

      <section v-if="related.length" class="card">
        <h2>相关词</h2>
        <div class="rel">
          <button v-for="item in related" :key="item.id" class="rel-btn" type="button" @click="openRelated(item)">
            {{ item.word }}
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.detail {
  padding-bottom: 28px;
}
.head-card {
  margin-top: 0;
}
.top {
  align-items: flex-start;
}
.aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
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
  font-size: 28px;
  font-weight: 700;
}
.ph,
.pos {
  color: var(--ink-soft);
  font-size: 13px;
}
.pos {
  margin: 4px 0 0;
}
h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}
.source {
  margin-top: 4px;
}
.senses {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.senses li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  line-height: 1.55;
}
.senses li + li {
  margin-top: 8px;
}
.pos-chip {
  flex-shrink: 0;
  margin-top: 2px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--moss, #e7efe6);
  color: var(--forest);
  font-size: 11px;
  font-weight: 700;
}
.tip {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--moss, #e7efe6);
  color: var(--forest);
  font-size: 13px;
  line-height: 1.55;
}
.pat {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.pat-no {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.pat-en {
  margin: 4px 0 0;
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
}
.pat-cn {
  margin: 4px 0 0;
  line-height: 1.55;
}
.ex {
  margin-top: 8px;
}
.ex-en {
  margin: 0;
  flex: 1;
  line-height: 1.5;
}
.ex-cn,
.root {
  margin: 6px 0 0;
  color: var(--ink-soft);
  line-height: 1.5;
}
.rel {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.rel-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--forest);
  font-weight: 700;
}
</style>
