<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { VOICE_GROUPS, presetsByEngine, type VoiceId } from '@/data/voices'
import { useVoicePrefStore } from '@/stores/voicePref'
import { canSpeak, speakEnglish, stopSpeak, warmupWebVoices } from '@/utils/audio'
import { speakTrace } from '@/utils/neuralTts'

const router = useRouter()
const voicePref = useVoicePrefStore()
const previewing = ref<VoiceId | null>(null)
const lastHint = ref('')

onMounted(() => {
  warmupWebVoices()
})

function tagClass(tag: string): string {
  if (tag === '有道') return 'green'
  if (tag === '百度' || tag === '系统') return 'ink'
  return ''
}

function pick(id: VoiceId) {
  voicePref.select(id)
  void startPreview(id)
}

async function preview(id: VoiceId) {
  voicePref.select(id)
  await startPreview(id)
}

async function startPreview(id: VoiceId) {
  if (!canSpeak()) return
  const preset = voicePref.presets.find((v) => v.id === id)
  if (!preset) return
  if (previewing.value === id) {
    stopSpeak()
    previewing.value = null
    return
  }
  previewing.value = id
  lastHint.value = id === 'system' ? '正在用本机默认音色试听…' : '正在试听…'
  try {
    await speakEnglish(preset.sample, 0.92, { engineOnly: true })
    lastHint.value = `刚才试听：${speakTrace.detail || (id === 'system' ? '系统默认' : '在线发音')}`
  } catch {
    lastHint.value = '试听失败'
  } finally {
    if (previewing.value === id) previewing.value = null
  }
}

onUnmounted(() => {
  stopSpeak()
})
</script>

<template>
  <div class="page full">
    <PageHeader title="语色管理" subtle="有道、百度走在线发音；系统音色走本机引擎" @back="router.back()" />

    <div class="card now">
      <p class="muted">当前语色</p>
      <p class="now-name">{{ voicePref.current.name }}</p>
      <p class="page-sub">词典、词汇卡、听力、翻译朗读都会使用它。</p>
      <p v-if="lastHint" class="page-sub hint">{{ lastHint }}</p>
    </div>

    <template v-for="g in VOICE_GROUPS" :key="g.engine">
      <p class="section-h">{{ g.title }}</p>
      <button
        v-for="v in presetsByEngine(g.engine)"
        :key="v.id"
        class="option voice-card"
        :class="{ on: voicePref.id === v.id }"
        type="button"
        @click="pick(v.id)"
      >
        <div class="voice-main">
          <div>
            <p class="voice-name">{{ v.name }}</p>
            <p class="page-sub">{{ v.hint }}</p>
            <div class="tags">
              <span v-for="t in v.tags" :key="t" class="tag" :class="tagClass(t)">{{ t }}</span>
            </div>
          </div>
          <button
            class="btn sm ghost preview"
            :class="{ on: previewing === v.id }"
            type="button"
            @click.stop="preview(v.id)"
          >
            {{ previewing === v.id ? '停止' : '试听' }}
          </button>
        </div>
      </button>
    </template>
  </div>
</template>

<style scoped>
.now {
  margin-bottom: 4px;
}
.now-name {
  font-family: var(--serif);
  font-size: 22px;
  margin: 4px 0 2px;
}
.voice-card {
  padding: 14px 16px;
}
.voice-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.voice-name {
  font-size: 16px;
  font-weight: 700;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.preview.on {
  border-color: var(--forest);
  color: var(--forest);
  background: var(--moss);
}
.foot {
  margin-top: 16px;
}
.hint {
  margin-top: 8px;
  color: var(--forest);
  font-weight: 600;
}
</style>
