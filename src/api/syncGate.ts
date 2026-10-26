/** 启动拉云期间暂停远端推送，避免 apply 触发 flush 连打 PUT */
let pauseDepth = 0

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function pauseRemoteSync(): void {
  pauseDepth += 1
}

export function resumeRemoteSync(): void {
  pauseDepth = Math.max(0, pauseDepth - 1)
}

export function isRemoteSyncPaused(): boolean {
  return pauseDepth > 0
}

/** 合并短时间多次 push（学习打卡连点等） */
export function scheduleRemotePush(key: string, run: () => void, delayMs = 400): void {
  if (isRemoteSyncPaused()) return
  const prev = timers.get(key)
  if (prev) clearTimeout(prev)
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      if (!isRemoteSyncPaused()) run()
    }, delayMs),
  )
}
