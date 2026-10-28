<script setup lang="ts">
defineProps<{
  open: boolean
  title?: string
  hint?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  pick: [source: 'wechat' | 'local']
  cancel: []
}>()

function close() {
  emit('update:open', false)
  emit('cancel')
}

function choose(source: 'wechat' | 'local') {
  emit('update:open', false)
  emit('pick', source)
}
</script>

<template>
  <div v-if="open" class="fss-root" role="presentation">
    <div class="fss-mask" @click="close" />
    <div class="fss-panel" role="dialog" aria-modal="true" aria-labelledby="fss-title" @click.stop>
      <h2 id="fss-title" class="fss-title">{{ title || '选择文件来源' }}</h2>
      <p v-if="hint" class="fss-hint">{{ hint }}</p>
      <button type="button" class="fss-btn primary" @click="choose('wechat')">微信聊天文件</button>
      <button type="button" class="fss-btn" @click="choose('local')">手机本地文件</button>
      <button type="button" class="fss-btn ghost" @click="close">取消</button>
    </div>
  </div>
</template>

<style scoped>
.fss-root {
  position: absolute;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.fss-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}
.fss-panel {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  border-radius: 16px 16px 0 0;
  background: var(--bg-elevated, #fff);
  box-shadow: 0 -8px 28px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fss-title {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text, #0f172a);
  text-align: center;
}
.fss-hint {
  margin: 0 0 4px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-muted, #64748b);
  text-align: center;
}
.fss-btn {
  appearance: none;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 600;
  background: var(--bg, #f8fafc);
  color: var(--text, #0f172a);
}
.fss-btn.primary {
  background: var(--accent, #2563eb);
  border-color: transparent;
  color: #fff;
}
.fss-btn.ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-muted, #64748b);
  font-weight: 500;
}
</style>
