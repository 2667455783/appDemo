<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { papersFor } from '@/data/mockExam'
import { realPaperList } from '@/services/bank'
import { LEVEL_LABEL } from '@/types'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()
const papers = computed(() => papersFor(user.level))
const realPapers = computed(() => realPaperList(user.level))

function lastScore(id: string) {
  return study.reports.find((r) => r.paperId === id)?.total
}
</script>

<template>
  <div class="page">
    <PageHeader
      title="真题模考"
      :subtle="`${LEVEL_LABEL[user.level]} · 限时套卷出诊断，分项练请回题型页。`"
      :back="false"
    />

    <p class="section-h">真题卷 · 2023.12</p>
    <p class="page-sub" style="margin-bottom: 10px">
      取自公开 GPL 题库（wamich/english-exem-md）。答案字段待补，写作/翻译范文与听力音频暂缺，可先练阅读与选词。
    </p>
    <article v-for="p in realPapers" :key="p.id" class="card" style="margin-top: 12px">
      <div class="row space">
        <div>
          <p class="name">{{ p.title }}</p>
          <p class="page-sub">{{ p.year }} · 写 / 读 / 译 · 答案待补</p>
        </div>
        <span class="tag">真题</span>
      </div>
      <button class="btn gold block" type="button" style="margin-top: 10px" @click="router.push(`/mock/${p.id}?real=1`)">进入真题卷</button>
    </article>

    <p class="section-h" style="margin-top: 18px">演示套卷</p>
    <article v-for="p in papers" :key="p.id" class="card" style="margin-top: 14px">
      <div class="row space">
        <div>
          <p class="name">{{ p.title }}</p>
          <p class="page-sub">{{ p.year }} · 写 / 听 / 读 / 译</p>
        </div>
        <span v-if="lastScore(p.id)" class="tag green">上次 {{ lastScore(p.id) }}</span>
      </div>
      <p class="page-sub" style="margin: 8px 0 12px">
        演示卷已压缩篇幅，可开「正式计时」或「缩短演示」。交卷后强制进入诊断报告。
      </p>
      <button class="btn primary block" type="button" @click="router.push(`/mock/${p.id}`)">开始套卷</button>
    </article>

    <p class="section-h">分项练习</p>
    <div class="grid2">
      <button class="card mini" type="button" @click="router.push('/train/listening')">只做听力</button>
      <button class="card mini" type="button" @click="router.push('/train/reading')">只做阅读</button>
    </div>
  </div>
</template>

<style scoped>
.name {
  font-family: var(--serif);
  font-size: 18px;
}
.mini {
  text-align: left;
  cursor: pointer;
  font-weight: 600;
}
</style>
