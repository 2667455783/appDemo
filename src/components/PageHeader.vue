<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    back?: boolean
    subtle?: string
  }>(),
  { back: true },
)

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <header class="head">
    <button v-if="back" class="back-btn" type="button" aria-label="返回" @click="emit('back')">
      <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M15 6L9 12l6 6"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>返回</span>
    </button>

    <h1 v-if="title" class="page-title title">{{ title }}</h1>
    <p v-if="subtle" class="page-sub subtle">{{ subtle }}</p>
  </header>
</template>

<style scoped>
/* 强制纵向：返回单独一行，标题/副标题依次换行，绝不跟在按钮右侧 */
.head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  margin-bottom: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 14px 0 10px;
  margin: 0 0 14px;
  border: 1px solid rgba(31, 77, 58, 0.18);
  border-radius: 999px;
  background: #e8f0eb;
  color: var(--forest);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.back-btn:active {
  background: #dce8e1;
}

.chev {
  display: block;
  flex-shrink: 0;
}

.title {
  display: block;
  width: 100%;
  margin: 0;
}

.subtle {
  display: block;
  width: 100%;
  margin: 8px 0 0;
}
</style>
