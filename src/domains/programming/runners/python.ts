import type { RunResult } from '@/domains/programming/types'

/** 国内优先：npmmirror → jsDelivr → unpkg */
const PYODIDE_MIRRORS = [
  'https://cdn.npmmirror.com/packages/pyodide/0.26.4/files/',
  'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  'https://unpkg.com/pyodide@0.26.4/',
]

type PyodideInterface = {
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (opts: { batched: (s: string) => void }) => void
  setStderr: (opts: { batched: (s: string) => void }) => void
}

type LoadPyodideFn = (opts: { indexURL: string }) => Promise<PyodideInterface>

declare global {
  interface Window {
    loadPyodide?: LoadPyodideFn
  }
}

function readLoadPyodide(): LoadPyodideFn | undefined {
  return (window as unknown as { loadPyodide?: LoadPyodideFn }).loadPyodide
}

function clearLoadPyodide() {
  ;(window as unknown as { loadPyodide?: LoadPyodideFn }).loadPyodide = undefined
}

let pyodidePromise: Promise<PyodideInterface> | null = null
let activeIndexURL = ''

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.dataset.pyodideLoader = '1'
    s.onload = () => resolve()
    s.onerror = () => {
      s.remove()
      reject(new Error(`脚本加载失败: ${src}`))
    }
    document.head.appendChild(s)
  })
}

async function tryLoadFromMirror(indexURL: string): Promise<PyodideInterface> {
  clearLoadPyodide()
  document.querySelectorAll('script[data-pyodide-loader="1"]').forEach((el) => el.remove())

  await loadScript(`${indexURL}pyodide.js`)
  const loader = readLoadPyodide()
  if (!loader) throw new Error('loadPyodide 未就绪')
  const py = await loader({ indexURL })
  activeIndexURL = indexURL
  return py
}

async function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const errors: string[] = []
      for (const mirror of PYODIDE_MIRRORS) {
        try {
          return await tryLoadFromMirror(mirror)
        } catch (err) {
          errors.push(`${mirror} → ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      pyodidePromise = null
      throw new Error(
        `Python 运行时加载失败（已尝试 ${PYODIDE_MIRRORS.length} 个镜像）。\n` +
          `请检查网络后重试。\n\n${errors.join('\n')}`,
      )
    })()
  }
  return pyodidePromise
}

export async function runPython(code: string): Promise<RunResult> {
  try {
    const py = await getPyodide()
    const chunks: string[] = []
    py.setStdout({ batched: (s) => chunks.push(s) })
    py.setStderr({ batched: (s) => chunks.push(s) })
    await py.runPythonAsync(code)
    return {
      ok: true,
      kind: 'text',
      output: chunks.join('') || '(无输出)',
    }
  } catch (err) {
    // 加载失败时允许下次重试换镜像
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('运行时加载失败') || message.includes('脚本加载失败')) {
      pyodidePromise = null
      activeIndexURL = ''
    }
    return { ok: false, kind: 'text', output: message }
  }
}

export function getPyodideMirror(): string {
  return activeIndexURL
}
