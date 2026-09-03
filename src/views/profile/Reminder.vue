<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useReminderStore } from '@/stores/reminder'

const router = useRouter()
const reminder = useReminderStore()
const selHour = ref(reminder.hour)
const selMinute = ref(reminder.minute)
const busy = ref(false)

const hourOptions = Array.from({ length: 24 }, (_, i) => i)
const minuteOptions = Array.from({ length: 60 }, (_, i) => i)

watch(
  () => [reminder.hour, reminder.minute] as const,
  ([h, m]) => {
    selHour.value = h
    selMinute.value = m
  },
)

const hint = '到点会推送系统通知，点击可进入训练页'
const native = Capacitor.isNativePlatform()

onMounted(() => {
  if (reminder.enabled && native) void reminder.replenish()
})

async function onToggleSwitch() {
  if (busy.value) return
  busy.value = true
  try {
    await reminder.setEnabled(!reminder.enabled)
  } finally {
    busy.value = false
  }
}

async function onTimePick() {
  if (busy.value || !reminder.enabled) return
  busy.value = true
  try {
    await reminder.setTime(selHour.value, selMinute.value)
  } finally {
    busy.value = false
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
</script>

<template>
  <div class="page full">
    <PageHeader title="学习提醒" :subtle="hint" @back="router.back()" />

    <div class="card">
      <div class="row space toggle-row">
        <span>
          <span class="toggle-title">每日提醒</span>
          <span class="page-sub">固定时间通知你上线学习</span>
        </span>
        <button
          class="toggle"
          type="button"
          role="switch"
          :class="{ on: reminder.enabled }"
          :aria-checked="reminder.enabled"
          :disabled="busy"
          @click="onToggleSwitch"
        >
          <span class="knob" aria-hidden="true" />
        </button>
      </div>

      <div class="field" style="margin-top: 14px">
        <label>提醒时间</label>
        <div class="time-row">
          <select
            v-model.number="selHour"
            class="time-select"
            :disabled="!reminder.enabled || busy"
            @change="onTimePick"
          >
            <option v-for="h in hourOptions" :key="h" :value="h">{{ pad(h) }} 时</option>
          </select>
          <span class="time-sep">:</span>
          <select
            v-model.number="selMinute"
            class="time-select"
            :disabled="!reminder.enabled || busy"
            @change="onTimePick"
          >
            <option v-for="m in minuteOptions" :key="m" :value="m">{{ pad(m) }} 分</option>
          </select>
        </div>
      </div>

      <p v-if="reminder.lastError" class="page-sub err">{{ reminder.lastError }}</p>
      <p v-else-if="reminder.enabled" class="page-sub ok">已设置：{{ reminder.statusLabel }}</p>
      <p v-else class="page-sub">请先开启每日提醒，再设置提醒时间</p>
    </div>

    <div class="card tips">
      <p class="section-h">说明</p>
      <p class="page-sub">· 首次开启会请求通知权限，请点允许</p>
      <p class="page-sub">· 若今天所选时刻已过，将从明天该时刻起提醒</p>
    </div>
  </div>
</template>

<style scoped>
.toggle-row {
  align-items: center;
}
.toggle-title {
  display: block;
  font-weight: 700;
  margin-bottom: 4px;
}
.toggle {
  position: relative;
  width: 48px;
  height: 28px;
  border: none;
  border-radius: 999px;
  background: var(--track);
  padding: 0;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.2s ease;
}
.toggle.on {
  background: var(--forest);
}
.toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--paper-2);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  transition: transform 0.2s ease;
}
.toggle.on .knob {
  transform: translateX(20px);
}
.time-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.time-select {
  flex: 1;
  border: 1px solid var(--line);
  background: var(--paper-2);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 15px;
  color: var(--ink);
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%),
    linear-gradient(135deg, var(--muted) 50%, transparent 50%);
  background-position:
    calc(100% - 18px) calc(50% + 2px),
    calc(100% - 12px) calc(50% + 2px);
  background-size:
    6px 6px,
    6px 6px;
  background-repeat: no-repeat;
}
.time-select:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  color: var(--muted);
}
.time-sep {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-soft);
}
.tips {
  margin-top: 12px;
}
.tips .section-h {
  margin-bottom: 8px;
}
.ok {
  color: var(--forest);
  margin-top: 10px;
}
.err {
  color: var(--coral);
  margin-top: 10px;
}
</style>
