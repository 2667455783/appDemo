import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { checkForUpdate, getLocalVersion } from '@/services/appUpdate'
import type { UpdateManifest } from '@/config/update'

/**
 * 全局更新状态：启动时静默检查，供「我的」Tab 小红点、引导弹窗与「检查更新」共用。
 */
export const useAppUpdateStore = defineStore('appUpdate', () => {
  const localVer = ref('…')
  const localCode = ref(0)
  const checking = ref(false)
  const checkMsg = ref('')
  const remote = ref<UpdateManifest | null>(null)
  const hasUpdate = ref(false)
  const lastCheckedAt = ref(0)
  /** 发现新版本后的全局引导弹窗 */
  const promptOpen = ref(false)
  /** 本次进程内点过「稍后再说」；杀进程重开仍会再弹 */
  let dismissedThisSession = false

  const badgeVisible = computed(() => hasUpdate.value)
  const promptForced = computed(() => Boolean(remote.value?.force && hasUpdate.value))

  function shouldShowPrompt(): boolean {
    if (!hasUpdate.value || !remote.value) return false
    if (remote.value.force) return true
    return !dismissedThisSession
  }

  /** 有更新时弹出（强制更新始终弹；普通更新本次会话未点「稍后再说」才弹） */
  function maybeShowPrompt() {
    if (!shouldShowPrompt()) return
    // 稍延迟，等首屏就绪
    window.setTimeout(() => {
      if (shouldShowPrompt()) promptOpen.value = true
    }, 500)
  }

  function dismissPrompt() {
    promptOpen.value = false
    dismissedThisSession = true
  }

  function closePrompt() {
    promptOpen.value = false
  }

  async function loadLocal() {
    const v = await getLocalVersion()
    localVer.value = v.version
    localCode.value = v.versionCode
  }

  /** 静默检查：失败不打扰用户；有更新则亮红点，并尝试弹出引导 */
  async function silentCheck(force = false) {
    const now = Date.now()
    // 10 分钟内不重复刷
    if (!force && lastCheckedAt.value && now - lastCheckedAt.value < 10 * 60 * 1000) {
      // 仍有更新且尚未弹过，补一次引导
      if (hasUpdate.value) maybeShowPrompt()
      return
    }
    if (checking.value) return
    checking.value = true
    try {
      const r = await checkForUpdate()
      lastCheckedAt.value = Date.now()
      localVer.value = r.local.version
      localCode.value = r.local.versionCode
      if (r.status === 'available') {
        hasUpdate.value = true
        remote.value = r.remote
        maybeShowPrompt()
      } else if (r.status === 'latest') {
        hasUpdate.value = false
        remote.value = r.remote ?? null
        promptOpen.value = false
        dismissedThisSession = false
      }
      // error：保持原有 hasUpdate，不刷掉已有提示
    } finally {
      checking.value = false
    }
  }

  /** 用户点击「检查更新」 */
  async function manualCheck() {
    checking.value = true
    checkMsg.value = ''
    try {
      const r = await checkForUpdate()
      lastCheckedAt.value = Date.now()
      localVer.value = r.local.version
      localCode.value = r.local.versionCode
      if (r.status === 'available') {
        hasUpdate.value = true
        remote.value = r.remote
        checkMsg.value = `发现新版本 ${r.remote.version}`
        maybeShowPrompt()
      } else if (r.status === 'latest') {
        hasUpdate.value = false
        remote.value = r.remote ?? null
        checkMsg.value = '已是最新版本'
        promptOpen.value = false
        dismissedThisSession = false
      } else {
        checkMsg.value = r.message
      }
    } finally {
      checking.value = false
    }
  }

  function clearUpdateFlag() {
    hasUpdate.value = false
    promptOpen.value = false
  }

  function resetAfterUrlChange() {
    remote.value = null
    hasUpdate.value = false
    promptOpen.value = false
    checkMsg.value = '更新地址已保存'
    lastCheckedAt.value = 0
    dismissedThisSession = false
  }

  return {
    localVer,
    localCode,
    checking,
    checkMsg,
    remote,
    hasUpdate,
    badgeVisible,
    promptOpen,
    promptForced,
    loadLocal,
    silentCheck,
    manualCheck,
    clearUpdateFlag,
    resetAfterUrlChange,
    maybeShowPrompt,
    dismissPrompt,
    closePrompt,
  }
})
