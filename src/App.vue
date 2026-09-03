<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import TabBar from '@/components/TabBar.vue'
import { bindReminderReceived, bindReminderTap } from '@/services/reminder'
import { useAppUpdateStore } from '@/stores/appUpdate'
import { useReminderStore } from '@/stores/reminder'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const router = useRouter()
const showTab = computed(() => route.meta.tab === true)
const update = useAppUpdateStore()
const theme = useThemeStore()
const reminder = useReminderStore()

let unbindReminderTap: (() => void) | undefined
let unbindReminderReceived: (() => void) | undefined
let appStateSub: { remove: () => Promise<void> } | undefined

watch(
  () => theme.resolvedAppearance,
  (mode) => {
    if (!Capacitor.isNativePlatform()) return
    StatusBar.setStyle({ style: mode === 'dark' ? Style.Dark : Style.Light }).catch(() => {})
  },
  { immediate: true },
)

onMounted(() => {
  void update.silentCheck(true)
  unbindReminderTap = bindReminderTap(router)
  if (Capacitor.isNativePlatform()) {
    unbindReminderReceived = bindReminderReceived(() => {
      void reminder.replenish()
    })
    void reminder.replenish()
    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void reminder.replenish()
    }).then((h) => {
      appStateSub = h
    })
  }
})

onUnmounted(() => {
  unbindReminderTap?.()
  unbindReminderReceived?.()
  void appStateSub?.remove()
})
</script>

<template>
  <div class="stage">
    <div class="phone">
      <router-view />
      <TabBar v-if="showTab" />
    </div>
  </div>
</template>
