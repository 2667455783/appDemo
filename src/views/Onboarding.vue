<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { listEnabledDomains } from '@/domains/registry'
import type { DomainId } from '@/domains/types'
import { addDays, todayISO } from '@/utils/storage'
import { useUserStore } from '@/stores/user'
import type { ExamLevel, TargetScore } from '@/types'

const router = useRouter()
const user = useUserStore()
const domains = listEnabledDomains()

const form = reactive({
  name: '',
  domainId: 'english' as DomainId,
  level: 'cet4' as ExamLevel,
  targetScore: 425 as TargetScore,
  examDate: addDays(todayISO(), 46),
})

const targets: TargetScore[] = [425, 550, 600]
const showEnglishExam = computed(() => form.domainId === 'english')
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
    domainId: form.domainId,
  })
  router.replace('/')
}
</script>

<template>
  <div class="page full">
    <p class="brand">学习宝典</p>
    <h1 class="page-title">多学科学习，<br />从每日打卡开始。</h1>
    <p class="page-sub">先选学科与目标，今日任务会跟着变。英语已开放；编程、医药内容筹备中。</p>

    <div class="stack" style="margin-top: 22px">
      <div class="field">
        <label>怎么称呼你</label>
        <input v-model="form.name" placeholder="例如 小林" maxlength="12" />
      </div>
      <div>
        <p class="muted" style="margin-bottom: 8px">学习学科</p>
        <div class="chips">
          <button
            v-for="d in domains"
            :key="d.id"
            class="chip"
            :class="{ on: form.domainId === d.id }"
            type="button"
            @click="form.domainId = d.id"
          >
            {{ d.name }}
          </button>
        </div>
      </div>
      <template v-if="showEnglishExam">
        <div>
          <p class="muted" style="margin-bottom: 8px">目标等级</p>
          <div class="chips">
            <button class="chip" :class="{ on: form.level === 'cet4' }" type="button" @click="form.level = 'cet4'">
              英语四级
            </button>
            <button class="chip" :class="{ on: form.level === 'cet6' }" type="button" @click="form.level = 'cet6'">
              英语六级
            </button>
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
      </template>
      <p v-else class="page-sub">该学科内容筹备中，进入后可先熟悉界面，随时在「我的」切回英语。</p>
      <button class="btn primary block" type="button" @click="submit">开始学习</button>
      <p class="muted" style="text-align: center">学习进度按学科分别保存，互不影响。</p>
    </div>
  </div>
</template>

<style scoped>
.brand {
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--forest);
  margin: 8px 0 12px;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
