<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { copyShareLink, shareToQQ, shareToWeChat } from '@/services/shareApp'

const router = useRouter()
const shareMsg = ref('')
const sharing = ref(false)

async function onShare(target: 'wechat' | 'qq' | 'copy') {
  if (sharing.value) return
  sharing.value = true
  shareMsg.value = target === 'copy' ? '' : '正在准备本机安装包…'
  try {
    const r =
      target === 'wechat'
        ? await shareToWeChat()
        : target === 'qq'
          ? await shareToQQ()
          : await copyShareLink()
    shareMsg.value = r.message
  } finally {
    sharing.value = false
  }
}
</script>

<template>
  <div class="page full">
    <PageHeader title="推荐给朋友" subtle="直接分享本机已安装的 APK，无需联网再下载" @back="router.back()" />

    <div class="card share-card">
      <div class="share-row">
        <button class="share-btn wechat" type="button" :disabled="sharing" @click="onShare('wechat')">
          <span class="share-ico" aria-hidden="true">微</span>
          微信好友
        </button>
        <button class="share-btn qq" type="button" :disabled="sharing" @click="onShare('qq')">
          <span class="share-ico" aria-hidden="true">Q</span>
          QQ 好友
        </button>
      </div>
      <button class="btn sm ghost block" style="margin-top: 10px" type="button" :disabled="sharing" @click="onShare('copy')">
        仅复制下载链接（备用）
      </button>
      <p v-if="shareMsg" class="page-sub" style="margin-top: 8px">{{ shareMsg }}</p>
    </div>
  </div>
</template>

<style scoped>
.share-card {
  text-align: left;
}
.share-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--line);
  font-weight: 700;
  font-size: 14px;
  color: #fff;
}
.share-btn:disabled {
  opacity: 0.6;
}
.share-btn.wechat {
  background: #07c160;
  border-color: #07c160;
}
.share-btn.qq {
  background: #12b7f5;
  border-color: #12b7f5;
}
.share-ico {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.22);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
}
</style>
