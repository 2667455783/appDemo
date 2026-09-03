import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_REMINDER,
  clampReminderTime,
  formatReminderTime,
  type ReminderState,
} from '@/data/reminder'
import {
  buildReminderCopy,
  cancelStudyReminders,
  replenishStudyReminders,
  syncStudyReminders,
} from '@/services/reminder'
import { useUserStore } from '@/stores/user'
import { loadState, saveState, todayISO } from '@/utils/storage'

function readSaved(): ReminderState {
  const saved = loadState<ReminderState>('reminder', DEFAULT_REMINDER)
  const t = clampReminderTime(saved.hour, saved.minute)
  return { enabled: !!saved.enabled, hour: t.hour, minute: t.minute }
}

export const useReminderStore = defineStore('reminder', () => {
  const saved = readSaved()
  const enabled = ref(saved.enabled)
  const hour = ref(saved.hour)
  const minute = ref(saved.minute)
  const lastError = ref('')

  const timeLabel = computed(() => formatReminderTime(hour.value, minute.value))
  const statusLabel = computed(() => (enabled.value ? `每天 ${timeLabel.value}` : '未开启'))

  function snapshot(): ReminderState {
    return { enabled: enabled.value, hour: hour.value, minute: minute.value }
  }

  function persist() {
    saveState<ReminderState>('reminder', snapshot())
  }

  function reminderCopy() {
    const user = useUserStore()
    return buildReminderCopy({
      name: user.name,
      streak: user.streak,
      daysLeft: user.daysLeft,
      studiedToday: user.lastStudyDate === todayISO(),
    })
  }

  async function applySchedule() {
    lastError.value = ''
    persist()
    const result = await syncStudyReminders(snapshot(), reminderCopy())
    if (result === 'denied') {
      enabled.value = false
      persist()
      lastError.value = '未获得通知权限，请在系统设置中允许通知'
    }
    return result
  }

  async function setEnabled(next: boolean) {
    enabled.value = next
    if (!next) {
      persist()
      await cancelStudyReminders()
      return
    }
    await applySchedule()
  }

  async function setTime(nextHour: number, nextMinute: number) {
    const t = clampReminderTime(nextHour, nextMinute)
    hour.value = t.hour
    minute.value = t.minute
    if (!enabled.value) {
      persist()
      return
    }
    await applySchedule()
  }

  async function reschedule() {
    if (!enabled.value) return
    await applySchedule()
  }

  async function replenish() {
    if (!enabled.value) return
    await replenishStudyReminders(snapshot(), reminderCopy())
  }

  return {
    enabled,
    hour,
    minute,
    timeLabel,
    statusLabel,
    lastError,
    setEnabled,
    setTime,
    reschedule,
    replenish,
    applySchedule,
  }
})
