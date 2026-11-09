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
  words.value = await fetchVocabByIds(study.wrongWordIds)
  loading.value = false
}

onMounted(load)

function cardOf(id: string) {
  return study.vocab[id]
}
</script>

<template>
  <div class="page full">
    <PageHeader title="错词本" subtle="存放所有未记住的单词，优先复习" @back="router.back()" />

    <div v-if="loading" class="card"><p>加载中…</p></div>
    <div v-else-if="!words.length" class="card">
      <p>还没有未记住的单词。</p>
      <p class="page-sub">在「开始背词」里点「没记住」后会出现在这里。点「记住了」会离开并进入复测本。</p>
      <button class="btn primary block" style="margin-top: 12px" type="button" @click="router.replace('/train/vocab')">
        去背词
      </button>
    </div>
    <template v-else>
      <p class="muted">共 {{ words.length }} 个未记住的词 · 建议优先复习</p>
      <article v-for="w in words" :key="w.id" class="card word-card">
        <div class="row space">
          <div>
            <p class="word">{{ w.word }}</p>
            <p class="page-sub">{{ w.phonetic }} {{ w.pos }}</p>
          </div>
          <SpeakWordButton :text="w.word" />
        </div>
        <p style="margin-top: 8px">{{ w.meaning }}</p>
        <p v-if="w.example" class="page-sub" style="margin-top: 6px">{{ w.example }}</p>
        <p class="muted" style="margin-top: 8px">
          未记住 · 错 {{ cardOf(w.id)?.wrong ?? 0 }} 次 · 对 {{ cardOf(w.id)?.correct ?? 0 }} 次
        </p>
      </article>
      <button class="btn primary block" type="button" @click="router.push('/train/vocab')">去复习一组</button>
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
