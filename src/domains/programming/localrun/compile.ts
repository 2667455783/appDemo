import type * as SFC from 'vue/compiler-sfc'
import { convertRpx } from '@/domains/programming/localrun/uniCompat'

export type Framework = 'vue' | 'react' | 'vanilla'

type BabelApi = {
  transform: (code: string, options?: Record<string, unknown>) => { code?: string | null }
  availablePlugins: Record<string, unknown>
}

export type Compilers = {
  babel: BabelApi
  sfc: typeof SFC
}

/** 传给 iframe 的模块：k = 种类，c = CommonJS 代码，css 随模块注入 */
export type CompiledModule =
  | { k: 'js'; c: string; css?: string }
  | { k: 'css'; css: string }
  | { k: 'cssmod'; css: string }
  | { k: 'json'; v: string }
  | { k: 'raw'; v: string }
  | { k: 'err'; v: string }

let compilersPromise: Promise<Compilers> | null = null

export function loadCompilers(): Promise<Compilers> {
  if (!compilersPromise) {
    compilersPromise = Promise.all([import('@babel/standalone'), import('vue/compiler-sfc')])
      .then(([b, sfc]) => {
        const mod = b as unknown as { default?: BabelApi } & BabelApi
        return { babel: mod.default ?? mod, sfc }
      })
      .catch((err) => {
        compilersPromise = null
        throw err
      })
  }
  return compilersPromise
}

export const SCRIPT_RE = /\.(m?js|cjs|jsx|ts|tsx|mts|cts)$/i
const TS_RE = /\.(ts|tsx|mts|cts)$/i
const STYLE_RE = /\.(css|scss|sass|less|styl|stylus|pcss|postcss)$/i
const PREPROCESSED_STYLE_RE = /\.(scss|sass|less|styl|stylus)$/i

function hashId(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0').slice(0, 8)
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/')
  return i < 0 ? '' : path.slice(0, i)
}

export function normalizePath(path: string): string {
  const out: string[] = []
  for (const seg of path.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') out.pop()
    else out.push(seg)
  }
  return out.join('/')
}

