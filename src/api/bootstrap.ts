import { pauseRemoteSync, resumeRemoteSync } from '@/api/syncGate'
import { bootstrapGuest, fetchStudy, type RemoteProfile, type StudySnapshotPayload } from '@/api/sync'
import { isDomainId } from '@/domains/registry'
import type { DomainId } from '@/domains/types'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'
import type { ExamLevel, ExamMemory, OfficialScore, TargetScore } from '@/types'

function applyProfile(remote: RemoteProfile) {
  const user = useUserStore()
  /** 本地已引导过：学科以退出前选择为准，不被云端旧值盖掉；默认仍是英语 */
  const keepLocalDomain = user.onboarded
  if (remote.onboarded) user.onboarded = true
  if (remote.name) user.name = remote.name
  if (remote.birthday != null) user.birthday = remote.birthday || ''
  if (remote.motto != null) user.motto = remote.motto || ''
  if (remote.level === 'cet4' || remote.level === 'cet6') user.level = remote.level as ExamLevel
  if (remote.targetScore) user.targetScore = remote.targetScore as TargetScore
  if (remote.examDate) user.examDate = remote.examDate
  if (typeof remote.streak === 'number') user.streak = remote.streak
  if (remote.lastStudyDate != null) user.lastStudyDate = remote.lastStudyDate || ''
  if (
    !keepLocalDomain &&
    remote.activeDomainId &&
    isDomainId(remote.activeDomainId) &&
    remote.activeDomainId !== user.activeDomainId
  ) {
    user.setActiveDomain(remote.activeDomainId as DomainId)
  }
  if (remote.domainLevels) user.domainLevels = { ...user.domainLevels, ...remote.domainLevels }
  if (remote.officialScore) user.officialScore = remote.officialScore as OfficialScore
  if (remote.examMemory) user.examMemory = remote.examMemory as ExamMemory
}

function hasStudyContent(snap: StudySnapshotPayload | null | undefined): boolean {
  if (!snap) return false
  if (snap.vocab && Object.keys(snap.vocab).length > 0) return true
  if (Array.isArray(snap.errors) && snap.errors.length > 0) return true
  if (Array.isArray(snap.reports) && snap.reports.length > 0) return true
  if (Array.isArray(snap.gapPlan) && snap.gapPlan.length > 0) return true
  if (Array.isArray(snap.doneTaskIds) && snap.doneTaskIds.length > 0) return true
  if (snap.radarBoost && Object.keys(snap.radarBoost).length > 0) return true
  if (snap.gapGeneratedAt) return true
  return false
}

async function applyRemote(data: { profile: RemoteProfile }): Promise<void> {
  applyProfile(data.profile)
  const user = useUserStore()
  // 只落本地，避免空 updateProfile 立刻 PUT /me/profile
  user.flushLocal()

  try {
    const study = useStudyStore()
    const snap = await fetchStudy(user.activeDomainId)
    if (hasStudyContent(snap)) {
      study.applyRemoteSnapshot(snap as Parameters<typeof study.applyRemoteSnapshot>[0])
    }
  } catch (err) {
    console.warn('[sync] 学习快照暂不可用', err)
  }
}

/** 冷启动落在欢迎页，但云端已经完成引导时，直接进首页 */
async function leaveAuthScreensIfReady(): Promise<void> {
  const user = useUserStore()
  if (!user.onboarded) return
  const { default: router } = await import('@/router')
  const path = router.currentRoute.value.path
  if (path === '/welcome') {
    await router.replace('/')
  }
}

/** 启动时按设备号做游客注册，并拉取云端档案/学习快照；失败不影响本地使用 */
export async function syncOnLaunch(): Promise<void> {
  pauseRemoteSync()
  try {
    const data = await bootstrapGuest()
    await applyRemote(data)
    await leaveAuthScreensIfReady()
  } catch (err) {
    console.warn('[sync] 后端暂不可用，继续使用本地数据', err)
  } finally {
    resumeRemoteSync()
  }
}
