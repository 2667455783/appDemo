<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PageHeader from '@/components/PageHeader.vue'
import { listEnabledDomains } from '@/domains/registry'
import type { DomainId } from '@/domains/types'
import { useUserStore } from '@/stores/user'
import { useStudyStore } from '@/stores/study'
import { useAppUpdateStore } from '@/stores/appUpdate'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()
const update = useAppUpdateStore()
const domains = listEnabledDomains()

const mastered = computed(() => {
  return Object.values(study.vocab).filter((c) => c.correct >= 2 && c.status === 'review').length
})

const examLine = computed(() => {
  if (user.activeDomainId === 'english') {
    return `${user.activeLevelLabel} · 目标 ${user.targetScore} · ${user.examDate}`
  }
  return `${user.activeDomain.name} · ${user.activeLevelLabel}`
})

const displayMotto = computed(() => {
  if (user.motto.trim()) return user.motto
  if (user.activeDomainId === 'english') {
    const short = user.level === 'cet4' ? '四级' : '六级'
    return `每天进步一点点，目标${short}${user.targetScore}+`
  }
  return `正在学习「${user.activeDomain.name}」，持续打卡`
})

const isEnglish = computed(() => user.activeDomainId === 'english')

function selectDomain(id: DomainId) {
  if (id === user.activeDomainId) return
  user.setActiveDomain(id)
  router.replace('/')
}

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
        <AppIcon name="user" :size="36" />
      </div>
      <div class="user-meta">
        <p class="user-name">{{ user.name }}</p>
        <p class="user-date">{{ user.birthday || '未设置生日' }}</p>
        <p class="user-motto">{{ displayMotto }}</p>
      </div>
      <div class="user-actions">
        <button class="icon-btn" type="button" aria-label="编辑资料" @click="router.push('/profile/edit')">
          <AppIcon name="edit" :size="20" />
        </button>
        <button class="icon-btn" type="button" aria-label="设置" @click="router.push('/profile/settings')">
          <AppIcon name="setting" :size="20" />
          <span v-if="update.hasUpdate" class="sec-dot" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="card" style="margin-top: 14px">
      <p class="muted">学习学科</p>
      <div class="chips" style="margin-top: 10px">
        <button
          v-for="d in domains"
          :key="d.id"
          class="chip"
          :class="{ on: user.activeDomainId === d.id }"
          type="button"
          @click="selectDomain(d.id)"
        >
          {{ d.name }}
          <span v-if="!d.hasContent" class="chip-soon">筹</span>
        </button>
      </div>
      <p class="page-sub" style="margin-top: 8px">
        切换学科后，学习进度按学科分别保存。
      </p>
    </div>

    <div class="grid2" style="margin-top: 16px">
      <div class="card">
        <p class="muted">连续打卡</p>
        <p class="num">{{ user.streak }}</p>
      </div>
      <div class="card">
        <p class="muted">{{ isEnglish ? '掌握词汇' : '今日完成' }}</p>
        <p class="num">
          {{ isEnglish ? mastered : study.todayTasks.filter((t) => t.done).length }}
        </p>
      </div>
    </div>

    <div v-if="isEnglish" class="card" style="margin-top: 16px">
      <p class="muted">学习数据</p>
      <p class="page-sub">
        掌握词汇 {{ mastered }} · 错词 {{ study.wrongWordIds.length }} · 模板收藏见写作页
      </p>
    </div>

    <button class="btn ghost block" style="margin-top: 16px" type="button" @click="router.push('/profile/reminder')">
      学习提醒
    </button>
    <button
      v-if="isEnglish"
      class="btn ghost block"
      style="margin-top: 10px"
      type="button"
      @click="router.push('/translate')"
    >
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
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
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
.chip-soon {
  margin-left: 4px;
  font-size: 10px;
  opacity: 0.75;
}
</style>
