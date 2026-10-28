import eruda from 'eruda'

let mounted = false
let hostEl: HTMLElement | null = null
let previewFrame: HTMLIFrameElement | null = null
let selectObserver: MutationObserver | null = null
let inspecting = false
let onInspectingChange: ((active: boolean) => void) | null = null
let tipEl: HTMLDivElement | null = null

type InspectBridge = {
  setEnabled: (on: boolean) => void
  getLastEl: () => Element | null
}

declare global {
  interface Window {
    __localrunInspect?: InspectBridge
    __localrunLastEl?: Element | null
  }
}

function forceShow() {
  eruda.show('console')
  try {
    const cfg = eruda.get() as { config?: { set: (k: string, v: unknown) => void } } | undefined
    cfg?.config?.set('displaySize', 100)
  } catch {
    /* ignore */
  }
}

function findSelectBtn(): HTMLElement | null {
  if (!hostEl) return null
  return (
    hostEl.querySelector<HTMLElement>('.eruda-select') ||
    hostEl.querySelector<HTMLElement>('.eruda-icon-select') ||
    hostEl.querySelector<HTMLElement>('[class*="icon-select"]') ||
    hostEl.querySelector<HTMLElement>('span.select')
  )
}

function isSelectMode(): boolean {
  const btn = findSelectBtn()
  if (!btn) return false
  return (
    btn.classList.contains('eruda-active') ||
    btn.classList.contains('active') ||
    Array.from(btn.classList).some((c) => c === 'active' || c.endsWith('-active'))
  )
}

/** 往预览 iframe 注入点选桥：在 iframe 内接收点击，避免被宿主遮罩挡住 */
function installInspectBridge(iframe: HTMLIFrameElement) {
  const win = iframe.contentWindow
  const doc = iframe.contentDocument
  if (!win || !doc) return

  // 已注入则复用
  if (win.__localrunInspect) return

  const style = doc.createElement('style')
  style.setAttribute('data-localrun-inspect', '1')
  style.textContent = `
    #__lr_inspect_hl {
      position: fixed !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      border: 2px solid #4a9eff !important;
      background: rgba(74,158,255,.18) !important;
      box-sizing: border-box !important;
      display: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    html.__lr_inspecting, html.__lr_inspecting body {
      cursor: crosshair !important;
    }
  `
  doc.documentElement.appendChild(style)

  let hl = doc.getElementById('__lr_inspect_hl') as HTMLDivElement | null
  if (!hl) {
    hl = doc.createElement('div')
    hl.id = '__lr_inspect_hl'
    doc.documentElement.appendChild(hl)
  }

  let enabled = false

  const moveHl = (el: Element | null) => {
    if (!hl) return
    if (!el || el === hl || el === doc.documentElement) {
      hl.style.display = 'none'
      return
    }
    const r = el.getBoundingClientRect()
    hl.style.display = 'block'
    hl.style.left = `${r.left}px`
    hl.style.top = `${r.top}px`
    hl.style.width = `${r.width}px`
    hl.style.height = `${r.height}px`
  }

  const onMove = (e: Event) => {
    if (!enabled) return
    const t = e.target
    if (t instanceof Element && t.id !== '__lr_inspect_hl') moveHl(t)
  }

  const onDown = (e: Event) => {
    if (!enabled) return
    if (e.cancelable) e.preventDefault()
    e.stopPropagation()
    const t = e.target
    const el =
      t instanceof HTMLElement
        ? t.id === '__lr_inspect_hl'
          ? null
          : t
        : t instanceof Element && t.parentElement
          ? t.parentElement
          : null
    if (!el) return
    win.__localrunLastEl = el
    try {
      win.parent.postMessage({ __localrun: 1, type: 'inspect-pick' }, '*')
    } catch {
      /* ignore */
    }
  }

  win.__localrunInspect = {
    setEnabled(on: boolean) {
      enabled = on
      doc.documentElement.classList.toggle('__lr_inspecting', on)
      if (!on) {
        win.__localrunLastEl = null
        if (hl) hl.style.display = 'none'
      }
    },
    getLastEl() {
      return win.__localrunLastEl ?? null
    },
  }

  doc.addEventListener('pointermove', onMove, true)
  doc.addEventListener('mousemove', onMove, true)
  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('mousedown', onDown, true)
  doc.addEventListener('touchstart', onDown, { capture: true, passive: false })
}

function setPreviewInspectEnabled(on: boolean) {
  try {
    previewFrame?.contentWindow?.__localrunInspect?.setEnabled(on)
  } catch {
    /* ignore */
  }
}

function showTip(on: boolean) {
  if (!on) {
    tipEl?.remove()
    tipEl = null
    return
  }
  if (tipEl?.isConnected) return
  const el = document.createElement('div')
  el.setAttribute('data-eruda-inspect-tip', '1')
  el.textContent = '点选预览页中的元素'
  el.style.cssText =
    'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483646;padding:8px 14px;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font-size:13px;pointer-events:none;'
  document.documentElement.appendChild(el)
  tipEl = el
}

/** 关掉 eruda 自带遮罩，避免挡在 iframe 上面吃掉事件 */
function disableErudaOverlay() {
  try {
    const w = window as unknown as {
      chobitsu?: { domain: (n: string) => { setInspectMode?: (o: { mode: string }) => void; hideHighlight?: () => void } }
    }
    const overlay = w.chobitsu?.domain?.('Overlay')
    overlay?.setInspectMode?.({ mode: 'none' })
    overlay?.hideHighlight?.()
  } catch {
    /* ignore */
  }
  document.querySelectorAll('.__chobitsu-hide__').forEach((node) => {
    const el = node as HTMLElement
    el.style.pointerEvents = 'none'
    el.style.visibility = 'hidden'
  })
}

