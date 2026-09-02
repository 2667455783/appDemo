<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import type { ExamLevel, TargetScore } from '@/types'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()

const form = reactive({
  name: user.name,
  birthday: user.birthday,
  motto: user.motto,
  level: user.level as ExamLevel,
  targetScore: user.targetScore as TargetScore,
  examDate: user.examDate,
})

function save() {
  user.updateProfile({
    name: form.name,
    birthday: form.birthday,
    motto: form.motto.trim(),
    level: form.level,
    targetScore: form.targetScore,
    examDate: form.examDate,
  })
  router.back()
}
</script>

<template>
  <div class="page full">
    <PageHeader title="编辑资料" subtle="修改「我的」页展示的个人信息" @back="router.back()" />

    <div class="stack">
      <div class="field">
        <label>昵称</label>
        <input v-model="form.name" maxlength="12" placeholder="例如 四级备考小达人" />
      </div>
      <div class="field">
        <label>生日</label>
        <input v-model="form.birthday" type="date" />
      </div>
      <div class="field">
        <label>签名</label>
        <input v-model="form.motto" maxlength="32" placeholder="每天进步一点点，目标四级425+" />
      </div>
      <div>
        <p class="muted" style="margin-bottom: 8px">等级</p>
        <div class="chips">
          <button class="chip" :class="{ on: form.level === 'cet4' }" type="button" @click="form.level = 'cet4'">四级</button>
          <button class="chip" :class="{ on: form.level === 'cet6' }" type="button" @click="form.level = 'cet6'">六级</button>
        </div>
      </div>
      <div>
        <p class="muted" style="margin-bottom: 8px">目标分</p>
        <div class="chips">
          <button class="chip" :class="{ on: form.targetScore === 425 }" type="button" @click="form.targetScore = 425">425 过线</button>
          <button class="chip" :class="{ on: form.targetScore === 550 }" type="button" @click="form.targetScore = 550">550 优秀</button>
          <button class="chip" :class="{ on: form.targetScore === 600 }" type="button" @click="form.targetScore = 600">600 冲刺</button>
        </div>
      </div>
      <div class="field">
        <label>考试日期</label>
        <input v-model="form.examDate" type="date" />
      </div>
      <button class="btn primary block" type="button" @click="save">保存</button>
    </div>
  </div>
</template>
