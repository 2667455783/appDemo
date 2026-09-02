<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'

const router = useRouter()

const items = [
  { title: '词汇', desc: '间隔重复 · 词在题中', route: '/train/vocab', tag: '底座' },
  { title: '四六级词典', desc: '四级 / 六级 · A–Z 注释与用法', route: '/train/dictionary', tag: '词表' },
  { title: '听力', desc: '预读选项 · 精听听写', route: '/train/listening', tag: '35%' },
  { title: '阅读理解', desc: '仔细阅读 / 长篇匹配 / 选词填空', route: '/train/reading', tag: '35%' },
  { title: '写作', desc: '脚手架 · 范文对照', route: '/train/writing', tag: '15%' },
  { title: '翻译', desc: '划线句 · 整段 · 汉译英', route: '/train/translation', tag: '15%' },
  { title: '模板管理', desc: '作文模板 · 必背短句', route: '/train/templates', tag: '模板' },
  { title: '语法卡片', desc: '写译会扣分的点', route: '/train/grammar', tag: '短训' },
]
</script>

<template>
  <div class="page">
    <PageHeader title="题型训练" subtle="按官方卷结构拆开练。套卷留给模考页。" :back="false" />
    <button
      v-for="item in items"
      :key="item.route"
      class="card row space item"
      type="button"
      @click="router.push(item.route)"
    >
      <div>
        <p class="name">{{ item.title }}</p>
        <p class="page-sub">{{ item.desc }}</p>
      </div>
      <span class="tag green">{{ item.tag }}</span>
    </button>
  </div>
</template>

<style scoped>
.item {
  width: 100%;
  text-align: left;
  margin-top: 12px;
  cursor: pointer;
}
.name {
  font-family: var(--serif);
  font-size: 18px;
}
</style>
