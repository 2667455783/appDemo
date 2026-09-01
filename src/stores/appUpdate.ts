import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { checkForUpdate, getLocalVersion } from '@/services/appUpdate'
import type { UpdateManifest } from '@/config/update'

/**
 * 全局更新状态：启动时静默检查，供「我的」Tab 小红点与「检查更新」按钮共用。
 */
export const useAppUpdateStore = defineStore('appUpdate', () => {
  const localVer = ref('…')
  const localCode = ref(0)
  const checking = ref(false)
  const checkMsg = ref('')
  const remote = ref<UpdateManifest | null>(null)
  const hasUpdate = ref(false)
  const lastCheckedAt = ref(0)

  const badgeVisible = computed(() => hasUpdate.value)

  async function loadLocal() {
    const v = await getLocalVersion()
    localVer.value = v.version
    localCode.value = v.versionCode
  }

  /** 静默检查：失败不打扰用户；有更新则亮红点 */
  async function silentCheck(force = false) {
    const now = Date.now()
    // 10 分钟内不重复刷
    if (!force && lastCheckedAt.value && now - lastCheckedAt.value < 10 * 60 * 1000) {
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
      } else if (r.status === 'latest') {
        hasUpdate.value = false
        remote.value = r.remote ?? null
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
      } else if (r.status === 'latest') {
        hasUpdate.value = false
        remote.value = r.remote ?? null
        checkMsg.value = '已是最新版本'
      } else {
        checkMsg.value = r.message
      }
    } finally {
      checking.value = false
    }
  }

  function clearUpdateFlag() {
    hasUpdate.value = false
  }

  function resetAfterUrlChange() {
    remote.value = null
    hasUpdate.value = false
    checkMsg.value = '更新地址已保存'
    lastCheckedAt.value = 0
  }

  return {
    localVer,
    localCode,
    checking,
    checkMsg,
    remote,
    hasUpdate,
    badgeVisible,
    loadLocal,
    silentCheck,
    manualCheck,
    clearUpdateFlag,
    resetAfterUrlChange,
  }
})
