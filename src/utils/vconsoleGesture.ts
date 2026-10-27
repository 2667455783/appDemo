import VConsole from 'vconsole'

const TAP_NEED = 5
/** 连点间隔窗口：超时则计数清零 */
const TAP_WINDOW_MS = 2500

let instance: VConsole | null = null
let taps = 0
let resetTimer: ReturnType<typeof setTimeout> | null = null
let installed = false

function openVConsole() {
  if (!instance) {
    instance = new VConsole({ theme: 'dark' })
    console.info('[vconsole] 已开启（连点页面 %s 次）', TAP_NEED)
  } else {
    instance.show()
  }
}

function onTap() {
  taps += 1
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    taps = 0
    resetTimer = null
  }, TAP_WINDOW_MS)

  if (taps >= TAP_NEED) {
    taps = 0
    if (resetTimer) {
      clearTimeout(resetTimer)
      resetTimer = null
    }
    openVConsole()
  }
}

/** 任意页面空白处连点 5 次打开 vConsole（便于真机看上传/接口日志） */
export function installVConsoleGesture() {
  if (installed || typeof document === 'undefined') return
  installed = true
  // capture：避免被 stopPropagation 吃掉；click 兼容 WebView 与桌面
  document.addEventListener('click', onTap, true)
}
