export type TokenKind = 'keyword' | 'tag' | 'attr' | 'string' | 'comment' | 'number' | 'punct' | 'plain'

export type Token = { kind: TokenKind; text: string; start: number }

export type MatchRange = { start: number; end: number }

export type SearchOpts = {
  caseSensitive: boolean
  regex: boolean
  wholeWord: boolean
}

const JS_KW = new Set(
  `const let var function return if else for while do class import export from new this async await try catch finally throw typeof instanceof in of break continue switch case default true false null undefined extends super static yield void delete`.split(
    ' ',
  ),
)

const TS_KW = new Set(
  [...JS_KW, ...`interface type enum namespace declare abstract readonly public private protected implements keyof infer as is`.split(' ')],
)

const MAX_MATCHES = 300
const MAX_HIGHLIGHT = 200_000

function push(out: Token[], kind: TokenKind, text: string, start: number) {
  if (!text) return
  const prev = out[out.length - 1]
  if (prev && prev.kind === kind && prev.start + prev.text.length === start) {
    prev.text += text
    return
  }
  out.push({ kind, text, start })
}

function covers(tokens: Token[], len: number) {
  let p = 0
  for (const t of tokens) {
    if (t.start !== p) return false
    p += t.text.length
  }
  return p === len
}

function plain(src: string): Token[] {
  return src ? [{ kind: 'plain', text: src, start: 0 }] : []
}

function readString(src: string, i: number, quote: string): number {
  let j = i + 1
  while (j < src.length) {
    if (src[j] === '\\') {
      j += 2
      continue
    }
    if (src[j] === quote) return j + 1
    j++
  }
  return src.length
}

function highlightJs(src: string, keywords: Set<string>): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    if (src.startsWith('//', i)) {
      const nl = src.indexOf('\n', i)
      const end = nl === -1 ? src.length : nl
      push(out, 'comment', src.slice(i, end), i)
      i = end
      continue
    }
    if (src.startsWith('/*', i)) {
      const endMark = src.indexOf('*/', i + 2)
      const end = endMark === -1 ? src.length : endMark + 2
      push(out, 'comment', src.slice(i, end), i)
      i = end
      continue
    }
    const c = src[i]!
    if (c === '"' || c === "'" || c === '`') {
      const end = readString(src, i, c)
      push(out, 'string', src.slice(i, end), i)
      i = end
      continue
    }
    if (c >= '0' && c <= '9' && (i === 0 || !/[\w$]/.test(src[i - 1]!))) {
      const m = /^\d[\w.]*/.exec(src.slice(i))
      const text = m?.[0] ?? c
      push(out, 'number', text, i)
      i += text.length
      continue
    }
    if (/[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i))
      const text = m?.[0] ?? c
      push(out, keywords.has(text) ? 'keyword' : 'plain', text, i)
      i += text.length
      continue
    }
    if ('{}()[];,.:?=+-*/%<>!&|~^'.includes(c)) {
      push(out, 'punct', c, i)
      i++
      continue
    }
    push(out, 'plain', c, i)
    i++
  }
  return covers(out, src.length) ? out : plain(src)
}

function highlightCss(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    if (src.startsWith('/*', i)) {
      const endMark = src.indexOf('*/', i + 2)
      const end = endMark === -1 ? src.length : endMark + 2
      push(out, 'comment', src.slice(i, end), i)
      i = end
      continue
    }
    const c = src[i]!
    if (c === '"' || c === "'") {
      const end = readString(src, i, c)
      push(out, 'string', src.slice(i, end), i)
      i = end
      continue
    }
    if (c === '@') {
      const m = /^@[\w-]+/.exec(src.slice(i))
      const text = m?.[0] ?? c
      push(out, 'keyword', text, i)
      i += text.length
      continue
    }
    if (c === '#') {
      const m = /^#[\w-]+/.exec(src.slice(i))
      const text = m?.[0] ?? c
      push(out, 'number', text, i)
      i += text.length
      continue
    }
    if ((c >= '0' && c <= '9') || (c === '.' && src[i + 1]! >= '0' && src[i + 1]! <= '9')) {
      const m = /^(?:\d+\.?\d*|\.\d+)[\w%]*/.exec(src.slice(i))
      const text = m?.[0] ?? c
      push(out, 'number', text, i)
      i += text.length
      continue
    }
    if (/[A-Za-z_-]/.test(c)) {
      const m = /^[A-Za-z_-][\w-]*/.exec(src.slice(i))
      const text = m?.[0] ?? c
      let j = i + text.length
      while (src[j] === ' ' || src[j] === '\t') j++
      push(out, src[j] === ':' ? 'attr' : 'tag', text, i)
      i += text.length
      continue
    }
    if ('{}[]();:,.>+~*=!'.includes(c)) {
      push(out, 'punct', c, i)
      i++
      continue
    }
    push(out, 'plain', c, i)
    i++
  }
  return covers(out, src.length) ? out : plain(src)
}

