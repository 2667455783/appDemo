<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppDialog from '@/components/AppDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  shareToChannel,
  type ShareChannel,
  type SharePlatform,
} from '@/services/shareApp'

const router = useRouter()
const shareMsg = ref('')
const sharing = ref(false)
const pickOpen = ref(false)
const iosTipOpen = ref(false)
const pendingChannel = ref<ShareChannel | null>(null)

const channelLabel = (c: ShareChannel | null) => (c === 'qq' ? 'QQ' : '微信')

function openPick(channel: ShareChannel) {
  if (sharing.value) return
  pendingChannel.value = channel
  shareMsg.value = ''
  pickOpen.value = true
}

function closePick() {
  if (sharing.value) return
  pickOpen.value = false
  pendingChannel.value = null
}

function onIosShare() {
  if (sharing.value) return
  pickOpen.value = false
  pendingChannel.value = null
  iosTipOpen.value = true
}

async function confirmPlatform(platform: SharePlatform) {
  if (platform === 'ios') {
    onIosShare()
    return
  }
  const channel = pendingChannel.value
  if (!channel || sharing.value) return
  pickOpen.value = false
  sharing.value = true
  shareMsg.value = '正在准备安卓安装包…'
  try {
    const r = await shareToChannel(channel, platform)
    shareMsg.value = r.message
  } finally {
    sharing.value = false
    pendingChannel.value = null
  }
}
</script>

<template>
  <div class="page full">
    <PageHeader
      title="推荐给朋友"
      subtle="先选微信或 QQ，再选安卓包发给好友"
      @back="router.back()"
    />

    <div class="card share-card">
      <div class="share-row">
        <button class="share-btn wechat" type="button" :disabled="sharing" @click="openPick('wechat')">
          <span class="share-ico" aria-hidden="true">微</span>
          微信好友
        </button>
        <button class="share-btn qq" type="button" :disabled="sharing" @click="openPick('qq')">
          <span class="share-ico" aria-hidden="true">Q</span>
          QQ 好友
        </button>
      </div>
      <p v-if="shareMsg" class="page-sub" style="margin-top: 8px">{{ shareMsg }}</p>
    </div>

    <AppDialog
      :open="pickOpen"
      :title="`分享到${channelLabel(pendingChannel)}`"
      message="请选择发给好友的安装包类型"
      primary-text=""
      secondary-text=""
      @close="closePick"
      @update:open="(v) => !v && closePick()"
    >
      <div class="plat-row">
        <button class="plat-btn android" type="button" :disabled="sharing" @click="confirmPlatform('android')">
          <span class="plat-title">安卓 APK</span>
          <span class="plat-desc">发送本机安装包</span>
        </button>
        <button class="plat-btn ios" type="button" :disabled="sharing" @click="onIosShare">
          <span class="plat-title">iOS 链接</span>
          <span class="plat-desc">即将上线</span>
        </button>
      </div>
    </AppDialog>

    <AppDialog
      :open="iosTipOpen"
      title="提示"
      message="IOS包待上线,敬请期待"
      primary-text="知道了"
      secondary-text=""
      @primary="iosTipOpen = false"
      @close="iosTipOpen = false"
      @update:open="(v) => (iosTipOpen = v)"
    />
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

.plat-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.plat-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--paper-2, #fff);
  text-align: left;
  cursor: pointer;
}
.plat-btn:disabled {
  opacity: 0.6;
}
.plat-btn.android {
  border-color: color-mix(in srgb, #3ddc84 45%, var(--line));
  background: color-mix(in srgb, #3ddc84 10%, var(--paper-2, #fff));
}
.plat-btn.ios {
  border-color: color-mix(in srgb, #555 35%, var(--line));
  background: color-mix(in srgb, #111 6%, var(--paper-2, #fff));
}
.plat-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}
.plat-desc {
  font-size: 12px;
  color: var(--ink-soft);
}
</style>
