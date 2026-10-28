import { languageOf } from '@/domains/programming/localrun/highlight'

export type CompletionKind = 'keyword' | 'api' | 'snippet'

export type CompletionItem = {
  label: string
  /** 插入文本；`|` 表示光标位置（插入后删除该标记） */
  insert: string
  kind: CompletionKind
  detail?: string
  /** HTML 标签名：接受补全时按上下文智能成对/单补 */
  htmlTag?: string
}

const MAX_SUGGEST = 8

function kw(label: string, insert = label): CompletionItem {
  return { label, insert, kind: 'keyword' }
}

function api(label: string, insert = label, detail?: string): CompletionItem {
  return { label, insert, kind: 'api', detail }
}

function snip(label: string, insert: string, detail = 'snippet'): CompletionItem {
  return { label, insert, kind: 'snippet', detail }
}

const JS_KEYWORDS = [
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'class',
  'import',
  'export',
  'from',
  'new',
  'this',
  'async',
  'await',
  'try',
  'catch',
  'finally',
  'throw',
  'typeof',
  'instanceof',
  'in',
  'of',
  'break',
  'continue',
  'switch',
  'case',
  'default',
  'true',
  'false',
  'null',
  'undefined',
  'extends',
  'super',
  'static',
  'yield',
  'void',
  'delete',
].map((w) => kw(w))

const TS_KEYWORDS = [
  ...JS_KEYWORDS,
  ...['interface', 'type', 'enum', 'namespace', 'declare', 'abstract', 'readonly', 'public', 'private', 'protected', 'implements', 'keyof', 'infer', 'as', 'is'].map(
    (w) => kw(w),
  ),
]

const JS_APIS = [
  api('console', 'console'),
  api('console.log', 'console.log(|)', 'log'),
  api('console.error', 'console.error(|)', 'error'),
  api('console.warn', 'console.warn(|)', 'warn'),
  api('document', 'document'),
  api('window', 'window'),
  api('localStorage', 'localStorage'),
  api('sessionStorage', 'sessionStorage'),
  api('JSON', 'JSON'),
  api('JSON.parse', 'JSON.parse(|)'),
  api('JSON.stringify', 'JSON.stringify(|)'),
  api('Array', 'Array'),
  api('Object', 'Object'),
  api('Promise', 'Promise'),
  api('fetch', 'fetch(|)'),
  api('setTimeout', 'setTimeout(|, 0)'),
  api('setInterval', 'setInterval(|, 1000)'),
  api('clearTimeout', 'clearTimeout(|)'),
  api('clearInterval', 'clearInterval(|)'),
  api('parseInt', 'parseInt(|, 10)'),
  api('parseFloat', 'parseFloat(|)'),
  api('Number', 'Number'),
  api('String', 'String'),
  api('Boolean', 'Boolean'),
  api('Math', 'Math'),
  api('Date', 'Date'),
  api('Map', 'Map'),
  api('Set', 'Set'),
  api('Error', 'Error'),
  api('alert', 'alert(|)'),
  api('confirm', 'confirm(|)'),
  api('prompt', 'prompt(|)'),
]

const JS_SNIPPETS = [
  snip('const', 'const | = '),
  snip('let', 'let | = '),
  snip('function', 'function |() {\n  \n}'),
  snip('arrow', '(|) => {\n  \n}'),
  snip('if', 'if (|) {\n  \n}'),
  snip('else', 'else {\n  |\n}'),
  snip('for', 'for (let i = 0; i < |.length; i++) {\n  \n}'),
  snip('forof', 'for (const item of |) {\n  \n}'),
  snip('forin', 'for (const key in |) {\n  \n}'),
  snip('while', 'while (|) {\n  \n}'),
  snip('try', 'try {\n  |\n} catch (err) {\n  \n}'),
  snip('async', 'async function |() {\n  \n}'),
  snip('import', "import { |} from ''"),
  snip('export', 'export '),
  snip('class', 'class | {\n  constructor() {\n    \n  }\n}'),
  snip('log', 'console.log(|)'),
]

/** 无需闭合标签的 HTML 空元素 */
const HTML_VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

/** 通用 HTML + Vue SFC 常用标签（含 template，HTML5 / SFC 都要用） */
const HTML_TAG_NAMES = [
  'template',
  'script',
  'style',
  'div',
  'span',
  'p',
  'a',
  'img',
  'ul',
  'ol',
  'li',
  'button',
  'input',
  'form',
  'label',
  'section',
  'header',
  'footer',
  'nav',
  'main',
  'article',
  'h1',
  'h2',
  'h3',
  'link',
  'meta',
  'title',
  'body',
  'html',
  'head',
]

