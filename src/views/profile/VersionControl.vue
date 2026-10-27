<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useAppUpdateStore } from '@/stores/appUpdate'
import { getManifestUrl, openApkDownload, setManifestUrl } from '@/services/appUpdate'
import { reportLog } from '@/utils/tracking/tracking-report'

const router = useRouter()
const update = useAppUpdateStore()

const manifestInput = ref(getManifestUrl())
const showUrlEdit = ref(false)

onMounted(async () => {
  await update.loadLocal()
  await update.silentCheck(true)
})

function saveManifestUrl() {
  setManifestUrl(manifestInput.value)
  update.resetAfterUrlChange()
}

function onCheckUpdate() {
  reportLog('click_version_upgrade')
  void update.manualCheck()
}

function onDownload() {
  if (!update.remote?.apkUrl) return
  if (update.remote.apkUrl.includes('example.com')) {
    update.checkMsg = '请先把 update.json 里的 apkUrl 改成真实 APK 下载地址'
    return
  }
  openApkDownload(update.remote.apkUrl)
  update.checkMsg = '已打开下载链接，下载完成后按提示安装（需允许「未知来源」）'
}
</script>

<template>
  <div class="page full">
    <PageHeader title="版本控制" subtle="检查更新并安装新版本" @back="router.back()" />

    <div class="card ver-card">
      <div class="row space">
        <div>
          <p class="muted">当前版本</p>
          <p class="ver">{{ update.localVer }} <span class="code">(#{{ update.localCode }})</span></p>
        </div>
        <button class="btn sm primary check-btn" type="button" :disabled="update.checking" @click="onCheckUpdate">
          {{ update.checking ? '检查中…' : '检查更新' }}
          <span v-if="update.hasUpdate" class="badge-dot" aria-label="有新版本" />
        </button>
      </div>

      <p v-if="update.checkMsg" class="page-sub" style="margin-top: 10px">{{ update.checkMsg }}</p>

      <div v-if="update.hasUpdate && update.remote" class="update-box">
        <p class="update-title">新版本 {{ update.remote.version }}</p>
        <p v-if="update.remote.notes" class="page-sub">{{ update.remote.notes }}</p>
        <p v-if="update.remote.publishedAt" class="muted" style="margin-top: 4px">发布于 {{ update.remote.publishedAt }}</p>
        <button class="btn primary block" style="margin-top: 12px" type="button" @click="onDownload">
          下载并安装
        </button>
      </div>

      <div v-if="showUrlEdit" class="field" style="margin-top: 10px">
        <label>更新清单 URL（update.json）</label>
        <input v-model="manifestInput" type="url" placeholder="https://你的域名/update.json" />
        <button class="btn sm ghost" style="margin-top: 8px" type="button" @click="saveManifestUrl">保存地址</button>
        <p class="page-sub" style="margin-top: 8px">
          默认清单：https://tjb666.space/englishStudy/update.json
          发版：本机执行 npm run release:apk（自动升版本、打包、上传）。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ver-card {
  text-align: left;
}
.ver {
  font-family: var(--serif);
  font-size: 22px;
  margin: 2px 0 0;
}
.code {
  font-size: 13px;
  color: var(--ink-soft);
  font-family: inherit;
}
.update-box {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}
.update-title {
  margin: 0;
  font-weight: 700;
  color: var(--forest);
}
.check-btn {
  position: relative;
}
.badge-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--coral);
  border: 2px solid var(--paper-2);
  box-shadow: 0 0 0 1px rgba(184, 92, 74, 0.35);
}
</style>
