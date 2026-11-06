<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import SpeakWordButton from '@/components/SpeakWordButton.vue'
import { fetchVocabByIds } from '@/services/bank'
import { useStudyStore } from '@/stores/study'
import type { VocabWord } from '@/types'

const router = useRouter()
const study = useStudyStore()

const words = ref<VocabWord[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  words.value = await fetchVocabByIds(study.retestWordIds)
  loading.value = false
}

onMounted(load)

function cardOf(id: string) {
  return study.vocab[id]
}
</script>

<template>
  <div class="page full">
    <PageHeader title="复测本" subtle="背词点「记住了」的词会进入这里，用四选一巩固" @back="router.back()" />

    <div v-if="loading" class="card"><p>加载中…</p></div>
    <div v-else-if="!words.length" class="card">
      <p>复测本是空的。</p>
      <p class="page-sub">在「开始背词」里点「记住了」，词会自动加入；次日可在首页「昨日巩固」复测。</p>
      <button class="btn primary block" style="margin-top: 12px" type="button" @click="router.replace('/train/vocab')">
        去背词
      </button>
    </div>
    <template v-else>
      <p class="muted">共 {{ words.length }} 词 · 四选一验证释义</p>
      <article v-for="w in words" :key="w.id" class="card word-card">
        <div class="row space">
          <div>
            <p class="word">{{ w.word }}</p>
            <p class="page-sub">{{ w.phonetic }} {{ w.pos }}</p>
          </div>
          <SpeakWordButton :text="w.word" />
        </div>
        <p style="margin-top: 8px">{{ w.meaning }}</p>
        <p class="muted" style="margin-top: 8px">
          入队 {{ cardOf(w.id)?.pendingRetestOn || '—' }} · 对 {{ cardOf(w.id)?.correct ?? 0 }} 次
        </p>
      </article>
      <button class="btn primary block" type="button" @click="router.push('/train/vocab-retest')">
        开始复测
      </button>
    </template>
  </div>
</template>

<style scoped>
.word-card {
  margin-bottom: 10px;
}
.word {
  font-size: 20px;
  font-weight: 700;
}
</style>
