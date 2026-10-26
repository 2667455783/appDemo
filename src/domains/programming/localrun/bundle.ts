import {
  compileFile,
  loadCompilers,
  normalizePath,
  type CompiledModule,
  type Compilers,
  type Framework,
} from '@/domains/programming/localrun/compile'
import { BRIDGE_SCRIPT, MODULE_RUNTIME, importMapScript } from '@/domains/programming/localrun/runtime'
import {
  DCLOUD_STUB_CJS,
  buildUniCompatPlan,
  isUniAppProject,
} from '@/domains/programming/localrun/uniCompat'

export type LocalProject = {
  files: Record<string, string>
  /** 远程 raw 根地址，图片等未拉取的资源从这里加载 */
  assetBase?: string
}

/** 运行面板用：附带标题与默认打开的文件 */
export type LocalRunProject = LocalProject & {
  title: string
  openFile?: string
}

export type LocalBundle = {
  html: string
  framework: Framework
  entries: string[]
  deps: string[]
  warnings: string[]
}

export type BundleOptions = {
  /** 以 / 结尾的 vendor 目录绝对地址 */
  vendorBase: string
  compilers?: Compilers
}

const ESM_CDN = 'https://esm.sh/'
const ASSET_RE = /\.(png|jpe?g|gif|webp|avif|ico|bmp|svg|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|ogg)$/i
const BARE_STYLE_RE = /\.(css|scss|sass|less)$/i
const ENTRY_CANDIDATES = [
  'src/main.ts',
  'src/main.js',
  'src/main.tsx',
  'src/main.jsx',
  'src/index.tsx',
  'src/index.jsx',
  'src/index.ts',
  'src/index.js',
  'main.ts',
  'main.js',
  'index.tsx',
  'index.jsx',
  'index.ts',
  'index.js',
]
const RESOLVE_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.vue', '.json', '.css']
const SHIMMED = new Set(['vue', 'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'])

type PkgJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

function readPkg(files: Record<string, string>): Record<string, string> {
  const raw = files['package.json']
  if (!raw) return {}
  try {
    const pkg = JSON.parse(raw) as PkgJson
    return { ...pkg.devDependencies, ...pkg.dependencies }
  } catch {
    return {}
  }
}

function detectFramework(files: Record<string, string>, pkgDeps: Record<string, string>): Framework {
  if (pkgDeps.vue || Object.keys(files).some((p) => p.endsWith('.vue'))) return 'vue'
  if (pkgDeps.react || Object.keys(files).some((p) => /\.(jsx|tsx)$/i.test(p))) return 'react'
  return 'vanilla'
}

function cleanVersion(range?: string): string {
  if (!range || /^(workspace:|file:|link:|git|https?:|github:)/.test(range)) return ''
  return range.match(/\d+(?:\.\d+){0,2}(?:-[\w.]+)?/)?.[0] ?? ''
}

function splitPkg(spec: string): { name: string; sub: string } {
  const parts = spec.split('/')
  const n = spec.startsWith('@') ? 2 : 1
  return { name: parts.slice(0, n).join('/'), sub: parts.length > n ? `/${parts.slice(n).join('/')}` : '' }
}

function isBare(spec: string): boolean {
  return !/^(\.{1,2}(\/|$)|\/|@\/|~\/)/.test(spec)
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/')
  return i < 0 ? '' : path.slice(0, i)
}

