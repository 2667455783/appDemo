<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import TabBar from '@/components/TabBar.vue'
import { useAppUpdateStore } from '@/stores/appUpdate'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const showTab = computed(() => route.meta.tab === true)
const update = useAppUpdateStore()
const theme = useThemeStore()

watch(
  () => theme.resolvedAppearance,
  (mode) => {
    if (!Capacitor.isNativePlatform()) return
    StatusBar.setStyle({ style: mode === 'dark' ? Style.Dark : Style.Light }).catch(() => {})
  },
  { immediate: true },
)

onMounted(() => {
  // 进 App 就静默查一次，有新版本则「我的」Tab 亮红点
  void update.silentCheck(true)
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
