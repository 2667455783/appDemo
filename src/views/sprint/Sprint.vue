<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()

const timeline = [
  { name: '写作', min: 30 },
  { name: '听力', min: 25 },
  { name: '阅读', min: 40 },
  { name: '翻译', min: 30 },
]

const checklist = [
  '提前试听设备，确认音量',
  '听力开始后不回写作文',
  '阅读先看题干再回原文',
  '答题卡填涂与试卷一致',
  '翻译留足 25 分钟以上',
]

const mode = computed(() => {
  if (user.phase === 'final') return '最后 3 天：停新内容。只复习错题本、高频词、再听一套听力。'
  if (user.phase === 'sprint') return '考前 7–14 天：每天压成三件事（词 + 听 + 一篇阅读或翻译）。'
  return '距考试还早。现在按题型巩固，周末套卷。冲刺模式会在倒计时 14 天自动出现在首页。'
})
</script>

<template>
  <div class="page full">
    <PageHeader title="冲刺清单" :subtle="`当前 ${user.daysLeft} 天`" @back="router.back()" />
    <div class="card">
      <p>{{ mode }}</p>
    </div>
    <p class="section-h">整卷时间轴</p>
    <div v-for="t in timeline" :key="t.name" class="row space card">
      <span>{{ t.name }}</span>
      <b>{{ t.min }} 分钟</b>
    </div>
    <p class="section-h">考场注意（非知识性丢分）</p>
    <div v-for="c in checklist" :key="c" class="card">{{ c }}</div>
    <button class="btn primary block" style="margin-top: 16px" type="button" @click="router.push('/')">按今日三件事开始</button>
  </div>
</template>
