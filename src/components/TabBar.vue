<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppIcon, { type AppIconName } from '@/components/AppIcon.vue'
import { useAppUpdateStore } from '@/stores/appUpdate'
import { useUserStore } from '@/stores/user'

const tabIconMap: Record<string, AppIconName> = {
  home: 'home',
  vocab: 'book',
  write: 'edit',
  learn: 'safety',
  practice: 'plus-square',
  me: 'user',
}

const route = useRoute()
const user = useUserStore()
const { badgeVisible } = storeToRefs(useAppUpdateStore())

const tabs = computed(() => {
  const mid = user.activeDomain.tabs
  return [
    { to: '/', label: '首页', icon: 'home' as const },
    ...mid.map((t) => ({ to: t.route, label: t.label, icon: t.icon })),
    { to: '/profile', label: '我的', icon: 'me' as const },
  ]
})

function active(to: string) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav class="tabbar">
    <router-link v-for="t in tabs" :key="t.to" :to="t.to" :class="{ active: active(t.to) }">
      <span class="icon-wrap">
        <AppIcon :name="tabIconMap[t.icon] || 'user'" :size="20" />
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
