<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import RadarChart from '@/components/RadarChart.vue'
import { ERROR_CAUSE_LABEL, LEVEL_LABEL } from '@/types'
import { estimateBand } from '@/utils/score'
import { useStudyStore } from '@/stores/study'

const router = useRouter()
const study = useStudyStore()

const report = computed(() => study.latestReport)
</script>

<template>
  <div class="page">
    <h1 class="page-title">诊断本</h1>
    <p class="page-sub">模考后看报告，正考后走另一条复盘线。</p>

    <div v-if="report" class="card" style="margin-top: 14px">
      <div class="row space">
        <div>
          <p class="muted">最近估分 · {{ LEVEL_LABEL[report.level] }}</p>
          <p class="score">{{ report.total }}</p>
          <p class="page-sub">{{ estimateBand(report.total) }} · {{ report.paperTitle }}</p>
        </div>
        <button class="btn sm ghost" type="button" @click="router.push(`/mock/${report.paperId}/report`)">完整报告</button>
      </div>
    </div>
    <div v-else class="card" style="margin-top: 14px">
      <p>还没有模考报告。</p>
      <p class="page-sub">先做一套限时样卷，雷达和补漏计划会从这份数据长出来。</p>
      <button class="btn primary block" style="margin-top: 12px" type="button" @click="router.push('/mock')">去模考</button>
    </div>

    <RadarChart :axes="study.radar" />

    <div class="grid2">
      <button class="card mini" type="button" @click="router.push('/diagnosis/errors')">
        <p class="name">错题本</p>
        <p class="page-sub">{{ study.openErrors.length }} 道待消灭</p>
      </button>
      <button class="card mini" type="button" @click="router.push('/diagnosis/plan')">
        <p class="name">7 日补漏</p>
        <p class="page-sub">{{ study.gapPlan.filter((g) => g.done).length }}/7 完成</p>
      </button>
    </div>

    <p class="section-h">失分归因</p>
    <div class="chips">
      <span v-for="c in report?.weakCauses ?? []" :key="c" class="tag">{{ ERROR_CAUSE_LABEL[c] }}</span>
      <span v-if="!report?.weakCauses?.length" class="muted">暂无</span>
    </div>

    <button class="btn ghost block" style="margin-top: 18px" type="button" @click="router.push('/exam-review')">
      正式考试复盘（记忆卡 / 查分校准）
    </button>
  </div>
</template>

<style scoped>
.score {
  font-family: var(--serif);
  font-size: 40px;
  line-height: 1.1;
}
.mini {
  text-align: left;
  cursor: pointer;
}
.name {
  font-weight: 700;
}
</style>
