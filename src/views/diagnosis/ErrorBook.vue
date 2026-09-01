<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { CAUSE_OPTIONS, ERROR_CAUSE_LABEL } from '@/types'
import type { ErrorCause, SkillType } from '@/types'
import { useStudyStore } from '@/stores/study'

const router = useRouter()
const study = useStudyStore()
const skill = ref<SkillType | 'all'>('all')
const onlyOpen = ref(true)

const list = computed(() => {
  return study.errors.filter((e) => {
    if (onlyOpen.value && e.status !== 'open') return false
    if (skill.value !== 'all' && e.skill !== skill.value) return false
    return true
  })
})

function retry(id: string, ok: boolean) {
  study.retryError(id, ok)
}
</script>

<template>
  <div class="page full">
    <PageHeader title="错题本" subtle="连续 2 次做对才移出待消灭" @back="router.back()" />
    <div class="chips">
      <button class="chip" :class="{ on: skill === 'all' }" type="button" @click="skill = 'all'">全部</button>
      <button class="chip" :class="{ on: skill === 'listening' }" type="button" @click="skill = 'listening'">听力</button>
      <button class="chip" :class="{ on: skill === 'reading' }" type="button" @click="skill = 'reading'">阅读</button>
      <button class="chip" :class="{ on: skill === 'writing' }" type="button" @click="skill = 'writing'">写译语法</button>
      <button class="chip" :class="{ on: onlyOpen }" type="button" @click="onlyOpen = !onlyOpen">
        {{ onlyOpen ? '待消灭' : '含已清除' }}
      </button>
    </div>

    <p v-if="!list.length" class="page-sub" style="margin-top: 16px">暂无错题。模考或练习答错会自动进来。</p>

    <article v-for="e in list" :key="e.id" class="card" style="margin-top: 12px">
      <div class="row space">
        <span class="tag">{{ ERROR_CAUSE_LABEL[e.cause] }}</span>
        <span class="muted">错 {{ e.wrongCount }} · 连对 {{ e.rightStreak }}/2</span>
      </div>
      <p style="margin: 8px 0; font-weight: 600">{{ e.question }}</p>
      <p class="page-sub">你的答案：{{ e.userAnswer }}</p>
      <p class="page-sub">正确答案：{{ e.correctAnswer }}</p>
      <p class="page-sub">{{ e.analysis }}</p>
      <p class="muted" style="margin-top: 6px">改归因</p>
      <div class="chips">
        <button
          v-for="c in CAUSE_OPTIONS"
          :key="c.value"
          class="chip"
          :class="{ on: e.cause === c.value }"
          type="button"
          @click="study.updateErrorCause(e.id, c.value as ErrorCause)"
        >
          {{ c.label }}
        </button>
      </div>
      <div class="grid2" style="margin-top: 10px">
        <button class="btn sm danger" type="button" @click="retry(e.id, false)">重做仍错</button>
        <button class="btn sm primary" type="button" @click="retry(e.id, true)">重做做对</button>
      </div>
    </article>
  </div>
</template>