function globToRegExp(glob: string): RegExp {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i]!
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        re += '(?:.*/)?'
        i += glob[i + 2] === '/' ? 2 : 1
      } else re += '[^/]*'
    } else if (ch === '?') re += '[^/]'
    else if (ch === '{') {
      const end = glob.indexOf('}', i)
      if (end < 0) re += '\\{'
      else {
        re += `(?:${glob
          .slice(i + 1, end)
          .split(',')
          .map((s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&'))
          .join('|')})`
        i = end
      }
    } else re += ch.replace(/[.+^$()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

/**
 * import.meta.glob 展开成对象字面量：懒加载用 __import__，eager 用 require。
 * 键名保持与源码写法一致（'./x' 或 '/src/x'）。
 */
function expandGlobs(code: string, from: string, allPaths: string[]): string {
  return code.replace(
    /import\.meta\.glob(?:<[^>]*>)?\(\s*(['"`])([^'"`]+)\1\s*(?:,\s*(\{[^}]*\}))?\s*\)/g,
    (_m, _q: string, pattern: string, opts?: string) => {
      const eager = !!opts && /eager\s*:\s*true/.test(opts)
      const absolute = pattern.startsWith('/')
      const base = absolute ? '' : dirname(from)
      const full = normalizePath(absolute ? pattern.slice(1) : `${base}/${pattern}`)
      const re = globToRegExp(full)
      const entries = allPaths
        .filter((p) => re.test(p))
        .map((p) => {
          const key = absolute ? `/${p}` : relativeKey(base, p)
          const spec = JSON.stringify(absolute ? `/${p}` : key)
          return `${JSON.stringify(key)}: ${
            eager ? `__interop_ns__(require(${spec}))` : `() => __import__(${spec})`
          }`
        })
      return `({${entries.join(', ')}})`
    },
  )
}

function relativeKey(fromDir: string, target: string): string {
  const a = fromDir ? fromDir.split('/') : []
  const b = target.split('/')
  let i = 0
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++
  const ups = a.length - i
  const rest = b.slice(i).join('/')
  return ups === 0 ? `./${rest}` : `${'../'.repeat(ups)}${rest}`
}

function preprocess(code: string, from: string, allPaths: string[]): string {
  let out = code
  if (out.includes('import.meta')) {
    out = expandGlobs(out, from, allPaths)
      .replace(/import\.meta\.env/g, '__vite_env__')
      .replace(/import\.meta\.hot/g, 'undefined')
      .replace(/import\.meta\.url/g, 'location.href')
      .replace(/import\.meta/g, '({})')
  }
  return out
}

function babelToCjs(
  babel: BabelApi,
  code: string,
  filename: string,
  framework: Framework,
): string {
  const isTs = TS_RE.test(filename)
  const presets: unknown[] = []
  if (isTs) presets.push('typescript')
  if (framework === 'react' && /\.(m?jsx?|tsx)$/i.test(filename)) {
    presets.push(['react', { runtime: 'automatic' }])
  }
  const plugins: unknown[] = ['transform-modules-commonjs']
  if (babel.availablePlugins['transform-dynamic-import']) plugins.push('transform-dynamic-import')

  const out = babel.transform(code, {
    filename,
    presets,
    plugins,
    sourceType: 'module',
    babelrc: false,
    configFile: false,
  }).code
  if (out == null) throw new Error(`编译失败：${filename}`)
  // 少数 Babel 版本不转 import()，统一交给运行时
  return out.replace(/(?<![\w$.])import\s*\(/g, '__import__(')
}

function compileVue(
  { babel, sfc }: Compilers,
  path: string,
  source: string,
  warnings: string[],
): CompiledModule {
  const { descriptor, errors } = sfc.parse(source, { filename: path, sourceMap: false })
  if (errors.length) {
    return { k: 'err', v: `${path}\n${errors.map((e) => (e as Error).message ?? String(e)).join('\n')}` }
  }

  const id = hashId(path)
  const scoped = descriptor.styles.some((s) => s.scoped)
  const lang = descriptor.scriptSetup?.lang || descriptor.script?.lang
  const isTs = lang === 'ts' || lang === 'tsx'
  const expressionPlugins = isTs ? (['typescript'] as const) : undefined

  // 让 <img src="/vite.svg"> 这类 public 绝对路径也走资源解析
  const transformAssetUrls = { includeAbsolute: true }

  let code = ''
  let bindings: SFC.BindingMetadata | undefined
  if (descriptor.script || descriptor.scriptSetup) {
    const script = sfc.compileScript(descriptor, {
      id,
      inlineTemplate: true,
      genDefaultAs: '__sfc__',
      templateOptions: {
        transformAssetUrls,
        compilerOptions: { expressionPlugins: expressionPlugins ? [...expressionPlugins] : undefined },
      },
    })
    code += script.content
    bindings = script.bindings
  } else {
    code += 'const __sfc__ = {}'
  }

  if (!descriptor.scriptSetup && descriptor.template) {
    const tpl = sfc.compileTemplate({
      source: descriptor.template.content,
      filename: path,
      id,
      scoped,
      slotted: descriptor.slotted,
      transformAssetUrls,
      compilerOptions: {
        bindingMetadata: bindings,
        expressionPlugins: expressionPlugins ? [...expressionPlugins] : undefined,
      },
    })
    if (tpl.errors.length) {
      return { k: 'err', v: `${path}\n${tpl.errors.map((e) => (typeof e === 'string' ? e : e.message)).join('\n')}` }
    }
    code += `\n${tpl.code.replace(/\nexport (function|const) render/, '\n$1 render')}\n__sfc__.render = render`
  }

  if (scoped) code += `\n__sfc__.__scopeId = ${JSON.stringify(`data-v-${id}`)}`
  code += `\n__sfc__.__file = ${JSON.stringify(path)}\nexport default __sfc__`

  let css = ''
  for (const style of descriptor.styles) {
    if (style.lang && !['css', 'postcss', 'pcss'].includes(style.lang)) {
      warnings.push(`${path}：<style lang="${style.lang}"> 未预编译，按普通 CSS 注入`)
    }
    if (style.module) warnings.push(`${path}：<style module> 暂不支持`)
    const res = sfc.compileStyle({
      source: style.content,
      filename: path,
      id: `data-v-${id}`,
      scoped: style.scoped,
    })
    css += `${convertRpx(res.code)}\n`
  }

  const js = babelToCjs(babel, code, `${path}${isTs ? '.ts' : '.js'}`, 'vue')
  return css.trim() ? { k: 'js', c: js, css } : { k: 'js', c: js }
}

export function compileFile(
  compilers: Compilers,
  path: string,
  source: string,
  framework: Framework,
  allPaths: string[],
  warnings: string[],
): CompiledModule {
  try {
    if (/\.vue$/i.test(path)) {
      return compileVue(compilers, path, preprocess(source, path, allPaths), warnings)
    }
    if (SCRIPT_RE.test(path)) {
      return { k: 'js', c: babelToCjs(compilers.babel, preprocess(source, path, allPaths), path, framework) }
    }
    if (STYLE_RE.test(path)) {
      if (PREPROCESSED_STYLE_RE.test(path)) warnings.push(`${path}：预处理样式未编译，按普通 CSS 注入`)
      const css = convertRpx(source)
      return /\.module\.[a-z]+$/i.test(path) ? { k: 'cssmod', css } : { k: 'css', css }
    }
    if (/\.json$/i.test(path)) {
      JSON.parse(source)
      return { k: 'json', v: source }
    }
    return { k: 'raw', v: source }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { k: 'err', v: `${path}\n${msg}` }
  }
}
