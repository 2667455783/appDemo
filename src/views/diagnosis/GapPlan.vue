<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useStudyStore } from '@/stores/study'

const router = useRouter()
const study = useStudyStore()

const days = computed(() => {
  const map: Record<number, typeof study.gapPlan> = {}
  for (const t of study.gapPlan) {
    map[t.dayOffset] = map[t.dayOffset] ?? []
    map[t.dayOffset]!.push(t)
  }
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((d) => ({ day: d, tasks: map[d]! }))
})
</script>

<template>
  <div class="page full">
    <PageHeader title="7 日补漏" subtle="根据最近模考弱项生成，完成会回写雷达" @back="router.back()" />
    <p v-if="!study.gapPlan.length" class="page-sub">先完成一套模考，才会出现日历。</p>
    <section v-for="d in days" :key="d.day" style="margin-bottom: 14px">
      <p class="section-h">{{ d.day === 0 ? '今天' : `第 ${d.day + 1} 天` }}</p>
      <button
        v-for="t in d.tasks"
        :key="t.id"
        class="card row space"
        type="button"
        @click="study.toggleGapTask(t.id)"
      >
        <div style="text-align: left">
          <p style="font-weight: 700">{{ t.title }}</p>
          <p class="page-sub">{{ t.desc }} · {{ t.minutes }} 分钟</p>
        </div>
        <span class="tag" :class="t.done ? 'green' : 'ink'">{{ t.done ? '已完成' : '待做' }}</span>
      </button>
      <button
        v-if="d.day === 0 && d.tasks[0]"
        class="btn ghost block"
        style="margin-top: 8px"
        type="button"
        @click="router.push(d.tasks[0].route)"
      >
        去做今天的训练
      </button>
    </section>
  </div>
</template>
