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
  if (user.phase === 'final') return '最后 3 天：只过词表与模板，不堆新内容。'
  if (user.phase === 'sprint') return '冲刺周：每天背词 + 套一套写作模板。'
  return '单词打卡 + 作文脚手架，稳扎稳打。'
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

    <p class="section-h">快捷入口</p>
    <div class="grid2">
      <button class="card mini" type="button" @click="router.push('/vocab')">
        <p class="t-title">单词</p>
        <p class="page-sub">背词 · 词典 · 错词本</p>
      </button>
      <button class="card mini" type="button" @click="router.push('/writing')">
        <p class="t-title">写作</p>
        <p class="page-sub">模板 · 金句 · 套用</p>
      </button>
    </div>

    <button class="card mini block" style="margin-top: 10px" type="button" @click="router.push('/profile/reminder')">
      <p class="t-title">学习提醒</p>
      <p class="page-sub">到点提醒背词，进程关掉也能弹</p>
    </button>
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
.block {
  display: block;
}
</style>
