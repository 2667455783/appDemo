<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { getDomain, isDomainId } from '@/domains/registry'
import type { DomainId } from '@/domains/types'

const route = useRoute()
const router = useRouter()

const domainId = computed<DomainId>(() => {
  const raw = route.params.domainId
  const id = Array.isArray(raw) ? raw[0] : raw
  return id && isDomainId(id) ? id : 'english'
})

const domain = computed(() => getDomain(domainId.value))
const section = computed(() => {
  const s = route.params.section
  return (Array.isArray(s) ? s[0] : s) || 'learn'
})

const title = computed(() => {
  const tab = domain.value.tabs.find((t) => t.id === section.value)
  return tab?.label ?? domain.value.name
})
</script>

<template>
  <div class="page full">
    <PageHeader :title="title" :subtle="`${domain.name} · 内容筹备中`" @back="router.replace('/')" />
    <div class="card">
      <p class="t-title">{{ domain.name }}学习即将上线</p>
      <p class="page-sub" style="margin-top: 8px">
        当前为可插拔学科占位页。可在「我的 → 学习学科」切换回英语，继续背词与写作练习。
      </p>
      <button class="btn primary block" style="margin-top: 16px" type="button" @click="router.push('/profile')">
        去切换学科
      </button>
    </div>
  </div>
</template>

<style scoped>
.t-title {
  font-weight: 700;
  font-size: 15px;
}
</style>
