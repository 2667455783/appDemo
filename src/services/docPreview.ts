import { uid } from '@/utils/storage'

export type DocKind = 'image' | 'txt' | 'md' | 'html' | 'pdf' | 'word' | 'excel' | 'unsupported'

export type ExcelSheet = { name: string; rows: string[][] }

export type ParsedDoc =
  | { kind: 'image'; url: string }
  | { kind: 'txt'; text: string }
  | { kind: 'md'; html: string }
  | { kind: 'html'; html: string }
  | { kind: 'word'; html: string }
  | { kind: 'pdf'; images: string[]; total: number; truncated: boolean }
  | { kind: 'excel'; sheets: ExcelSheet[] }
  | { kind: 'unsupported'; reason: string }

export type OpenDoc = {
  id: string
  name: string
  kind: DocKind
  sizeLabel: string
  parsed: ParsedDoc
  /** Markdown / HTML 原文，用于切换「渲染 / 原文」 */
  rawText?: string
}

export const DOC_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.markdown,.mdown,.mkd,.html,.htm,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,application/pdf,image/*,text/plain,text/markdown,text/x-markdown,text/html,text/csv'

const MAX_BYTES = 32 * 1024 * 1024
const PDF_MAX_PAGES = 40
const EXCEL_MAX_ROWS = 200
const EXCEL_MAX_COLS = 24

const KIND_LABEL: Record<DocKind, string> = {
  image: '图片',
  txt: 'TXT',
  md: 'Markdown',
  html: 'HTML',
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  unsupported: '不支持',
}

export function kindLabel(kind: DocKind): string {
  return KIND_LABEL[kind]
}

export function detectKind(file: File): DocKind {
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return 'image'
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.docx') || type.includes('wordprocessingml')) return 'word'
  if (name.endsWith('.doc')) return 'word'
  if (
    /\.(xlsx|xls|csv)$/.test(name) ||
    type.includes('spreadsheet') ||
    type.includes('excel') ||
    type === 'text/csv'
  ) {
    return 'excel'
  }
  if (
    /\.(md|markdown|mdown|mkd)$/.test(name) ||
    type === 'text/markdown' ||
    type === 'text/x-markdown'
  ) {
    return 'md'
  }
  // 必须在通用 text/* 之前：否则 text/html 会被当成 TXT 源码
  if (/\.html?$/.test(name) || type === 'text/html' || type === 'application/xhtml+xml') {
    return 'html'
  }
  if (name.endsWith('.txt') || type.startsWith('text/')) return 'txt'
  return 'unsupported'
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,iframe,object,embed,link,meta,form').forEach((n) => n.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const v = attr.value.trim().toLowerCase()
      if (/^on/i.test(attr.name) || v.startsWith('javascript:') || v.startsWith('data:text/html')) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return doc.body.innerHTML
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let inCode = false
  const code: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inQuote = false
  let inTable = false
  const tableRows: string[][] = []

  const closeList = () => {
    if (listType) {
      html.push(listType === 'ul' ? '</ul>' : '</ol>')
      listType = null
    }
  }

  const closeQuote = () => {
    if (inQuote) {
      html.push('</blockquote>')
      inQuote = false
    }
  }

  const flushTable = () => {
    if (!inTable || !tableRows.length) {
      inTable = false
      tableRows.length = 0
      return
    }
    const [header, ...rest] = tableRows
    // 去掉对齐分隔行 |---|---|
    const body = rest.filter((row) => !row.every((c) => /^:?-{2,}:?$/.test(c.trim())))
    html.push('<table><thead><tr>')
    for (const cell of header!) html.push(`<th>${inline(cell.trim())}</th>`)
    html.push('</tr></thead><tbody>')
    for (const row of body) {
      html.push('<tr>')
      for (const cell of row) html.push(`<td>${inline(cell.trim())}</td>`)
      html.push('</tr>')
    }
    html.push('</tbody></table>')
    inTable = false
    tableRows.length = 0
  }

  const closeBlocks = () => {
    flushTable()
    closeList()
    closeQuote()
  }

  const inline = (s: string) => {
    let t = escapeHtml(s)
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
    t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>')
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    t = t.replace(/__([^_]+)__/g, '<strong>$1</strong>')
    // 先处理加粗后再处理单星号/下划线斜体，避免 lookbehind（旧 WebView 不支持）
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    t = t.replace(/_([^_]+)_/g, '<em>$1</em>')
    t = t.replace(
      /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
      '<img src="$2" alt="$1" loading="lazy" />',
    )
    t = t.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    return t
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
        code.length = 0
        inCode = false
      } else {
        closeBlocks()
        inCode = true
      }
      continue
    }
    if (inCode) {
      code.push(line)
      continue
    }

    const tableLine = /^\s*\|(.+)\|\s*$/.exec(line)
    if (tableLine) {
      closeList()
      closeQuote()
      const cells = tableLine[1]!.split('|')
      if (!inTable) inTable = true
      tableRows.push(cells)
      continue
    }
    if (inTable) flushTable()

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      closeBlocks()
      html.push('<hr />')
      continue
    }

    const h = /^(#{1,6})\s+(.+)$/.exec(line)
    if (h) {
      closeBlocks()
      const lv = h[1]!.length
      html.push(`<h${lv}>${inline(h[2]!.trim())}</h${lv}>`)
      continue
    }

    const quote = /^\s*>\s?(.*)$/.exec(line)
    if (quote) {
      closeList()
      flushTable()
      if (!inQuote) {
        html.push('<blockquote>')
        inQuote = true
      }
      const q = quote[1]!.trim()
      html.push(q ? `<p>${inline(q)}</p>` : '<p></p>')
      continue
    }
    if (inQuote) closeQuote()

    const ul = /^\s*[-*+]\s+(.+)$/.exec(line)
    if (ul) {
      if (listType !== 'ul') {
        closeList()
        html.push('<ul>')
        listType = 'ul'
      }
      html.push(`<li>${inline(ul[1]!)}</li>`)
      continue
    }
    const ol = /^\s*\d+[.)]\s+(.+)$/.exec(line)
    if (ol) {
      if (listType !== 'ol') {
        closeList()
        html.push('<ol>')
        listType = 'ol'
      }
      html.push(`<li>${inline(ol[1]!)}</li>`)
      continue
    }

    closeList()
    if (!line.trim()) {
      html.push('')
      continue
    }
    html.push(`<p>${inline(line)}</p>`)
  }
  if (inCode) html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
  closeBlocks()
  return html.filter((x) => x !== '').join('\n') || '<p>（空文档）</p>'
}

function decodeText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes)
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }
  return new TextDecoder('utf-8').decode(bytes)
}

async function parsePdf(file: File): Promise<ParsedDoc> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  const total = pdf.numPages
  const limit = Math.min(total, PDF_MAX_PAGES)
  const images: string[] = []
  for (let i = 1; i <= limit; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.25 })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: ctx, viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.82))
  }
  return { kind: 'pdf', images, total, truncated: total > PDF_MAX_PAGES }
}

async function parseWord(file: File): Promise<ParsedDoc> {
  if (file.name.toLowerCase().endsWith('.doc') && !file.name.toLowerCase().endsWith('.docx')) {
    return { kind: 'unsupported', reason: '旧版 .doc 请另存为 .docx 后再导入' }
  }
  const mod = await import('mammoth')
  const mammoth = 'default' in mod && mod.default ? mod.default : mod
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.convertToHtml({ arrayBuffer })
  return { kind: 'word', html: sanitizeHtml(value || '<p>（空文档）</p>') }
}

function trimSheet(rows: string[][]): string[][] {
  return rows.slice(0, EXCEL_MAX_ROWS).map((row) =>
    row.slice(0, EXCEL_MAX_COLS).map((cell) => (cell == null ? '' : String(cell))),
  )
}

async function parseExcel(file: File): Promise<ParsedDoc> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheets: ExcelSheet[] = wb.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], {
      header: 1,
      raw: false,
      defval: '',
    })
    return { name, rows: trimSheet(rows) }
  })
  if (!sheets.length) return { kind: 'unsupported', reason: '表格是空的' }
  return { kind: 'excel', sheets }
}

export async function parseLocalFile(file: File): Promise<OpenDoc> {
  if (file.size > MAX_BYTES) {
    throw new Error(`文件超过 32MB（当前 ${formatBytes(file.size)}）`)
  }
  const kind = detectKind(file)
  if (kind === 'unsupported') {
    throw new Error('暂不支持该格式，请选择 Word / PDF / Excel / TXT / MD / HTML / 图片')
  }

  let parsed: ParsedDoc
  if (kind === 'image') {
    parsed = { kind: 'image', url: URL.createObjectURL(file) }
  } else if (kind === 'txt') {
    parsed = { kind: 'txt', text: decodeText(await file.arrayBuffer()) }
  } else if (kind === 'md') {
    const text = decodeText(await file.arrayBuffer())
    parsed = { kind: 'md', html: renderMarkdown(text) }
    return {
      id: uid('doc'),
      name: file.name,
      kind,
      sizeLabel: formatBytes(file.size),
      parsed,
      rawText: text,
    }
  } else if (kind === 'html') {
    const text = decodeText(await file.arrayBuffer())
    return {
      id: uid('doc'),
      name: file.name,
      kind,
      sizeLabel: formatBytes(file.size),
      parsed: { kind: 'html', html: text || '<p>（空文档）</p>' },
      rawText: text,
    }
  } else if (kind === 'pdf') {
    parsed = await parsePdf(file)
  } else if (kind === 'word') {
    parsed = await parseWord(file)
  } else {
    parsed = await parseExcel(file)
  }

  return {
    id: uid('doc'),
    name: file.name,
    kind,
    sizeLabel: formatBytes(file.size),
    parsed,
  }
}

export function revokeDoc(doc: OpenDoc) {
  if (doc.parsed.kind === 'image') URL.revokeObjectURL(doc.parsed.url)
}
