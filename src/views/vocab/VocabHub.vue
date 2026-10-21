<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { LEVEL_LABEL } from '@/types'
import { vocabCount } from '@/services/bank'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()

const total = ref(0)

onMounted(async () => {
  total.value = await vocabCount(user.level)
})

const dueCount = computed(() => study.dueWordIds.length)
const wrongCount = computed(() => study.wrongWordIds.length)
</script>

<template>
  <div class="page">
    <PageHeader
      title="单词"
      :subtle="`${LEVEL_LABEL[user.level]}词书 · 约 ${total || '…'} 词`"
      :back="false"
    />

    <div class="grid2">
      <div class="card">
        <p class="muted">今日待复习</p>
        <p class="num">{{ dueCount }}</p>
      </div>
      <div class="card">
        <p class="muted">错词本</p>
        <p class="num">{{ wrongCount }}</p>
      </div>
    </div>

    <button class="card task" type="button" @click="router.push('/train/vocab')">
      <div>
        <p class="t-title">开始背词</p>
        <p class="page-sub">间隔重复 · 每组约 8 词</p>
      </div>
      <span class="tag ink">去背</span>
    </button>

    <button class="card task" type="button" @click="router.push('/train/dictionary')">
      <div>
        <p class="t-title">词典浏览</p>
        <p class="page-sub">A–Z · 释义与用法</p>
      </div>
      <span class="tag ink">查阅</span>
    </button>

    <button class="card task" type="button" @click="router.push('/vocab/wrong')">
      <div>
        <p class="t-title">错词本</p>
        <p class="page-sub">没记住的词优先复习</p>
      </div>
      <span class="tag" :class="wrongCount ? 'ink' : 'green'">{{ wrongCount ? `${wrongCount} 词` : '清空' }}</span>
    </button>
  </div>
</template>

<style scoped>
.num {
  font-size: 28px;
  font-weight: 700;
  margin-top: 4px;
}
.task {
  width: 100%;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.t-title {
  font-weight: 700;
  font-size: 15px;
}
</style>
