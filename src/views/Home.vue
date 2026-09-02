<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { LEVEL_LABEL } from '@/types'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()

const doneCount = computed(() => study.todayTasks.filter((t) => t.done).length)
const phaseText = computed(() => {
  if (user.phase === 'final') return '最后 3 天：停新内容，只复盘。'
  if (user.phase === 'sprint') return '冲刺周：每天压成三件事。'
  return '按题型巩固，周末再套卷。'
})
</script>

<template>
  <div class="page">
    <div class="hero-ink">
      <div class="row space">
        <span class="tag gold-on">{{ LEVEL_LABEL[user.level] }}</span>
        <span class="muted-on">连续 {{ user.streak }} 天</span>
      </div>
      <p class="hello">{{ user.name }}，距考试</p>
      <div class="row" style="align-items: flex-end; gap: 8px; margin: 6px 0 4px">
        <span class="big-num">{{ Math.max(user.daysLeft, 0) }}</span>
        <span style="padding-bottom: 6px">天</span>
      </div>
      <p class="page-sub">目标 {{ user.targetScore }} 分 · {{ phaseText }}</p>
    </div>

    <p class="section-h">今日三件事 {{ doneCount }}/3</p>
    <button
      v-for="task in study.todayTasks"
      :key="task.id"
      class="card task"
      type="button"
      @click="router.push(task.route)"
    >
      <div>
        <p class="t-title">{{ task.title }}</p>
        <p class="page-sub">{{ task.desc }} · {{ task.minutes }} 分钟</p>
      </div>
      <span class="tag" :class="task.done ? 'green' : 'ink'">{{ task.done ? '已完成' : '去完成' }}</span>
    </button>

    <p class="section-h">弱项入口</p>
    <div class="card row space" @click="router.push('/diagnosis')" style="cursor: pointer">
      <div>
        <p class="t-title">{{ study.weakest ? study.weakest.label : '先模考一次' }}</p>
        <p class="page-sub">
          {{ study.latestReport ? `当前约 ${study.weakest?.value} 分位，点进诊断本补漏` : '还没有报告，去真题模考出第一份雷达' }}
        </p>
      </div>
      <span class="small-link">查看</span>
    </div>

    <div class="grid2">
      <button class="card mini" type="button" @click="router.push('/sprint')">
        <p class="t-title">冲刺清单</p>
        <p class="page-sub">节奏与考场注意</p>
      </button>
      <button class="card mini" type="button" @click="router.push('/exam-review')">
        <p class="t-title">正考复盘</p>
        <p class="page-sub">出考场记忆卡</p>
      </button>
    </div>
  </div>
</template>

<style scoped>
.gold-on {
  background: rgba(196, 165, 116, 0.2);
  color: #e8d5b0;
}
.muted-on {
  color: rgba(246, 241, 231, 0.7);
  font-size: 12px;
}
.hello {
  margin-top: 12px;
  opacity: 0.85;
  font-size: 13px;
}
.task,
.mini {
  width: 100%;
  text-align: left;
  cursor: pointer;
}
.task {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.t-title {
  font-weight: 700;
  font-size: 15px;
}
</style>
