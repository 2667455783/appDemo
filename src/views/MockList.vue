<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'

/** 模考入口已从主路径下线；保留页面避免旧链接空白 */
const router = useRouter()
</script>

<template>
  <div class="page full">
    <PageHeader title="模拟练习" subtle="主产品已改为单词 + 写作模板" @back="router.replace('/')" />
    <div class="card">
      <p>完整套卷模考已从主导航移除，便于上架合规。</p>
      <p class="page-sub" style="margin-top: 8px">请使用首页今日任务，或进入「单词」「写作」。</p>
      <button class="btn primary block" style="margin-top: 12px" type="button" @click="router.replace('/vocab')">
        去背词
      </button>
      <button class="btn ghost block" style="margin-top: 10px" type="button" @click="router.replace('/writing')">
        去写作
      </button>
    </div>
  </div>
</template>
