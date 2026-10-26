import { apiRequest } from '@/api/http'
import { getDeviceId } from '@/utils/deviceId'
import type { DomainId } from '@/domains/types'

export type RemoteProfile = {
  onboarded: boolean
  name: string
  birthday?: string
  motto?: string
  level: string
  targetScore: number
  examDate?: string | null
  streak: number
  lastStudyDate?: string
  activeDomainId: string
  domainLevels?: Record<string, string> | null
  officialScore?: unknown
  examMemory?: unknown
}

export type BootstrapData = {
  userId: number
  deviceId: string
  created: boolean
  profile: RemoteProfile
}

export type StudySnapshotPayload = {
  vocab?: Record<string, unknown>
  errors?: unknown
  reports?: unknown
  gapPlan?: unknown
  gapGeneratedAt?: string
  doneTaskIds?: unknown
  doneTaskDate?: string
  radarBoost?: Record<string, unknown>
}

export function bootstrapGuest() {
  return apiRequest<BootstrapData>('/api/v1/guest/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ deviceId: getDeviceId() }),
    skipDeviceHeader: true,
  })
}

export function fetchProfile() {
  return apiRequest<RemoteProfile>('/api/v1/me/profile')
}

export function saveProfile(profile: Partial<RemoteProfile>) {
  return apiRequest<RemoteProfile>('/api/v1/me/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  })
}

export function fetchStudy(domainId: DomainId | string) {
  return apiRequest<StudySnapshotPayload>(`/api/v1/me/study/${encodeURIComponent(domainId)}`)
}

export function saveStudy(domainId: DomainId | string, payload: StudySnapshotPayload) {
  return apiRequest<StudySnapshotPayload>(`/api/v1/me/study/${encodeURIComponent(domainId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
