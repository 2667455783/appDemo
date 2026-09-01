<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { TEMPLATE_BY_CATEGORY } from '@/data/templates'
import { TEMPLATE_CATEGORY_LABEL, type TemplateCategory } from '@/types'

const router = useRouter()
const category = ref<TemplateCategory>('writing')
const openId = ref<string | null>(null)

const list = computed(() => TEMPLATE_BY_CATEGORY[category.value])

function toggle(id: string) {
  openId.value = openId.value === id ? null : id
}

function switchCategory(c: TemplateCategory) {
  category.value = c
  openId.value = null
}
</script>

<template>
  <div class="page full">
    <PageHeader title="模板管理" subtle="作文模板 · 必背短句" @back="router.back()" />

    <div class="chips">
      <button
        v-for="(label, key) in TEMPLATE_CATEGORY_LABEL"
        :key="key"
        class="chip"
        :class="{ on: category === key }"
        type="button"
        @click="switchCategory(key as TemplateCategory)"
      >
        {{ label }}
      </button>
    </div>

    <p v-if="!list.length" class="page-sub" style="margin-top: 16px">该分类暂无内容。</p>

    <article v-for="t in list" :key="t.id" class="card" style="margin-top: 12px">
      <button class="tpl-head" type="button" @click="toggle(t.id)">
        <div>
          <span class="tag">{{ t.tag }}</span>
          <p class="tpl-title">{{ t.title }}</p>
          <p class="page-sub">{{ t.summary }}</p>
        </div>
        <span class="muted">{{ openId === t.id ? '收起' : '展开' }}</span>
      </button>

      <div v-if="openId === t.id" class="tpl-body">
        <template v-if="t.phrases?.length">
          <div v-for="p in t.phrases" :key="p.no" class="phrase">
            <span class="no">{{ p.no }}.</span>
            <div class="pair">
              <p class="en">{{ p.en }}</p>
              <p class="zh">{{ p.zh }}</p>
            </div>
          </div>
        </template>
        <template v-else>
          <p v-for="(para, i) in t.paragraphs" :key="i" class="passage para">{{ para }}</p>
        </template>
      </div>
    </article>
  </div>
</template>

<style scoped>
.tpl-head {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  color: inherit;
}
.tpl-title {
  margin: 8px 0 4px;
  font-weight: 700;
}
.tpl-body {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line, #e8e2d6);
}
.para {
  margin: 0 0 10px;
  white-space: pre-line;
}
.para:last-child {
  margin-bottom: 0;
}
.phrase {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.phrase:last-child {
  margin-bottom: 0;
}
.no {
  flex-shrink: 0;
  width: 28px;
  font-size: 13px;
  font-weight: 700;
  color: var(--forest);
  padding-top: 2px;
}
.pair {
  flex: 1;
  min-width: 0;
}
.en {
  margin: 0;
  line-height: 1.5;
  font-weight: 600;
}
.zh {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ink-soft);
  line-height: 1.45;
}
</style>
