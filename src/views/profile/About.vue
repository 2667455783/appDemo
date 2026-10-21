<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'

const router = useRouter()
</script>

<template>
  <div class="page full">
    <PageHeader title="关于与声明" subtle="知卷 · 四六级备考辅助" @back="router.back()" />

    <div class="card">
      <p class="t-title">产品定位</p>
      <p class="page-sub" style="margin-top: 8px">
        知卷专注于<strong>单词打卡</strong>与<strong>作文范文模板</strong>，帮助考生建立每日节奏与写作脚手架。本应用为个人学习辅助工具，与教育部教育考试院及全国大学英语四、六级考试委员会无隶属或合作关系。
      </p>
    </div>

    <div class="card" style="margin-top: 12px">
      <p class="t-title">内容说明</p>
      <ul class="list">
        <li>不提供考试真题全文，也不提供考试原声听力。</li>
        <li>作文模板与范文均为原创或可自由使用的教学示例。</li>
        <li>词表释义参考公开词典数据（含 ECDICT 等），仅供学习参考。</li>
      </ul>
    </div>

    <div class="card" style="margin-top: 12px">
      <p class="t-title">商标与考试名称</p>
      <p class="page-sub" style="margin-top: 8px">
        「四级」「六级」等表述仅用于说明备考用途，不代表官方认证或授权。正式报名与成绩以考试机构公布为准。
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
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--muted, #666);
  font-size: 13px;
  line-height: 1.7;
}
</style>
