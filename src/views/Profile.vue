<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LEVEL_LABEL } from '@/types'
import type { ExamLevel, TargetScore } from '@/types'
import { useUserStore } from '@/stores/user'
import { useStudyStore } from '@/stores/study'
import { useAppUpdateStore } from '@/stores/appUpdate'
import { getManifestUrl, openApkDownload, setManifestUrl } from '@/services/appUpdate'
import { copyShareLink, shareToQQ, shareToWeChat } from '@/services/shareApp'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()
const update = useAppUpdateStore()

const mastered = computed(() => {
  return Object.values(study.vocab).filter((c) => c.correct >= 2 && c.status === 'review').length
})

const manifestInput = ref(getManifestUrl())
const showUrlEdit = ref(false)
const shareMsg = ref('')
const sharing = ref(false)

onMounted(async () => {
  await update.loadLocal()
  await update.silentCheck(true)
})

function setLevel(level: ExamLevel) {
  user.updateProfile({ level })
}
function setTarget(targetScore: TargetScore) {
  user.updateProfile({ targetScore })
}

function reset() {
  if (!confirm('清除本地学习数据并回到欢迎页？')) return
  user.resetAll()
  router.replace('/welcome')
  location.reload()
}

function saveManifestUrl() {
  setManifestUrl(manifestInput.value)
  update.resetAfterUrlChange()
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
  <div class="page">
    <h1 class="page-title">{{ user.name }}</h1>
    <p class="page-sub">{{ LEVEL_LABEL[user.level] }} · 目标 {{ user.targetScore }} · {{ user.examDate }}</p>

    <div class="grid2" style="margin-top: 16px">
      <div class="card">
        <p class="muted">连续打卡</p>
        <p class="num">{{ user.streak }}</p>
      </div>
      <div class="card">
        <p class="muted">掌握词汇</p>
        <p class="num">{{ mastered }}</p>
      </div>
    </div>

    <p class="section-h">等级</p>
    <div class="chips">
      <button class="chip" :class="{ on: user.level === 'cet4' }" type="button" @click="setLevel('cet4')">四级</button>
      <button class="chip" :class="{ on: user.level === 'cet6' }" type="button" @click="setLevel('cet6')">六级</button>
    </div>

    <p class="section-h">目标分</p>
    <div class="chips">
      <button class="chip" :class="{ on: user.targetScore === 425 }" type="button" @click="setTarget(425)">425 过线</button>
      <button class="chip" :class="{ on: user.targetScore === 550 }" type="button" @click="setTarget(550)">550 优秀</button>
      <button class="chip" :class="{ on: user.targetScore === 600 }" type="button" @click="setTarget(600)">600 冲刺</button>
    </div>

    <div class="field" style="margin-top: 16px">
      <label>考试日期</label>
      <input :value="user.examDate" type="date" @change="user.updateProfile({ examDate: ($event.target as HTMLInputElement).value })" />
    </div>

    <div class="card" style="margin-top: 16px">
      <p class="muted">学习数据</p>
      <p class="page-sub">模考 {{ study.reports.length }} 次 · 错题待消灭 {{ study.openErrors.length }} · 补漏任务 {{ study.gapPlan.length }}</p>
    </div>

    <p class="section-h">
      版本控制
      <span v-if="update.hasUpdate" class="sec-dot" aria-hidden="true" />
    </p>
    <div class="card ver-card">
      <div class="row space">
        <div>
          <p class="muted">当前版本</p>
          <p class="ver">{{ update.localVer }} <span class="code">(#{{ update.localCode }})</span></p>
        </div>
        <button class="btn sm primary check-btn" type="button" :disabled="update.checking" @click="update.manualCheck()">
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
          默认清单：http://134.175.54.151/englishStudy/update.json
          发版：本机执行 npm run release:apk（自动升版本、打包、上传）。
        </p>
      </div>
    </div>

    <p class="section-h">推荐给好友</p>
    <div class="card share-card">
      <p class="page-sub">直接分享本机已安装的 APK，无需联网再下载。</p>
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

    <button class="btn ghost block" style="margin-top: 16px" type="button" @click="router.push('/exam-review')">正考成绩校准</button>
    <button class="btn danger block" style="margin-top: 10px" type="button" @click="reset">重置演示数据</button>
  </div>
</template>

<style scoped>
.num {
  font-family: var(--serif);
  font-size: 28px;
}
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
.section-h {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.sec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--coral);
  box-shadow: 0 0 0 2px rgba(184, 92, 74, 0.2);
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
.share-card {
  text-align: left;
}
.share-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
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
