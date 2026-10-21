<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { WRITING_TEMPLATES, PHRASE_TEMPLATES } from '@/data/templates'
import { useTemplateFavStore } from '@/stores/templateFav'

const router = useRouter()
const fav = useTemplateFavStore()

const phraseCount = PHRASE_TEMPLATES.reduce((n, t) => n + (t.phrases?.length ?? 0), 0)
</script>

<template>
  <div class="page">
    <PageHeader title="写作" subtle="范文模板 · 必背金句 · 限时套用" :back="false" />

    <button class="card task" type="button" @click="router.push('/writing/fill')">
      <div>
        <p class="t-title">套模板练习</p>
        <p class="page-sub">填空生成成稿 · 对照范文骨架</p>
      </div>
      <span class="tag ink">开始</span>
    </button>

    <button class="card task" type="button" @click="router.push('/train/templates')">
      <div>
        <p class="t-title">模板库</p>
        <p class="page-sub">{{ WRITING_TEMPLATES.length }} 套作文骨架 · 已收藏 {{ fav.ids.length }}</p>
      </div>
      <span class="tag ink">浏览</span>
    </button>

    <button class="card task" type="button" @click="router.push({ path: '/train/templates', query: { tab: 'phrases' } })">
      <div>
        <p class="t-title">必背金句</p>
        <p class="page-sub">开头 / 论点 / 结尾约 {{ phraseCount }} 条</p>
      </div>
      <span class="tag ink">背诵</span>
    </button>

    <button class="card task" type="button" @click="router.push('/train/writing')">
      <div>
        <p class="t-title">限时写作</p>
        <p class="page-sub">自拟话题 · 脚手架成文</p>
      </div>
      <span class="tag ink">练习</span>
    </button>
  </div>
</template>

<style scoped>
.task {
  width: 100%;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.t-title {
  font-weight: 700;
  font-size: 15px;
}
</style>
