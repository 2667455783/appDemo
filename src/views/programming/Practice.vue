<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'

const router = useRouter()

const entries = [
  {
    id: 'examples',
    title: '示例练习',
    desc: '片段沙箱 · JS / Python / Vue / React 等',
    route: '/d/programming/examples',
  },
  {
    id: 'workbench',
    title: '项目工作台',
    desc: 'Git / 项目模板 · 资源管理器与本地运行',
    route: '/d/programming/workbench',
  },
] as const
</script>

<template>
  <div class="page practice">
    <PageHeader title="代码练习" subtle="选择示例练习或项目工作台" @back="router.replace('/')" />

    <nav class="entry-tabs" aria-label="练习入口">
      <button
        v-for="e in entries"
        :key="e.id"
        class="entry-tab"
        type="button"
        @click="router.push(e.route)"
      >
        <span class="entry-text">
          <span class="entry-title">{{ e.title }}</span>
          <span class="entry-desc">{{ e.desc }}</span>
        </span>
        <span class="entry-go">进入</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.practice {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry-tabs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entry-tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin: 0;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--moss) 45%, var(--paper));
  text-align: left;
  cursor: pointer;
}

.entry-tab:active {
  border-color: var(--forest);
}

.entry-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.entry-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.entry-desc {
  font-size: 12px;
  color: var(--ink-soft);
  line-height: 1.4;
}

.entry-go {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--forest);
}
</style>
