<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import type { ReadingKind } from '@/types'

const route = useRoute()
const router = useRouter()
const kind = computed(() => route.params.kind as string | undefined)

const items: { kind: ReadingKind; title: string; weight: string; desc: string }[] = [
  { kind: 'careful', title: '仔细阅读', weight: '20%', desc: '2 篇 × 5 题选择题 · 题干定位 → 回原文 → 拆干扰项' },
  { kind: 'match', title: '长篇阅读（信息匹配）', weight: '10%', desc: '10 句匹配段落 · 主旨 + 定位词，建议 12–15 分钟' },
  { kind: 'cloze', title: '选词填空', weight: '5%', desc: '15 词选 10 · 先判词性再看搭配，不是纯蒙' },
]
</script>

<template>
  <div class="page full">
    <PageHeader title="阅读理解" subtle="这三项合起来就是 CET 卷面的阅读理解部分，共 35%" @back="router.back()" />
    <button
      v-for="item in items"
      :key="item.kind"
      class="card item"
      type="button"
      @click="router.push(`/train/reading/${item.kind}`)"
    >
      <div class="row space">
        <p class="name">{{ item.title }}</p>
        <span class="tag green">权重 {{ item.weight }}</span>
      </div>
      <p class="page-sub">{{ item.desc }}</p>
    </button>
    <p v-if="kind" class="muted">当前：{{ kind }}</p>
  </div>
</template>

<style scoped>
.item {
  width: 100%;
  text-align: left;
  margin-top: 12px;
}
.name {
  font-family: var(--serif);
  font-size: 18px;
}
</style>
