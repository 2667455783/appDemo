<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import AppDialog from '@/components/AppDialog.vue'
import TabBar from '@/components/TabBar.vue'
import { bindReminderReceived, bindReminderTap } from '@/services/reminder'
import { openApkDownload } from '@/services/appUpdate'
import { useAppUpdateStore } from '@/stores/appUpdate'
import { useReminderStore } from '@/stores/reminder'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const router = useRouter()
const showTab = computed(() => route.meta.tab === true)
const update = useAppUpdateStore()
const { promptOpen } = storeToRefs(update)
const theme = useThemeStore()
const reminder = useReminderStore()
const isNative = Capacitor.isNativePlatform()

const updatePromptMessage = computed(() => {
  const r = update.remote
  if (!r) return '检测到新版本，建议立即更新以获得更好体验。'
  const notes = r.notes?.trim()
  const when = r.publishedAt ? `\n发布于 ${r.publishedAt}` : ''
  if (notes) return `${notes}${when}`
  return `新版本 ${r.version} 已发布，建议更新后继续使用。${when}`
})

let unbindReminderTap: (() => void) | undefined
let unbindReminderReceived: (() => void) | undefined
let appStateSub: { remove: () => Promise<void> } | undefined
let backButtonSub: { remove: () => Promise<void> } | undefined

watch(
  () => theme.resolvedAppearance,
  (mode) => {
    if (!Capacitor.isNativePlatform()) return
    StatusBar.setStyle({ style: mode === 'dark' ? Style.Dark : Style.Light }).catch(() => {})
  },
  { immediate: true },
)

/** 已在版本页时不必再挡一层弹窗 */
watch(
  () => route.path,
  (path) => {
    if (path === '/profile/version' && update.promptOpen && !update.promptForced) {
      update.closePrompt()
    }
  },
)

function onUpdatePrimary() {
  const apk = update.remote?.apkUrl?.trim()
  if (apk && !apk.includes('example.com') && isNative) {
    openApkDownload(apk)
    if (!update.promptForced) update.closePrompt()
    return
  }
  update.closePrompt()
  void router.push('/profile/version')
}

function onUpdateSecondary() {
  update.dismissPrompt()
}

onMounted(() => {
  void update.silentCheck(true)
  unbindReminderTap = bindReminderTap(router)
  if (Capacitor.isNativePlatform()) {
    unbindReminderReceived = bindReminderReceived(() => {
      void reminder.replenish()
    })
    void reminder.replenish()
    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void reminder.replenish()
        void update.silentCheck()
      }
    }).then((h) => {
      appStateSub = h
    })
    // 系统侧滑 / 物理返回：先关弹窗，再走路由返回
    void CapApp.addListener('backButton', ({ canGoBack }) => {
      if (update.promptOpen) {
        if (update.promptForced) return
        update.dismissPrompt()
        return
      }
      if (canGoBack || window.history.length > 1) {
        router.back()
        return
      }
      void CapApp.exitApp()
    }).then((h) => {
      backButtonSub = h
    })
  }
})

onUnmounted(() => {
  unbindReminderTap?.()
  unbindReminderReceived?.()
  void appStateSub?.remove()
  void backButtonSub?.remove()
})
</script>

<template>
  <div class="stage">
    <div class="phone">
      <div class="phone-main">
        <router-view v-slot="{ Component }">
          <keep-alive include="VocabDictionary">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
      <!-- 文档流占位，不再 absolute 悬在内容上 -->
      <TabBar v-if="showTab" />

      <AppDialog
        v-model:open="promptOpen"
        :title="update.remote ? `发现新版本 ${update.remote.version}` : '发现新版本'"
        :message="updatePromptMessage"
        :primary-text="isNative ? '立即更新' : '去更新'"
        :secondary-text="update.promptForced ? '' : '稍后再说'"
        :closable="!update.promptForced"
        @primary="onUpdatePrimary"
        @secondary="onUpdateSecondary"
        @close="onUpdateSecondary"
      />
    </div>
  </div>
</template>
