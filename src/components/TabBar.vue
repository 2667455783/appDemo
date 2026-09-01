<script setup lang="ts">
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppUpdateStore } from '@/stores/appUpdate'

const route = useRoute()
const { badgeVisible } = storeToRefs(useAppUpdateStore())

const tabs = [
  { to: '/', label: '首页', icon: 'home' },
  { to: '/train', label: '题型', icon: 'train' },
  { to: '/mock', label: '模考', icon: 'mock' },
  { to: '/translate', label: '翻译', icon: 'tr' },
  { to: '/diagnosis', label: '诊断', icon: 'diag' },
  { to: '/profile', label: '我的', icon: 'me' },
]

function active(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <nav class="tabbar">
    <router-link v-for="t in tabs" :key="t.to" :to="t.to" :class="{ active: active(t.to) }">
      <span class="icon-wrap">
        <svg v-if="t.icon === 'home'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" stroke-width="1.7" />
        </svg>
        <svg v-else-if="t.icon === 'train'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M5 6h14M5 12h10M5 18h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        <svg v-else-if="t.icon === 'mock'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.7" />
          <path d="M8 9h8M8 13h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        <svg v-else-if="t.icon === 'tr'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 5h7M8 5v6c0 2-1.5 3.5-4 4M5 11c1.5 1 3 1.5 5 1.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M13 19l4-9 4 9M14.5 16h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else-if="t.icon === 'diag'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 3 20 8v8l-8 5-8-5V8l8-5Z" stroke="currentColor" stroke-width="1.7" />
          <path d="M12 8v5M12 16.5v.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
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
  border: 1.5px solid #fffaf2;
}
</style>
