<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { canSpeak, speakEnglish, stopSpeak } from '@/utils/audio'

const props = withDefaults(
  defineProps<{
    text: string
    rate?: number
    title?: string
  }>(),
  { rate: 0.88, title: '朗读单词' },
)

const speaking = ref(false)
const supported = canSpeak()

async function onClick(e: Event) {
  e.stopPropagation()
  e.preventDefault()
  const t = props.text.trim()
  if (!supported || !t) return
  if (speaking.value) {
    stopSpeak()
    speaking.value = false
    return
  }
  speaking.value = true
  try {
    await speakEnglish(t, props.rate)
  } finally {
    speaking.value = false
  }
}

onUnmounted(() => {
  if (speaking.value) stopSpeak()
})
</script>

<template>
  <button
    type="button"
    class="speak-btn"
    :class="{ on: speaking }"
    :disabled="!supported || !text.trim()"
    :title="supported ? title : '当前环境不支持朗读'"
    :aria-label="title"
    @click.stop.prevent="onClick"
    @pointerdown.stop
  >
    <AppIcon name="sound" :size="18" />
  </button>
</template>

<style scoped>
.speak-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper-2, #fff);
  color: var(--forest);
  flex-shrink: 0;
}
.speak-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.speak-btn.on {
  background: var(--moss, #e7efe6);
  border-color: var(--forest);
}
.speak-btn:active:not(:disabled) {
  transform: scale(0.96);
}
</style>
