import { Capacitor, registerPlugin } from '@capacitor/core'

export interface StudyReminderPlugin {
  scheduleDaily(options: { hour: number; minute: number; title: string; body: string }): Promise<void>
  cancelDaily(): Promise<void>
  isScheduled(): Promise<{ scheduled: boolean }>
}

export const StudyReminder = registerPlugin<StudyReminderPlugin>('StudyReminder')

export function useNativeStudyReminder(): boolean {
  return Capacitor.getPlatform() === 'android'
}
