export type TrackingParams = Record<string, string | number>

function asString(value: string | number | undefined): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function asNumber(value: string | number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** 唯一上报出口。百度 _trackEvent 只有 category/action/label/value，接不住任意 JSON。 */
export function reportLog(eventName: string, params: TrackingParams = {}) {
  if (!eventName || typeof window === 'undefined') return
  if (!window._hmt) window._hmt = []

  const action = asString(params.action) ?? eventName
  const label = asString(params.label)
  const value = asNumber(params.value)
  const cmd: unknown[] = ['_trackEvent', eventName, action]
  if (label !== undefined || value !== undefined) cmd.push(label ?? '')
  if (value !== undefined) cmd.push(value)
  window._hmt.push(cmd)

  if (import.meta.env.DEV) {
    console.info('[tracking] queued', cmd)
  }
}
