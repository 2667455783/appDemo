<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { addDays, todayISO } from '@/utils/storage'
import { useUserStore } from '@/stores/user'
import type { ExamLevel, TargetScore } from '@/types'

const router = useRouter()
const user = useUserStore()

const form = reactive({
  name: '',
  level: 'cet4' as ExamLevel,
  targetScore: 425 as TargetScore,
  examDate: addDays(todayISO(), 46),
})

const targets: TargetScore[] = [425, 550, 600]
const targetHint = computed(() => {
  if (form.targetScore === 425) return '过线即可，先保证听力阅读不崩'
  if (form.targetScore === 550) return '优秀档，写译也要稳住'
  return '冲刺档，错题和速度都要管'
})

function submit() {
  user.completeOnboarding({
    name: form.name,
    level: form.level,
    targetScore: form.targetScore,
    examDate: form.examDate,
  })
  router.replace('/')
}
</script>

<template>
  <div class="page full">
    <p class="brand">知卷</p>
    <h1 class="page-title">把卷面拆开练，<br />考后按弱项补。</h1>
    <p class="page-sub">先定等级和考试日，后面的词表、真题和诊断都会跟着变。</p>

    <div class="stack" style="margin-top: 22px">
      <div class="field">
        <label>怎么称呼你</label>
        <input v-model="form.name" placeholder="例如 小林" maxlength="12" />
      </div>
      <div>
        <p class="muted" style="margin-bottom: 8px">目标等级</p>
        <div class="chips">
          <button class="chip" :class="{ on: form.level === 'cet4' }" type="button" @click="form.level = 'cet4'">英语四级</button>
          <button class="chip" :class="{ on: form.level === 'cet6' }" type="button" @click="form.level = 'cet6'">英语六级</button>
        </div>
      </div>
      <div>
        <p class="muted" style="margin-bottom: 8px">目标分数</p>
        <div class="chips">
          <button
            v-for="t in targets"
            :key="t"
            class="chip"
            :class="{ on: form.targetScore === t }"
            type="button"
            @click="form.targetScore = t"
          >
            {{ t }}
          </button>
        </div>
        <p class="page-sub">{{ targetHint }}</p>
      </div>
      <div class="field">
        <label>考试日期</label>
        <input v-model="form.examDate" type="date" />
      </div>
      <button class="btn primary block" type="button" @click="submit">进入今日任务</button>
      <p class="muted" style="text-align: center">摸底会在第一次模考后自动生成能力雷达，不必现在做长卷。</p>
    </div>
  </div>
</template>

<style scoped>
.brand {
  font-family: var(--serif);
  color: var(--forest);
  font-size: 18px;
  margin-bottom: 10px;
}
</style>
