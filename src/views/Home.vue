<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()

const domain = computed(() => user.activeDomain)
const doneCount = computed(() => study.todayTasks.filter((t) => t.done).length)
const phaseText = computed(() => domain.value.homePhaseText(user.phase))

const heroTag = computed(() => {
  if (domain.value.id === 'english') return user.activeLevelLabel
  return domain.value.name
})

const heroSub = computed(() => {
  if (domain.value.id === 'english') {
    return `目标 ${user.targetScore} 分 · ${phaseText.value}`
  }
  return phaseText.value
})
</script>

<template>
  <div class="page">
    <div class="hero-ink">
      <div class="row space">
        <span class="tag gold-on">{{ heroTag }}</span>
        <span class="muted-on">连续 {{ user.streak }} 天</span>
      </div>
      <p class="hello">{{ user.name }}，距考试</p>
      <div class="row" style="align-items: flex-end; gap: 8px; margin: 6px 0 4px">
        <span class="big-num">{{ Math.max(user.daysLeft, 0) }}</span>
        <span style="padding-bottom: 6px">天</span>
      </div>
      <p class="page-sub">{{ heroSub }}</p>
    </div>

    <p class="section-h">
      今日任务 {{ doneCount }}/{{ Math.max(study.todayTasks.length, 1) }}
    </p>
    <button
      v-for="task in study.todayTasks"
      :key="task.id"
      class="card task"
      type="button"
      @click="router.push(task.route)"
    >
      <div>
        <p class="t-title">{{ task.title }}</p>
        <p class="page-sub">
          {{ task.desc }}
          <template v-if="task.minutes"> · {{ task.minutes }} 分钟</template>
        </p>
      </div>
      <span class="tag" :class="task.done ? 'green' : 'ink'">{{ task.done ? '已完成' : '去完成' }}</span>
    </button>

    <p class="section-h">快捷入口</p>
    <div class="grid2">
      <button
        v-for="s in domain.homeShortcuts"
        :key="s.route"
        class="card mini"
        type="button"
        @click="router.push(s.route)"
      >
        <p class="t-title">{{ s.label }}</p>
        <p class="page-sub">{{ s.desc }}</p>
      </button>
    </div>

    <button class="card mini block" style="margin-top: 10px" type="button" @click="router.push('/profile/reminder')">
      <p class="t-title">学习提醒</p>
      <p class="page-sub">{{ domain.reminderHint }}</p>
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
