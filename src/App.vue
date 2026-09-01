<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import { useAppUpdateStore } from '@/stores/appUpdate'

const route = useRoute()
const showTab = computed(() => route.meta.tab === true)
const update = useAppUpdateStore()

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
