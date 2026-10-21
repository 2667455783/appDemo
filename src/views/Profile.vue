<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { LEVEL_LABEL } from '@/types'
import { useUserStore } from '@/stores/user'
import { useStudyStore } from '@/stores/study'
import { useAppUpdateStore } from '@/stores/appUpdate'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()
const update = useAppUpdateStore()

const mastered = computed(() => {
  return Object.values(study.vocab).filter((c) => c.correct >= 2 && c.status === 'review').length
})

const examLine = computed(
  () => `${LEVEL_LABEL[user.level]} · 目标 ${user.targetScore} · ${user.examDate}`,
)

const displayMotto = computed(() => {
  if (user.motto.trim()) return user.motto
  const short = user.level === 'cet4' ? '四级' : '六级'
  return `每天进步一点点，目标${short}${user.targetScore}+`
})

function reset() {
  if (!confirm('清除本地学习数据并回到欢迎页？')) return
  user.resetAll()
  router.replace('/welcome')
  location.reload()
}
</script>

<template>
  <div class="page">
    <PageHeader title="我的" :subtle="examLine" :back="false" />

    <div class="user-card">
      <div class="avatar" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="56" height="56">
          <circle cx="32" cy="32" r="32" fill="var(--paper)" />
          <path
            d="M18 54c2-11 8-16 14-16s12 5 14 16"
            fill="none"
            stroke="var(--ink)"
            stroke-width="1.6"
            stroke-linecap="round"
          />
          <path
            d="M22 28c1-9 6-14 10-14 5 0 10 5 11 14 0 6-4 11-10.5 11S22 34 22 28Z"
            fill="none"
            stroke="var(--ink)"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path d="M24 26c2 2 4 2 8 0" fill="none" stroke="var(--ink)" stroke-width="1.4" stroke-linecap="round" />
          <circle cx="27.5" cy="29.5" r="1.1" fill="var(--ink)" />
          <circle cx="36.2" cy="29.5" r="1.1" fill="var(--ink)" />
          <path d="M30.5 33.2c1.2 1.2 3.2 1.2 4.4 0" fill="none" stroke="var(--ink)" stroke-width="1.3" stroke-linecap="round" />
          <path d="M24 46.5 32 42l8 4.5v8.5H24v-8.5Z" fill="var(--paper-2)" stroke="var(--ink)" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M32 42v9" fill="none" stroke="var(--ink)" stroke-width="1.3" />
        </svg>
      </div>
      <div class="user-meta">
        <p class="user-name">{{ user.name }}</p>
        <p class="user-date">{{ user.birthday || '未设置生日' }}</p>
        <p class="user-motto">{{ displayMotto }}</p>
      </div>
      <div class="user-actions">
        <button class="icon-btn" type="button" aria-label="编辑资料" @click="router.push('/profile/edit')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 20h4.2L19.4 8.8a1.6 1.6 0 0 0 0-2.3L16.5 3.6a1.6 1.6 0 0 0-2.3 0L3 14.8V20Z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linejoin="round"
            />
            <path d="M13.2 5.8 17.2 9.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
        </button>
        <button class="icon-btn" type="button" aria-label="设置" @click="router.push('/profile/settings')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" />
            <path
              d="M19.4 13a7.8 7.8 0 0 0 .1-2l2-1.5-2-3.4-2.3.5a7.6 7.6 0 0 0-1.7-1L13 2h-2l-.5 2.6a7.6 7.6 0 0 0-1.7 1L6.5 6.1 4.5 9.5 6.5 11a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.3-.5a7.6 7.6 0 0 0 1.7 1L11 22h2l.5-2.6a7.6 7.6 0 0 0 1.7-1l2.3.5 2-3.4-2-1.5Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>
          <span v-if="update.hasUpdate" class="sec-dot" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <p class="muted">连续打卡</p>
        <p class="num">{{ user.streak }}</p>
      </div>
      <div class="card">
        <p class="muted">掌握词汇</p>
        <p class="num">{{ mastered }}</p>
      </div>
    </div>

    <div class="card" style="margin-top: 16px">
      <p class="muted">学习数据</p>
      <p class="page-sub">
        掌握词汇 {{ mastered }} · 错词 {{ study.wrongWordIds.length }} · 模板收藏见写作页
      </p>
    </div>

    <button class="btn ghost block" style="margin-top: 16px" type="button" @click="router.push('/profile/reminder')">
      学习提醒
    </button>
    <button class="btn ghost block" style="margin-top: 10px" type="button" @click="router.push('/translate')">
      翻译工具
    </button>
    <button class="btn ghost block" style="margin-top: 10px" type="button" @click="router.push('/profile/about')">
      关于与声明
    </button>
    <button class="btn danger block" style="margin-top: 10px" type="button" @click="reset">重置本地数据</button>
  </div>
</template>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px 14px 14px;
  background: var(--paper-2);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.avatar {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--paper);
}
.user-meta {
  flex: 1;
  min-width: 0;
}
.user-name {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-date {
  margin-top: 4px;
  font-size: 13px;
  color: var(--ink-soft);
}
.user-motto {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.user-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}
.icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--muted);
}
.num {
  font-family: var(--serif);
  font-size: 28px;
}
.sec-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--coral);
  box-shadow: 0 0 0 2px rgba(184, 92, 74, 0.2);
}
</style>
