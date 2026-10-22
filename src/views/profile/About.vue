<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'

const router = useRouter()
</script>

<template>
  <div class="page full">
    <PageHeader title="关于与声明" subtle="学习宝典 · 多学科学习" @back="router.back()" />

    <div class="card">
      <p class="t-title">产品定位</p>
      <p class="page-sub" style="margin-top: 8px">
        学习宝典是个人学习辅助工具，支持在 App 内切换学科（英语 / 编程 / 医药等）。当前
        <strong>英语</strong>已开放单词打卡与作文模板；其它学科内容筹备中。与教育部教育考试院及各考试委员会无隶属或合作关系。
      </p>
    </div>

    <div class="card" style="margin-top: 12px">
      <p class="t-title">内容说明</p>
      <ul class="list">
        <li>不提供考试真题全文，也不提供考试原声听力。</li>
        <li>英语作文模板与范文均为原创或可自由使用的教学示例。</li>
        <li>词表释义参考公开词典数据（含 ECDICT 等），仅供学习参考。</li>
      </ul>
    </div>

    <div class="card" style="margin-top: 12px">
      <p class="t-title">商标与考试名称</p>
      <p class="page-sub" style="margin-top: 8px">
        「四级」「六级」等表述仅用于说明英语四六级的备考用途，不代表官方认证或授权。正式报名与成绩以考试机构公布为准。
      </p>
    </div>
  </div>
</template>

<style scoped>
.t-title {
  font-weight: 700;
  font-size: 15px;
}
.list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.6;
}
</style>