function highlightHtmlText(src: string, offset: number, out: Token[]) {
  const re = /\{\{[\s\S]*?\}\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (m.index > last) push(out, 'plain', src.slice(last, m.index), offset + last)
    push(out, 'punct', '{{', offset + m.index)
    const inner = m[0].slice(2, -2)
    const innerTokens = highlightJs(inner, JS_KW)
    for (const t of innerTokens) push(out, t.kind, t.text, offset + m.index + 2 + t.start)
    push(out, 'punct', '}}', offset + m.index + m[0].length - 2)
    last = m.index + m[0].length
  }
  if (last < src.length) push(out, 'plain', src.slice(last), offset + last)
}

function highlightHtml(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    if (src.startsWith('<!--', i)) {
      const endMark = src.indexOf('-->', i + 4)
      const end = endMark === -1 ? src.length : endMark + 3
      push(out, 'comment', src.slice(i, end), i)
      i = end
      continue
    }
    if (src[i] !== '<') {
      const next = src.indexOf('<', i)
      const end = next === -1 ? src.length : next
      highlightHtmlText(src.slice(i, end), i, out)
      i = end
      continue
    }
    const selfCloseAhead = src.startsWith('</', i)
    push(out, 'punct', selfCloseAhead ? '</' : '<', i)
    i += selfCloseAhead ? 2 : 1
    const name = /^[A-Za-z][\w:-]*/.exec(src.slice(i))
    if (name) {
      push(out, 'tag', name[0], i)
      i += name[0].length
    }
    while (i < src.length && src[i] !== '>') {
      const c = src[i]!
      if (c === '"' || c === "'") {
        const end = readString(src, i, c)
        push(out, 'string', src.slice(i, end), i)
        i = end
        continue
      }
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        let j = i + 1
        while (src[j] === ' ' || src[j] === '\t' || src[j] === '\n' || src[j] === '\r') j++
        push(out, 'plain', src.slice(i, j), i)
        i = j
        continue
      }
      if (c === '/' && src[i + 1] === '>') {
        push(out, 'punct', '/>', i)
        i += 2
        break
      }
      if (c === '=') {
        push(out, 'punct', '=', i)
        i++
        continue
      }
      const attr = /^[\w:.-]+/.exec(src.slice(i))
      if (attr) {
        push(out, 'attr', attr[0], i)
        i += attr[0].length
        continue
      }
      push(out, 'plain', c, i)
      i++
    }
    if (src[i] === '>') {
      push(out, 'punct', '>', i)
      i++
    }
  }
  return covers(out, src.length) ? out : plain(src)
}

function highlightVue(src: string): Token[] {
  const out: Token[] = []
  const re = /<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const idx = m.index
    if (idx > last) {
      for (const t of highlightHtml(src.slice(last, idx))) push(out, t.kind, t.text, last + t.start)
    }
    const block = m[0]
    const openEnd = block.indexOf('>') + 1
    const closeAt = block.lastIndexOf('</')
    for (const t of highlightHtml(block.slice(0, openEnd))) push(out, t.kind, t.text, idx + t.start)
    const inner = block.slice(openEnd, closeAt)
    const isStyle = /^<style/i.test(block)
    const isTs = /lang\s*=\s*["']ts["']/i.test(block.slice(0, openEnd))
    const innerTokens = isStyle ? highlightCss(inner) : highlightJs(inner, isTs ? TS_KW : JS_KW)
    for (const t of innerTokens) push(out, t.kind, t.text, idx + openEnd + t.start)
    for (const t of highlightHtml(block.slice(closeAt))) push(out, t.kind, t.text, idx + closeAt + t.start)
    last = idx + block.length
  }
  if (last < src.length) {
    for (const t of highlightHtml(src.slice(last))) push(out, t.kind, t.text, last + t.start)
  }
  return covers(out, src.length) ? out : plain(src)
}

