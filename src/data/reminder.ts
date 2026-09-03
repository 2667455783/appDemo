export const REMINDER_CHANNEL_ID = 'study-reminder'
export const REMINDER_CHANNEL_NAME = '学习提醒'

/** 单条每日 cron 提醒，由系统在 BroadcastReceiver 里自动续排 */
export const REMINDER_ID = 7001

export const DEFAULT_REMINDER_HOUR = 20
export const DEFAULT_REMINDER_MINUTE = 0

export type ReminderState = {
  enabled: boolean
  hour: number
  minute: number
}

export const DEFAULT_REMINDER: ReminderState = {
  enabled: false,
  hour: DEFAULT_REMINDER_HOUR,
  minute: DEFAULT_REMINDER_MINUTE,
}

export function formatReminderTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function parseTimeInput(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

export function clampReminderTime(hour: number, minute: number): { hour: number; minute: number } {
  return {
    hour: Math.max(0, Math.min(23, Math.round(hour))),
    minute: Math.max(0, Math.min(59, Math.round(minute))),
  }
}
