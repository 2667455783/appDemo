import type { RunResult } from '@/domains/programming/types'

type BabelApi = {
  transform: (
    code: string,
    options?: Record<string, unknown>,
  ) => { code: string | null | undefined }
}

declare global {
  interface Window {
    React?: unknown
    ReactDOM?: {
      createRoot: (el: Element) => { render: (node: unknown) => void; unmount: () => void }
    }
  }
}

let babelPromise: Promise<BabelApi> | null = null
let reactGlobalPromise: Promise<void> | null = null

function vendorHref(file: string): string {
  return new URL(`vendor/${file}`, window.location.origin + import.meta.env.BASE_URL).href
}

async function getBabel(): Promise<BabelApi> {
  if (!babelPromise) {
    babelPromise = import('@babel/standalone').then((m) => {
      const mod = m as { default?: BabelApi } & BabelApi
      return mod.default ?? mod
    })
  }
  return babelPromise
}

function loadScriptOnce(src: string, flag: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-prog-vendor="${flag}"]`)) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.dataset.progVendor = flag
    s.onload = () => resolve()
    s.onerror = () => {
      s.remove()
      reject(new Error(`加载失败: ${src}`))
    }
    document.head.appendChild(s)
  })
}

async function ensureReactGlobals(): Promise<void> {
  if (window.React && window.ReactDOM) return
  if (!reactGlobalPromise) {
    reactGlobalPromise = (async () => {
      await loadScriptOnce(vendorHref('react.production.min.js'), 'react')
      await loadScriptOnce(vendorHref('react-dom.production.min.js'), 'react-dom')
      if (!window.React || !window.ReactDOM) throw new Error('React 运行时未就绪')
    })().catch((err) => {
      reactGlobalPromise = null
      throw err
    })
  }
  return reactGlobalPromise
}

/** 粗解析 Vue SFC：template / script setup / style */
function parseVueSfc(source: string): { template: string; script: string; style: string } {
  const template =
    source.match(/<template[^>]*>([\s\S]*?)<\/template>/i)?.[1]?.trim() ??
    '<div>请提供 &lt;template&gt;</div>'
  let script =
    source.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1]?.trim() ??
    'const { ref } = Vue\nconst msg = ref("ok")'
  // 只用横向空白，避免吃掉换行导致 `Vueconst title` 粘连
  script = script.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]vue['"][ \t]*;?/g,
    (_m, names: string) => `const { ${names.trim()} } = Vue`,
  )
  script = script.replace(/import[ \t]+.+[ \t]+from[ \t]+['"][^'"]+['"][ \t]*;?/g, '')
  const style = source.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1]?.trim() ?? ''
  return { template, script, style }
}

function collectReturnKeys(script: string): string[] {
  const keys = new Set<string>()
  const re = /(?:const|let|var)\s+(?:\{([^}]+)\}|([A-Za-z_$][\w$]*))\s*=/g
  let m: RegExpExecArray | null
  while ((m = re.exec(script))) {
    if (m[1]) {
      m[1].split(',').forEach((part) => {
        const name = part.trim().split(/\s+as\s+/).pop()?.trim().split(':')[0]?.trim()
        if (name && /^[A-Za-z_$]/.test(name)) keys.add(name)
      })
    } else if (m[2]) keys.add(m[2])
  }
  const fn = /function\s+([A-Za-z_$][\w$]*)\s*\(/g
  while ((m = fn.exec(script))) keys.add(m[1]!)
  ;['ref', 'reactive', 'computed', 'watch', 'onMounted', 'onUnmounted', 'nextTick', 'toRef', 'toRefs'].forEach(
    (k) => keys.delete(k),
  )
  return [...keys]
}

function clearHost(el: HTMLElement) {
  el.replaceChildren()
}

function showHostError(el: HTMLElement, err: unknown) {
  clearHost(el)
  const pre = document.createElement('pre')
  pre.className = 'preview-error'
  pre.textContent = err instanceof Error ? err.stack || err.message : String(err)
  el.appendChild(pre)
}

/**
 * 使用应用内 Vue + @vue/compiler-dom，避免再加载 vue.global.prod.js
 * （后者与 ESM Vue 并存时，模板编译会出现 _Vue undefined）
 */
export async function mountVuePreview(host: HTMLElement, code: string): Promise<RunResult> {
  try {
    const { template, script, style } = parseVueSfc(code)
    const keys = collectReturnKeys(script)
    if (!keys.length) {
      return {
        ok: false,
        kind: 'preview',
        output: '未解析到可导出的变量，请在 <script setup> 中用 const 声明状态',
      }
    }

    const Vue = await import('vue')
    const { compile } = await import('@vue/compiler-dom')

    clearHost(host)

    if (style.trim()) {
      const styleEl = document.createElement('style')
      styleEl.textContent = style
      host.appendChild(styleEl)
    }

    const mountEl = document.createElement('div')
    host.appendChild(mountEl)

    const setupFactory = new Function(
      'Vue',
      `return function setup() {\n${script}\nreturn { ${keys.join(', ')} };\n}`,
    ) as (vueNs: typeof Vue) => () => Record<string, unknown>

    const compiled = compile(template, { hoistStatic: true })
    const render = new Function('Vue', `${compiled.code}\nreturn render`)(Vue) as (
      ...args: unknown[]
    ) => unknown

    const app = Vue.createApp({
      setup: setupFactory(Vue),
      render,
    })
    app.mount(mountEl)

    return {
      ok: true,
      kind: 'preview',
      output: '预览已更新',
      unmount: () => {
        try {
          app.unmount()
        } catch {
          /* ignore */
        }
        clearHost(host)
      },
    }
  } catch (err) {
    showHostError(host, err)
    return {
      ok: false,
      kind: 'preview',
      output: err instanceof Error ? err.message : String(err),
      unmount: () => clearHost(host),
    }
  }
}

export async function mountReactPreview(host: HTMLElement, code: string): Promise<RunResult> {
  let root: { unmount: () => void } | null = null
  try {
    const Babel = await getBabel()
    const transformed = Babel.transform(code, {
      presets: [['react', { runtime: 'classic' }]],
      filename: 'practice.jsx',
    }).code
    if (!transformed) {
      return { ok: false, kind: 'preview', output: 'JSX 转译失败' }
    }

    await ensureReactGlobals()
    clearHost(host)
    const mountEl = document.createElement('div')
    mountEl.id = 'prog-react-root'
    host.appendChild(mountEl)

    const patched = transformed.replace(
      /document\.getElementById\(\s*['"]root['"]\s*\)/g,
      'document.getElementById("prog-react-root")',
    )

    const runPatched = new Function(
      'React',
      'ReactDOM',
      'document',
      `${patched}\n; return typeof root !== "undefined" ? root : null;`,
    ) as (
      React: unknown,
      ReactDOM: unknown,
      document: Document,
    ) => { unmount: () => void } | null

    root = runPatched(window.React, window.ReactDOM, document)

    return {
      ok: true,
      kind: 'preview',
      output: '预览已更新',
      unmount: () => {
        try {
          root?.unmount?.()
        } catch {
          /* ignore */
        }
        clearHost(host)
      },
    }
  } catch (err) {
    showHostError(host, err)
    return {
      ok: false,
      kind: 'preview',
      output: err instanceof Error ? err.message : String(err),
      unmount: () => clearHost(host),
    }
  }
}