function resolveLocal(from: string, spec: string): string {
  if (spec.startsWith('@/') || spec.startsWith('~/')) return normalizePath(`src/${spec.slice(2)}`)
  if (spec.startsWith('/')) return normalizePath(spec)
  return normalizePath(`${dirname(from)}/${spec}`)
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function dataModule(src: string): string {
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(src)}`
}

function parseEnvFiles(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
    const raw = files[name]
    if (!raw) continue
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*)\s*$/)
      if (m) out[m[1]!] = m[2]!.replace(/^(['"])(.*)\1$/, '$2')
    }
  }
  return out
}

function attr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))
  return m ? m[2]! : null
}

function escapeScript(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script')
}

function jsonForHtml(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export async function buildLocalBundle(project: LocalProject, opts: BundleOptions): Promise<LocalBundle> {
  const files = { ...project.files }
  const { assetBase } = project
  const compilers = opts.compilers ?? (await loadCompilers())
  const warnings: string[] = []
  const pkgDeps = readPkg(files)

  const vueRange = pkgDeps.vue?.trim()
  if (vueRange && /^[\^~>=\s]*2\./.test(vueRange)) {
    throw new Error('检测到 Vue 2 项目，本地运行目前只支持 Vue 3')
  }
  const uniPlan = buildUniCompatPlan(files, assetBase)
  if (uniPlan) {
    Object.assign(files, uniPlan.virtualFiles)
    warnings.push(uniPlan.warning)
  }
  const allPaths = Object.keys(files)
  const framework = uniPlan ? 'vue' : detectFramework(files, pkgDeps)

  const findFile = (base: string): string | null => {
    for (const ext of RESOLVE_EXTS) if (files[base + ext] != null) return base + ext
    for (const ext of RESOLVE_EXTS.slice(1)) if (files[`${base}/index${ext}`] != null) return `${base}/index${ext}`
    return null
  }
  const assetUrl = (path: string) => (assetBase ? assetBase + encodePath(path) : '')

  /** —— index.html —— */
  const htmlPath = files['index.html'] != null ? 'index.html' : files['public/index.html'] != null ? 'public/index.html' : ''
  const htmlDir = htmlPath ? dirname(htmlPath) : ''
  let html = htmlPath
    ? files[htmlPath]!.replace(/<%[=-]?[\s\S]*?%>/g, '').replace(/%(PUBLIC_URL|BASE_URL|VITE_[A-Z0-9_]+)%/g, '')
    : '<div id="app"></div><div id="root"></div>'

  const entries: string[] = []
  const htmlLocal = (src: string): string | null => {
    if (/^([a-z]+:)?\/\//i.test(src) || src.startsWith('data:')) return null
    const clean = src.split(/[?#]/)[0]!
    const p = clean.startsWith('/') ? normalizePath(clean) : normalizePath(`${htmlDir}/${clean}`)
    if (files[p] != null) return p
    if (files[`public/${p}`] != null) return `public/${p}`
    return p
  }

  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (whole, attrs: string) => {
    const src = attr(attrs, 'src')
    if (!src) return whole
    const local = htmlLocal(src)
    if (!local) return whole
    if (files[local] == null) {
      warnings.push(`index.html 引用的脚本不存在：${src}`)
      return ''
    }
    const isModule = (attr(attrs, 'type') ?? '').toLowerCase() === 'module'
    if (isModule || !/\.m?js$/i.test(local)) {
      entries.push(local)
      return ''
    }
    return `<script>${escapeScript(files[local]!)}</script>`
  })

  html = html.replace(/<link\b([^>]*?)\/?>/gi, (whole, attrs: string) => {
    if (!/stylesheet/i.test(attr(attrs, 'rel') ?? '')) return whole
    const href = attr(attrs, 'href')
    const local = href ? htmlLocal(href) : null
    if (!local) return whole
    const css = files[local]
    return css == null ? '' : `<style>${css}</style>`
  })

  if (!entries.length) {
    const fallback = ENTRY_CANDIDATES.find((p) => files[p] != null)
    if (fallback) entries.push(fallback)
  }
  if (uniPlan) {
    entries.length = 0
    entries.push(uniPlan.entry)
  }
  if (!entries.length && !htmlPath) {
    const sample = allPaths.slice(0, 8).join('、') || '（无）'
    throw new Error(
      `没找到入口：需要 index.html，或 src/main.(ts|js) / src/index.(tsx|jsx|js)。当前文件：${sample}`,
    )
  }

  /** —— 模块图 —— */
  const mods: Record<string, CompiledModule> = {}
  const deps = new Set<string>()
  const cssDeps = new Set<string>()
  const queue = [...entries]

  const resolveSpec = (from: string, spec: string): string => {
    const [path, query = ''] = spec.split('?') as [string, string?]
    if (isBare(path)) {
      if (path.startsWith('@dcloudio/')) return `uni-stub:${path}`
      if (BARE_STYLE_RE.test(path)) {
        cssDeps.add(path)
        return `depcss:${path}`
      }
      deps.add(path)
      return `dep:${path}`
    }
    const base = resolveLocal(from, path)
    if (/(^|&)raw\b/.test(query)) {
      const f = findFile(base)
      if (!f) return `missing:${spec}（来自 ${from}）`
      queue.push(`raw:${f}`)
      return `raw:${f}`
    }
    const wantsUrl = /(^|&)url\b/.test(query)
    const found = findFile(base)
    if (found && !wantsUrl && !ASSET_RE.test(found)) {
      queue.push(found)
      return found
    }
    if (wantsUrl || ASSET_RE.test(base)) {
      const publicPath = path.startsWith('/') && !base.startsWith('src/') ? `public/${base}` : base
      return `asset:${assetUrl(found ?? publicPath)}`
    }
    return `missing:${spec}（来自 ${from}）`
  }

  while (queue.length) {
    const id = queue.pop()!
    if (mods[id]) continue
    if (id.startsWith('raw:')) {
      mods[id] = { k: 'raw', v: files[id.slice(4)] ?? '' }
      continue
    }
    if (id.startsWith('uni-stub:')) {
      mods[id] = { k: 'js', c: DCLOUD_STUB_CJS }
      continue
    }
    const compiled = compileFile(compilers, id, files[id] ?? '', framework, allPaths, warnings)
    if (compiled.k === 'js') {
      compiled.c = compiled.c.replace(
        /(?<![\w$.])(require|__import__)\(\s*(["'])([^"'\n]+)\2\s*\)/g,
        (_m, fn: string, _q: string, spec: string) => `${fn}(${JSON.stringify(resolveSpec(id, spec))})`,
      )
    }
    mods[id] = compiled
  }

  /** —— 依赖：Vue / React 走本地 vendor，其余 esm.sh —— */
  const depList = [...deps]
  const needVue = deps.has('vue') || !!uniPlan || isUniAppProject(files, pkgDeps)
  const needReact = depList.some((s) => /^react(-dom)?(\/|$)/.test(s))
  const externals = [needVue ? 'vue' : '', needReact ? 'react,react-dom' : ''].filter(Boolean).join(',')

  const remote: Record<string, string> = {}
  for (const spec of depList) {
    if (SHIMMED.has(spec)) continue
    const { name, sub } = splitPkg(spec)
    const ver = cleanVersion(pkgDeps[name])
    const url = `${ESM_CDN}${name}${ver ? `@${ver}` : ''}${sub}${externals ? `?external=${externals}` : ''}`
    if (spec === 'vue-router') {
      remote[spec] = dataModule(
        `import * as M from ${JSON.stringify(url)};export * from ${JSON.stringify(url)};` +
          'export const createWebHistory = M.createWebHashHistory;',
      )
    } else if (spec === 'react-router-dom' || spec === 'react-router') {
      // about:srcdoc 下 new URL(path, location.href) 非法，Browser/Hash 路由都会崩，统一走内存路由
      remote[spec] = dataModule(
        `import * as M from ${JSON.stringify(url)};export * from ${JSON.stringify(url)};` +
          'export const BrowserRouter = M.MemoryRouter;export const HashRouter = M.MemoryRouter;' +
          'export const createBrowserRouter = M.createMemoryRouter;export const createHashRouter = M.createMemoryRouter;',
      )
    } else {
      remote[spec] = url
    }
  }
  const remoteDeps = depList.filter((s) => !SHIMMED.has(s))
  if (remoteDeps.length) warnings.push(`从 esm.sh 加载依赖：${remoteDeps.join('、')}`)

  const cssLinks = [...cssDeps]
    .map((spec) => {
      const { name, sub } = splitPkg(spec)
      const ver = cleanVersion(pkgDeps[name])
      return `<link rel="stylesheet" href="${ESM_CDN}${name}${ver ? `@${ver}` : ''}${sub}">`
    })
    .join('\n')

  const env = parseEnvFiles(files)
  const viteEnv: Record<string, unknown> = { MODE: 'development', DEV: true, PROD: false, SSR: false, BASE_URL: '/' }
  const processEnv: Record<string, string> = { NODE_ENV: 'development' }
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith('VITE_')) viteEnv[k] = v
    if (k.startsWith('REACT_APP_') || k.startsWith('VUE_APP_')) processEnv[k] = v
  }

  /** —— 组装 iframe 文档 —— */
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i)
  const headRest = headMatch?.[1] ?? ''
  const bodyAttrs = bodyMatch?.[1] ?? ''
  // 有 <head> 却无 <body> 时，不能丢成空串（浏览器会把 head 后兄弟节点当 body）
  let bodyRest: string
  if (bodyMatch) {
    bodyRest = bodyMatch[2]!
  } else if (headMatch) {
    const close = html.toLowerCase().indexOf('</head>')
    bodyRest =
      close >= 0
        ? html
            .slice(close + '</head>'.length)
            .replace(/<\/html>\s*$/i, '')
            .trim()
        : html
  } else {
    bodyRest = html
  }

  const vendor = [
    needVue ? `<script src="${opts.vendorBase}vue.global.prod.js"></script>` : '',
    needReact ? `<script src="${opts.vendorBase}react.production.min.js"></script>` : '',
    needReact ? `<script src="${opts.vendorBase}react-dom.production.min.js"></script>` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const meta = { entries, deps: depList, env: viteEnv, processEnv }

  const doc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>${BRIDGE_SCRIPT}</script>
${vendor}
<script>${importMapScript(remote)}</script>
${cssLinks}
${headRest}
</head>
<body${bodyAttrs}>
${bodyRest}
<script type="application/json" id="__localrun_mods">${jsonForHtml(mods)}</script>
<script type="application/json" id="__localrun_meta">${jsonForHtml(meta)}</script>
<script type="module">${MODULE_RUNTIME}</script>
</body>
</html>`

  return { html: doc, framework, entries, deps: depList, warnings }
}
