<script setup lang="ts">
import { computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import AppIcon from '@/components/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    back?: boolean
    subtle?: string
  }>(),
  { back: true },
)

const emit = defineEmits<{ back: [] }>()

/** 仅 H5 显示返回；安卓 / iOS 用系统侧滑或物理返回 */
const showBack = computed(() => props.back && !Capacitor.isNativePlatform())
</script>

<template>
  <header class="head">
    <div class="title-row" :class="{ 'has-back': showBack }">
      <button v-if="showBack" class="back-btn" type="button" aria-label="返回" @click="emit('back')">
        <AppIcon class="chev" name="left" :size="16" />
        <span>返回</span>
      </button>
      <h1 v-if="title" class="page-title title" :title="title">{{ title }}</h1>
    </div>
    <p v-if="subtle" class="page-sub subtle">{{ subtle }}</p>
  </header>
</template>

<style scoped>
.head {
  position: relative;
  margin-bottom: 16px;
  min-width: 0;
}

.title-row {
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  min-width: 0;
}

.back-btn {
  position: absolute;
  left: 0;
  top: 50%;
  z-index: 1;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 14px 0 10px;
  margin: 0;
  border: 1px solid color-mix(in srgb, var(--forest) 22%, transparent);
  border-radius: 999px;
  background: var(--moss);
  color: var(--forest);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.back-btn:active {
  background: color-mix(in srgb, var(--forest) 16%, var(--paper-2));
}

.chev {
  display: block;
  flex-shrink: 0;
}

.title {
  width: 100%;
  margin: 0;
  padding: 0 12px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.has-back .title {
  /* 左右同等留白，避免压到返回，同时标题仍落在整行正中 */
  padding-left: 88px;
  padding-right: 88px;
}

.subtle {
  display: block;
  width: 100%;
  margin: 8px 0 0;
  text-align: center;
}
</style>
