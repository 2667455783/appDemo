<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    /** 简短说明；复杂内容用默认插槽 */
    message?: string
    primaryText?: string
    secondaryText?: string
    /** false 时不可点遮罩关闭 */
    closable?: boolean
    /** 遮罩是否可点关闭（默认跟随 closable） */
    closeOnMask?: boolean
  }>(),
  {
    primaryText: '确定',
    secondaryText: '',
    closable: true,
    closeOnMask: undefined,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  primary: []
  secondary: []
  close: []
}>()

const maskClosable = () =>
  props.closeOnMask === undefined ? props.closable : props.closeOnMask

function close() {
  if (!props.closable) return
  emit('update:open', false)
  emit('close')
}

function onMask() {
  if (!maskClosable()) return
  close()
}

function onKey(e: KeyboardEvent) {
  if (!props.open || e.key !== 'Escape') return
  if (props.closable) close()
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <!-- 挂在 .phone 内用 absolute，避免 Teleport 到 body 在 WebView 里被裁切/看不见 -->
  <div v-if="open" class="dlg-root" role="presentation">
    <div class="dlg-mask" @click="onMask" />
    <div
      class="dlg-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dlg-title"
      @click.stop
    >
      <h2 id="dlg-title" class="dlg-title">{{ title }}</h2>
      <p v-if="message" class="dlg-msg">{{ message }}</p>
      <div v-if="$slots.default" class="dlg-body">
        <slot />
      </div>
      <div v-if="primaryText || secondaryText" class="dlg-actions" :class="{ stacked: !secondaryText }">
        <button
          v-if="secondaryText"
          class="btn ghost block"
          type="button"
          @click="emit('secondary')"
        >
          {{ secondaryText }}
        </button>
        <button v-if="primaryText" class="btn primary block" type="button" @click="emit('primary')">
          {{ primaryText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dlg-root {
  position: absolute;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  box-sizing: border-box;
}

.dlg-mask {
  position: absolute;
  inset: 0;
  background: rgba(20, 28, 24, 0.48);
  backdrop-filter: blur(2px);
}

.dlg-panel {
  position: relative;
  z-index: 1;
  width: min(100%, 340px);
  max-height: min(80%, 520px);
  overflow: auto;
  padding: 22px 20px 18px;
  border-radius: 20px;
  background: var(--paper-2, #fff);
  box-shadow: 0 18px 48px rgba(20, 28, 24, 0.22);
  text-align: left;
  animation: dlg-in 0.22s ease-out;
}

.dlg-title {
  margin: 0;
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--ink);
  text-align: center;
}

.dlg-msg {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-soft);
  text-align: center;
  white-space: pre-wrap;
}

.dlg-body {
  margin-top: 12px;
}

.dlg-actions {
  margin-top: 18px;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
}

.dlg-actions.stacked .btn {
  width: 100%;
}

@keyframes dlg-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