function restoreErudaOverlayMask() {
  document.querySelectorAll('.__chobitsu-hide__').forEach((node) => {
    const el = node as HTMLElement
    el.style.pointerEvents = ''
    el.style.visibility = ''
  })
}

function endSelectMode() {
  const btn = findSelectBtn()
  if (btn && isSelectMode()) {
    try {
      btn.click()
    } catch {
      /* ignore */
    }
  }
  setInspecting(false)
}

function setInspecting(active: boolean) {
  if (inspecting === active) {
    if (active) {
      disableErudaOverlay()
      setPreviewInspectEnabled(true)
      showTip(true)
    }
    return
  }
  inspecting = active
  onInspectingChange?.(active)
  if (active) {
    disableErudaOverlay()
    window.setTimeout(() => disableErudaOverlay(), 0)
    window.setTimeout(() => disableErudaOverlay(), 120)
    setPreviewInspectEnabled(true)
    showTip(true)
  } else {
    setPreviewInspectEnabled(false)
    restoreErudaOverlayMask()
    showTip(false)
  }
}

/** 预览 iframe 点选结果 */
export function handleInspectPickFromPreview() {
  if (!inspecting) return
  try {
    const el = previewFrame?.contentWindow?.__localrunInspect?.getLastEl()
    if (el instanceof HTMLElement) {
      eruda.get('elements')?.select(el)
    }
  } catch {
    /* ignore */
  }
  endSelectMode()
  window.requestAnimationFrame(() => {
    eruda.show('elements')
  })
}

function syncSelectObserver() {
  selectObserver?.disconnect()
  selectObserver = null
  if (!hostEl) return
  selectObserver = new MutationObserver(() => {
    setInspecting(isSelectMode())
  })
  selectObserver.observe(hostEl, {
    attributes: true,
    subtree: true,
    attributeFilter: ['class'],
  })
  hostEl.removeEventListener('click', onHostClickCapture, true)
  hostEl.addEventListener('click', onHostClickCapture, true)
}

function onHostClickCapture(e: Event) {
  const t = e.target as HTMLElement | null
  if (!t) return
  const btn = t.closest?.(
    '.eruda-select, .eruda-icon-select, [class*="icon-select"], span.select',
  ) as HTMLElement | null
  if (!btn || !hostEl?.contains(btn)) return
  window.setTimeout(() => setInspecting(isSelectMode()), 0)
  window.setTimeout(() => setInspecting(isSelectMode()), 50)
  window.setTimeout(() => setInspecting(isSelectMode()), 160)
}

function selectPreviewRoot() {
  try {
    const root = previewFrame?.contentDocument?.documentElement
    if (root) eruda.get('elements')?.select(root as HTMLElement)
  } catch {
    /* ignore */
  }
}

/** 把 Elements 指到预览 iframe，并安装点选桥 */
export function bindErudaPreviewIframe(iframe: HTMLIFrameElement | null) {
  previewFrame = iframe
  if (!mounted) return
  if (!iframe) {
    showTip(false)
    return
  }
  try {
    installInspectBridge(iframe)
  } catch {
    /* ignore */
  }
  selectPreviewRoot()
  syncSelectObserver()
  if (inspecting) setPreviewInspectEnabled(true)
}

/** 点选 Elements 时收起底部面板等（避免挡住预览） */
export function setErudaInspectingHandler(fn: ((active: boolean) => void) | null) {
  onInspectingChange = fn
}

/** 在指定容器内挂载 eruda（无悬浮按钮，铺满容器） */
export function mountErudaPanel(container: HTMLElement) {
  if (mounted) {
    destroyErudaPanel()
  }
  hostEl = container
  eruda.init({
    container,
    inline: true,
    autoScale: false,
    useShadowDom: false,
    tool: ['console', 'elements', 'network', 'resources', 'settings'],
    defaults: {
      displaySize: 100,
      transparency: 0,
      theme: 'Light',
    },
  })
  forceShow()
  mounted = true

  container.querySelectorAll('.eruda-entry-btn').forEach((el) => {
    ;(el as HTMLElement).style.display = 'none'
  })

  syncSelectObserver()
  window.setTimeout(() => syncSelectObserver(), 300)
  if (previewFrame) {
    try {
      installInspectBridge(previewFrame)
    } catch {
      /* ignore */
    }
  }
  selectPreviewRoot()
}

/** 面板已挂载时再次展开 */
export function revealErudaPanel() {
  if (!mounted) return
  forceShow()
  selectPreviewRoot()
}

export function destroyErudaPanel() {
  setInspecting(false)
  selectObserver?.disconnect()
  selectObserver = null
  hostEl?.removeEventListener('click', onHostClickCapture, true)
  tipEl?.remove()
  tipEl = null
  if (!mounted) return
  eruda.destroy()
  mounted = false
  hostEl = null
  previewFrame = null
}

export function erudaClearLogs() {
  if (!mounted) return
  eruda.get('console')?.clear()
}

/** 把宿主/iframe 转发日志写入 eruda，不经过全局 console，避免重复 */
export function erudaPushLog(level: string, text: string) {
  if (!mounted) return
  const panel = eruda.get('console')
  if (!panel) return
  switch (normalizeLevel(level)) {
    case 'error':
      panel.error(text)
      break
    case 'warn':
      panel.warn(text)
      break
    case 'info':
      panel.info(text)
      break
    default:
      panel.log(text)
  }
}

function normalizeLevel(level: string): 'log' | 'info' | 'warn' | 'error' {
  if (level === 'warn' || level === 'warning') return 'warn'
  if (level === 'error') return 'error'
  if (level === 'info' || level === 'debug') return 'info'
  return 'log'
}
