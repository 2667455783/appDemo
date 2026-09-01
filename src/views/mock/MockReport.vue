<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { getPaper } from '@/data/mockExam'
import { ERROR_CAUSE_LABEL } from '@/types'
import { estimateBand } from '@/utils/score'
import { useStudyStore } from '@/stores/study'

const route = useRoute()
const router = useRouter()
const study = useStudyStore()
const paperId = computed(() => String(route.params.id))
const paper = computed(() => getPaper(paperId.value))
const report = computed(() => study.reports.find((r) => r.paperId === paperId.value) ?? study.latestReport)
const showKey = ref(false)
</script>

<template>
  <div class="page full">
    <PageHeader title="诊断报告" subtle="估分按官方分项权重折算，仅供备考参考" @back="router.replace('/diagnosis')" />

    <div v-if="report" class="hero-ink">
      <p class="muted-on">{{ report.paperTitle }}</p>
      <p class="big-num">{{ report.total }}</p>
      <p>{{ estimateBand(report.total) }}</p>
    </div>
    <p v-else>还没有这份卷的报告，请先完成模考。</p>

    <template v-if="report">
      <p class="section-h">分项</p>
      <div v-for="s in report.sections" :key="s.key" class="card">
        <div class="row space">
          <b>{{ s.label }}</b>
          <span>{{ s.score }}/{{ s.max }}</span>
        </div>
        <div class="progress" style="margin: 8px 0">
          <span :style="{ width: `${(s.score / s.max) * 100}%` }" />
        </div>
        <p class="page-sub">{{ s.detail }}</p>
      </div>

      <p class="section-h">题型拆解</p>
      <div v-for="t in report.typeBreakdown" :key="t.label" class="row space card">
        <span>{{ t.label }}</span>
        <b>{{ Math.round(t.rate * 100) }}%</b>
      </div>

      <p class="section-h">下一步 3 个动作</p>
      <div v-for="(a, i) in report.nextActions" :key="a" class="card">{{ i + 1 }}. {{ a }}</div>

      <p class="section-h">失分归因</p>
      <div class="chips">
        <span v-for="c in report.weakCauses" :key="c" class="tag">{{ ERROR_CAUSE_LABEL[c] }}</span>
      </div>

      <div class="grid2" style="margin-top: 16px">
        <button class="btn primary" type="button" @click="router.push('/diagnosis/plan')">生成的补漏计划</button>
        <button class="btn ghost" type="button" @click="router.push('/diagnosis/errors')">错题本</button>
      </div>

      <button class="btn ghost block" style="margin-top: 10px" type="button" @click="showKey = !showKey">
        {{ showKey ? '收起解析' : '先对答案，再看解析' }}
      </button>
      <div v-if="showKey && paper" class="stack" style="margin-top: 12px">
        <div class="card">
          <p class="muted">听力原文</p>
          <p class="page-sub">{{ paper.listening.audioText }}</p>
        </div>
        <div v-for="q in paper.listening.questions" :key="q.id" class="card">
          <p>{{ q.stem }}</p>
          <p class="page-sub">答案 {{ q.options[q.answer] }}</p>
          <p class="page-sub">{{ q.analysis }}</p>
        </div>
        <div class="card">
          <p class="muted">翻译参考</p>
          <p class="page-sub">{{ paper.translation.sample }}</p>
        </div>
        <div class="card">
          <p class="muted">写作范文</p>
          <p class="page-sub">{{ paper.writing.sample }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.muted-on {
  color: rgba(246, 241, 231, 0.75);
  font-size: 12px;
}
</style>
