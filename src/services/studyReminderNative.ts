import { Capacitor, registerPlugin } from '@capacitor/core'

export interface StudyReminderPlugin {
  scheduleDaily(options: {
    hour: number
    minute: number
    title: string
    body: string
  }): Promise<{ exact?: boolean }>
  cancelDaily(): Promise<void>
  /** scheduled：开关开着且系统里确有闹钟；exact：是否具备精确闹钟能力 */
  isScheduled(): Promise<{ scheduled: boolean; exact?: boolean }>
  openExactAlarmSettings(): Promise<void>
  openAppSettings(): Promise<void>
}

export const StudyReminder = registerPlugin<StudyReminderPlugin>('StudyReminder')

export function useNativeStudyReminder(): boolean {
  return Capacitor.getPlatform() === 'android'
}
