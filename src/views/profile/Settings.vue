<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useAppUpdateStore } from '@/stores/appUpdate'
import { useVoicePrefStore } from '@/stores/voicePref'
import { useThemeStore } from '@/stores/theme'
import { useReminderStore } from '@/stores/reminder'

const router = useRouter()
const update = useAppUpdateStore()
const voicePref = useVoicePrefStore()
const theme = useThemeStore()
const reminder = useReminderStore()

onMounted(() => {
  void update.loadLocal()
})
</script>

<template>
  <div class="page full">
    <PageHeader title="设置" @back="router.back()" />

    <button class="btn ghost block menu-entry" type="button" @click="router.push('/profile/version')">
      <span class="menu-label">
        版本控制
        <span v-if="update.hasUpdate" class="sec-dot" aria-hidden="true" />
      </span>
      <span class="menu-now">{{ update.localVer }}</span>
    </button>
    <button class="btn ghost block menu-entry" style="margin-top: 10px" type="button" @click="router.push('/profile/docs')">
      <span>导入文档</span>
      <span class="menu-now">Word / PDF / Excel</span>
    </button>
    <button class="btn ghost block menu-entry" style="margin-top: 10px" type="button" @click="router.push('/profile/share')">
      <span>推荐给朋友</span>
      <span class="menu-now">微信 / QQ</span>
    </button>
    <button class="btn ghost block menu-entry" style="margin-top: 10px" type="button" @click="router.push('/profile/voices')">
      <span>语色管理</span>
      <span class="menu-now">{{ voicePref.current.name }}</span>
    </button>
    <button class="btn ghost block menu-entry" style="margin-top: 10px" type="button" @click="router.push('/profile/reminder')">
      <span>学习提醒</span>
      <span class="menu-now">{{ reminder.statusLabel }}</span>
    </button>
    <button class="btn ghost block menu-entry" style="margin-top: 10px" type="button" @click="router.push('/profile/theme')">
      <span>外观</span>
      <span class="menu-now theme-now">
        <span class="swatch" :style="{ background: theme.hex }" />
        {{ theme.current.name }} · {{ theme.appearanceLabel }}
      </span>
    </button>
    <button class="btn ghost block menu-entry" style="margin-top: 10px" type="button" @click="router.push('/profile/about')">
      <span>关于与声明</span>
      <span class="menu-now">合规说明</span>
    </button>
  </div>
</template>

<style scoped>
.menu-entry {
  justify-content: space-between;
}
.menu-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.menu-now {
  font-size: 13px;
  font-weight: 600;
  color: var(--forest);
}
.theme-now {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--line);
}
.sec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--coral);
  box-shadow: 0 0 0 2px rgba(184, 92, 74, 0.2);
}
</style>