/** Vue 专有 / 内置组件标签 */
const VUE_TAG_NAMES = [
  'template',
  'script',
  'style',
  'slot',
  'component',
  'transition',
  'Transition',
  'TransitionGroup',
  'KeepAlive',
  'Teleport',
  'Suspense',
]

function htmlTagItem(tag: string): CompletionItem {
  const voidTag = HTML_VOID_TAGS.has(tag)
  return {
    label: tag,
    // 默认展示成对；真正插入由 resolveHtmlTagInsert 按上下文决定
    insert: voidTag ? `<${tag} |>` : `<${tag}|></${tag}>`,
    kind: 'keyword',
    detail: 'tag',
    htmlTag: tag,
  }
}

function countHtmlTagPairs(src: string, tag: string): { open: number; close: number } {
  const name = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const openRe = new RegExp(`<${name}(?=[\\s>/])`, 'gi')
  const closeRe = new RegExp(`</${name}\\s*>`, 'gi')
  return {
    open: (src.match(openRe) || []).length,
    close: (src.match(closeRe) || []).length,
  }
}

/**
 * HTML 标签补全插入文本（含 `|` 光标）：
 * - 光标前已有 `<` / `</`：只补当前这一侧标签
 * - 文档里开标签多于闭标签：补 `</tag>`
 * - 否则成对补齐 `<tag></tag>`
 */
export function resolveHtmlTagInsert(
  tag: string,
  src: string,
  prefixStart: number,
  _caret: number,
): string {
  const t = tag.trim().toLowerCase()
  if (!t || !/^[a-z][\w-]*$/.test(t)) return tag

  const before = src.slice(0, prefixStart)
  const afterLt = before.endsWith('<')
  const afterClose = before.endsWith('</')

  if (HTML_VOID_TAGS.has(t)) {
    if (afterClose) return `${t}>`
    if (afterLt) return `${t} |>`
    return `<${t} |>`
  }

  // 已在写闭合标签：</sty → </style>
  if (afterClose) return `${t}>`
  // 已在写开始标签：<sty → <style></style>（`<` 已存在，只补本标签名 + 配对闭合）
  if (afterLt) return `${t}|></${t}>`

  const { open, close } = countHtmlTagPairs(src, t)
  // 已有未闭合的开标签 → 只补闭合
  if (open > close) return `</${t}>`
  // 闭标签多余 → 只补开标签
  if (close > open) return `<${t}|>`
  // 都没有或已成对 → 新插一对
  return `<${t}|></${t}>`
}

/** 接受补全时解析最终 insert（HTML 标签走智能成对逻辑） */
export function resolveCompletionInsert(
  item: CompletionItem,
  src: string,
  prefixStart: number,
  caret: number,
): string {
  if (item.htmlTag) return resolveHtmlTagInsert(item.htmlTag, src, prefixStart, caret)
  return item.insert
}

const HTML_ITEMS: CompletionItem[] = [
  ...HTML_TAG_NAMES.map(htmlTagItem),
  snip('html5', '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>|</title>\n</head>\n<body>\n  \n</body>\n</html>'),
  api('class', 'class="|"'),
  api('id', 'id="|"'),
  api('href', 'href="|"'),
  api('src', 'src="|"'),
  api('type', 'type="|"'),
  api('placeholder', 'placeholder="|"'),
]

const CSS_ITEMS: CompletionItem[] = [
  ...[
    'display',
    'flex',
    'grid',
    'position',
    'top',
    'left',
    'right',
    'bottom',
    'width',
    'height',
    'margin',
    'padding',
    'border',
    'border-radius',
    'background',
    'background-color',
    'color',
    'font-size',
    'font-weight',
    'line-height',
    'text-align',
    'justify-content',
    'align-items',
    'gap',
    'overflow',
    'z-index',
    'opacity',
    'box-shadow',
    'transform',
    'transition',
  ].map((p) => kw(p, `${p}: |;`)),
  snip('flex-center', 'display: flex;\njustify-content: center;\nalign-items: center;|'),
  snip('media', '@media (max-width: |) {\n  \n}'),
]

