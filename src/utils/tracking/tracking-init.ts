function warnIfDomainLikelyBlocked() {
  if (!import.meta.env.DEV || typeof location === 'undefined') return
  const host = location.hostname
  const local =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  if (!local) return
  console.warn(
    '[tracking] 当前域名是 %s。该百度站点绑定域名为 tjb666.space，localhost / 内网 IP 上通常只加载 hm.js、不发 hm.gif。请到绑定域名或 hosts 指向 tjb666.space 再验 Network。',
    host,
  )
}

/** SPA 路由变化走官方 UrlChangeTracker。后台不要再开「单页应用数据统计」，否则 PV 会双报。 */
export function initTracking() {
  if (typeof window === 'undefined') return
  warnIfDomainLikelyBlocked()

  const hmt = window._hmt
  if (!hmt) {
    window._hmt = []
  }
  window._hmt!.push([
    '_requirePlugin',
    'UrlChangeTracker',
    {
      shouldTrackUrlChange(newPath: string, oldPath: string) {
        return Boolean(newPath && oldPath)
      },
    },
  ])
}
