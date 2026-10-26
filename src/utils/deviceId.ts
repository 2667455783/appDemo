const KEY = 'zhijuan:deviceId'

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** 设备游客 ID：首次生成后持久化，用于服务端同步 */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY)
    if (existing && existing.length >= 8) return existing
    const id = uuid()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return uuid()
  }
}