const VUE_ITEMS: CompletionItem[] = [
  // SFC 根标签优先，保证输入 template/script/style 一定能命中
  ...VUE_TAG_NAMES.map(htmlTagItem),
  ...HTML_TAG_NAMES.filter((t) => !VUE_TAG_NAMES.includes(t)).map(htmlTagItem),
  ...JS_KEYWORDS,
  ...JS_APIS,
  ...JS_SNIPPETS,
  snip('vue-sfc', '<script setup>\n|\n</script>\n\n<template>\n  <div>\n    \n  </div>\n</template>\n\n<style scoped>\n\n</style>'),
  snip('template', '<template>\n  |\n</template>', 'sfc'),
  snip('script-setup', '<script setup>\n|\n</script>', 'sfc'),
  snip('style-scoped', '<style scoped>\n|\n</style>', 'sfc'),
  snip('v-if', 'v-if="|"'),
  snip('v-for', 'v-for="item in |" :key="item"'),
  snip('v-model', 'v-model="|"'),
  snip('v-bind', ':|=""'),
  snip('v-on', '@|=""'),
  snip('ref', 'const | = ref()'),
  snip('computed', 'const | = computed(() => {\n  \n})'),
  snip('watch', 'watch(|, (val) => {\n  \n})'),
  snip('onMounted', 'onMounted(() => {\n  |\n})'),
  api('ref', 'ref'),
  api('reactive', 'reactive'),
  api('computed', 'computed'),
  api('watch', 'watch'),
  api('onMounted', 'onMounted'),
  api('defineProps', 'defineProps'),
  api('defineEmits', 'defineEmits'),
]

function catalogFor(path: string): CompletionItem[] {
  const lang = languageOf(path)
  if (lang === 'ts') return [...TS_KEYWORDS, ...JS_APIS, ...JS_SNIPPETS]
  if (lang === 'js' || lang === 'json') return [...JS_KEYWORDS, ...JS_APIS, ...JS_SNIPPETS]
  if (lang === 'html') return HTML_ITEMS
  if (lang === 'css') return CSS_ITEMS
  if (lang === 'vue') return VUE_ITEMS
  return [...JS_KEYWORDS, ...JS_APIS, ...JS_SNIPPETS]
}

/** 供 Monaco 按语言 id 取词库（避免 uri 路径丢扩展名时误判成 js） */
export function catalogForLanguage(languageId: string, path: string): CompletionItem[] {
  if (languageId === 'vue' || path.toLowerCase().endsWith('.vue')) return VUE_ITEMS
  if (languageId === 'html') return HTML_ITEMS
  if (languageId === 'css') return CSS_ITEMS
  return catalogFor(path)
}

/** 当前光标前的词前缀（仅 [\w$]） */
export function wordPrefixAt(src: string, caret: number): { prefix: string; start: number } {
  const end = Math.max(0, Math.min(caret, src.length))
  let start = end
  while (start > 0) {
    const ch = src[start - 1]!
    if (!/[\w$]/.test(ch)) break
    start -= 1
  }
  return { prefix: src.slice(start, end), start }
}

/**
 * 按路径语言与前缀给出补全列表。
 * `|` 在 insert 中表示最终光标位置。
 * @param languageId 可选，Monaco 模型语言（vue/html），优先于路径扩展名
 */
export function suggestCompletions(
  path: string,
  prefix: string,
  languageId?: string,
): CompletionItem[] {
  if (!prefix || !/^[\w$]+$/.test(prefix)) return []
  const lower = prefix.toLowerCase()
  const catalog = languageId ? catalogForLanguage(languageId, path) : catalogFor(path)
  const scored: { item: CompletionItem; score: number }[] = []
  const seen = new Set<string>()

  for (const item of catalog) {
    const key = `${item.kind}:${item.label}`
    if (seen.has(key)) continue
    const labelLower = item.label.toLowerCase()
    if (!labelLower.startsWith(lower) && !labelLower.includes(lower)) continue
    seen.add(key)
    let score = 0
    if (labelLower === lower) score = 0
    else if (labelLower.startsWith(lower)) score = 1
    else score = 3
    // 标签成对补全优先于同名 snippet / 普通 keyword
    if (item.htmlTag) score -= 0.5
    else if (item.kind === 'snippet') score += 0.2
    else if (item.kind === 'keyword') score += 0.1
    scored.push({ item, score })
  }

  scored.sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label))
  return scored.slice(0, MAX_SUGGEST).map((s) => s.item)
}

/** 解析 insert 中的 `|` 光标标记，返回纯文本与相对光标偏移 */
export function resolveInsert(insert: string): { text: string; cursorOffset: number } {
  const at = insert.indexOf('|')
  if (at < 0) return { text: insert, cursorOffset: insert.length }
  return { text: insert.slice(0, at) + insert.slice(at + 1), cursorOffset: at }
}
