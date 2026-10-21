<script setup lang="ts">
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppUpdateStore } from '@/stores/appUpdate'

const route = useRoute()
const { badgeVisible } = storeToRefs(useAppUpdateStore())

const tabs = [
  { to: '/', label: '首页', icon: 'home' },
  { to: '/vocab', label: '单词', icon: 'vocab' },
  { to: '/writing', label: '写作', icon: 'write' },
  { to: '/profile', label: '我的', icon: 'me' },
]

function active(to: string) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav class="tabbar">
    <router-link v-for="t in tabs" :key="t.to" :to="t.to" :class="{ active: active(t.to) }">
      <span class="icon-wrap">
        <svg v-if="t.icon === 'home'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" stroke-width="1.7" />
        </svg>
        <svg v-else-if="t.icon === 'vocab'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M5 5h6a2 2 0 0 1 2 2v12l-3-1.5L7 19V7a2 2 0 0 0-2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
          <path d="M19 5h-6a2 2 0 0 0-2 2v12l3-1.5L17 19V7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
        </svg>
        <svg v-else-if="t.icon === 'write'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M5 19h4.2L18.5 9.7a1.6 1.6 0 0 0 0-2.3L15.8 4.7a1.6 1.6 0 0 0-2.3 0L4 14.2V19Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
          <path d="M12.8 6.2 16.5 10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7" />
          <path d="M5 19c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        <span
          v-if="t.to === '/profile' && badgeVisible"
          class="tab-dot"
          aria-label="有新版本"
        />
      </span>
      {{ t.label }}
    </router-link>
  </nav>
</template>

<style scoped>
.icon-wrap {
  position: relative;
  display: inline-flex;
  line-height: 0;
}
.tab-dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--coral);
  border: 1.5px solid var(--paper-2);
}
</style>
