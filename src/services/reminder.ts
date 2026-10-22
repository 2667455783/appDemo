import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import type { Router } from 'vue-router'
import {
  REMINDER_CHANNEL_ID,
  REMINDER_CHANNEL_NAME,
  REMINDER_ID,
  type ReminderState,
} from '@/data/reminder'
import { StudyReminder, useNativeStudyReminder } from '@/services/studyReminderNative'

export type ReminderCopy = {
  title: string
  body: string
}

const SMALL_ICON = 'ic_stat_reminder'

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export function buildReminderCopy(payload: {
  name: string
  streak: number
  daysLeft: number
  studiedToday: boolean
}): ReminderCopy {
  const title = '学习宝典 · 该学习啦'
  if (payload.studiedToday) {
    return { title, body: `${payload.name}，今天已打卡，再来一组巩固一下吧` }
  }
  const streakLine = payload.streak > 0 ? `已连续 ${payload.streak} 天，` : ''
  const examLine = payload.daysLeft >= 0 ? `距考试 ${payload.daysLeft} 天，` : ''
  return {
    title,
    body: `${payload.name}，${streakLine}${examLine}来背词或练一组听力吧`,
  }
}

async function ensureChannel() {
  if (Capacitor.getPlatform() !== 'android') return
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: REMINDER_CHANNEL_NAME,
    description: '每天固定时间提醒上线学习',
    importance: 5,
    visibility: 1,
    vibration: true,
  })
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!isNative()) return false
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return true
  const next = await LocalNotifications.requestPermissions()
  return next.display === 'granted'
}

export async function cancelStudyReminders() {
  if (!isNative()) return
  if (useNativeStudyReminder()) {
    await StudyReminder.cancelDaily()
    return
  }
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
}

function iosDailyNotification(state: ReminderState, copy: ReminderCopy): LocalNotificationSchema {
  return {
    id: REMINDER_ID,
    title: copy.title,
    body: copy.body,
    channelId: REMINDER_CHANNEL_ID,
    smallIcon: SMALL_ICON,
    autoCancel: true,
    extra: { route: '/train' },
    schedule: {
      on: { hour: state.hour, minute: state.minute },
      allowWhileIdle: true,
    },
  }
}

export async function scheduleStudyReminders(
  state: ReminderState,
  copy: ReminderCopy,
): Promise<'ok' | 'denied' | 'unsupported'> {
  if (!isNative()) return 'unsupported'
  const granted = await requestReminderPermission()
  if (!granted) return 'denied'

  if (useNativeStudyReminder()) {
    await StudyReminder.scheduleDaily({
      hour: state.hour,
      minute: state.minute,
      title: copy.title,
      body: copy.body,
    })
    return 'ok'
  }

  await ensureChannel()
  await cancelStudyReminders()
  await LocalNotifications.schedule({ notifications: [iosDailyNotification(state, copy)] })
  return 'ok'
}

export async function syncStudyReminders(state: ReminderState, copy: ReminderCopy) {
  if (!state.enabled) {
    await cancelStudyReminders()
    return 'disabled' as const
  }
  return scheduleStudyReminders(state, copy)
}

export async function replenishStudyReminders(state: ReminderState, copy: ReminderCopy) {
  if (!state.enabled || !isNative()) return
  if (useNativeStudyReminder()) {
    const { scheduled } = await StudyReminder.isScheduled()
    if (scheduled) return
    await scheduleStudyReminders(state, copy)
    return
  }
  try {
    const pending = await LocalNotifications.getPending()
    const hasMain = pending.notifications.some((n) => n.id === REMINDER_ID)
    if (hasMain) return
    await scheduleStudyReminders(state, copy)
  } catch {
    await scheduleStudyReminders(state, copy)
  }
}

export function bindReminderTap(router: Router) {
  if (!isNative()) return () => {}
  const sub = LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const route = (event.notification.extra?.route as string | undefined) ?? '/train'
    void router.push(route)
  })
  return () => {
    void sub.then((h) => h.remove())
  }
}

export function bindReminderReceived(onFire: () => void) {
  if (!isNative()) return () => {}
  const sub = LocalNotifications.addListener('localNotificationReceived', () => {
    onFire()
  })
  return () => {
    void sub.then((h) => h.remove())
  }
}