export function languageOf(path: string): 'html' | 'vue' | 'css' | 'js' | 'ts' | 'json' | 'text' {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'vue') return 'vue'
  if (ext === 'html' || ext === 'htm' || ext === 'xml' || ext === 'svg') return 'html'
  if (ext === 'css' || ext === 'scss' || ext === 'less') return 'css'
  if (ext === 'ts' || ext === 'tsx') return 'ts'
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') return 'js'
  if (ext === 'json') return 'json'
  return 'text'
}

export function languageLabel(path: string): string {
  const lang = languageOf(path)
  if (lang === 'text') {
    const ext = path.split('.').pop()
    return ext && ext !== path ? ext.toUpperCase() : 'TEXT'
  }
  return lang === 'js' ? 'JavaScript' : lang === 'ts' ? 'TypeScript' : lang.toUpperCase()
}

function tokenize(src: string, path: string): Token[] {
  if (!src) return []
  if (src.length > MAX_HIGHLIGHT) return plain(src)
  const lang = languageOf(path)
  if (lang === 'html') return highlightHtml(src)
  if (lang === 'vue') return highlightVue(src)
  if (lang === 'css') return highlightCss(src)
  if (lang === 'ts') return highlightJs(src, TS_KW)
  if (lang === 'js' || lang === 'json') return highlightJs(src, JS_KW)
  return plain(src)
}

function esc(s: string) {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
}

export function renderHighlighted(src: string, path: string, matches: MatchRange[], active: number): string {
  const tokens = tokenize(src, path)
  if (!tokens.length) return ''
  const activeMatch = matches[active]
  let html = ''
  let mi = 0
  for (const tok of tokens) {
    const t0 = tok.start
    const t1 = t0 + tok.text.length
    let pos = t0
    let inner = ''
    while (mi < matches.length && matches[mi]!.end <= t0) mi++
    let k = mi
    while (k < matches.length && matches[k]!.start < t1) {
      const m = matches[k]!
      const a = Math.max(m.start, t0)
      const b = Math.min(m.end, t1)
      if (a > pos) inner += esc(src.slice(pos, a))
      const on = !!activeMatch && m.start === activeMatch.start && m.end === activeMatch.end
      inner += `<mark class="${on ? 'on' : ''}">${esc(src.slice(a, b))}</mark>`
      pos = b
      if (m.end <= t1) k++
      else break
    }
    if (pos < t1) inner += esc(src.slice(pos, t1))
    html += `<span class="tok-${tok.kind}">${inner}</span>`
  }
  return html
}

function isWordChar(ch: string | undefined) {
  return !!ch && /[\w$]/.test(ch)
}

export function findMatches(src: string, query: string, opts: SearchOpts): { ranges: MatchRange[]; invalid: boolean } {
  if (!query) return { ranges: [], invalid: false }
  const ranges: MatchRange[] = []
  if (opts.regex) {
    let re: RegExp
    try {
      const body = opts.wholeWord ? `\\b(?:${query})\\b` : query
      re = new RegExp(body, opts.caseSensitive ? 'g' : 'gi')
    } catch {
      return { ranges: [], invalid: true }
    }
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) {
      if (m[0].length === 0) {
        re.lastIndex += 1
        continue
      }
      ranges.push({ start: m.index, end: m.index + m[0].length })
      if (ranges.length >= MAX_MATCHES) break
    }
    return { ranges, invalid: false }
  }
  const hay = opts.caseSensitive ? src : src.toLowerCase()
  const needle = opts.caseSensitive ? query : query.toLowerCase()
  let from = 0
  while (from <= hay.length) {
    const at = hay.indexOf(needle, from)
    if (at < 0) break
    const end = at + needle.length
    const ok = !opts.wholeWord || (!isWordChar(src[at - 1]) && !isWordChar(src[end]))
    if (ok) ranges.push({ start: at, end })
    if (ranges.length >= MAX_MATCHES) break
    from = at + Math.max(needle.length, 1)
  }
  return { ranges, invalid: false }
}
