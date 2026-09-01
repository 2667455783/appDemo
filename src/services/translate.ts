// 简易翻译服务：MyMemory 免费 API（无需 key，支持 CORS）
// 官方限制：单次查询最多 500 字符，超长文本自动按段拆分后合并

const ENDPOINT = 'https://api.mymemory.translated.net/get'
/** 留余量，避免边界触发 500 限制 */
const MAX_QUERY_CHARS = 480

export type Lang = 'en' | 'zh'

export type TranslateResult = {
  text: string
  matches: string[]
  detected: Lang
}

function detectLang(text: string): Lang {
  return /[\u4e00-\u9fff]/.test(text) ? 'zh' : 'en'
}

function pair(from: Lang): string {
  return from === 'zh' ? 'zh-CN|en' : 'en|zh-CN'
}

/** 按段落 / 句子切分，尽量不拆开半句；仍超长则硬切 */
export function splitForTranslate(text: string, max = MAX_QUERY_CHARS): string[] {
  const raw = text.trim()
  if (!raw) return []
  if (raw.length <= max) return [raw]

  const parts: string[] = []

  const pushPiece = (piece: string) => {
    const t = piece.trim()
    if (!t) return
    if (t.length <= max) {
      parts.push(t)
      return
    }
    for (let i = 0; i < t.length; i += max) {
      parts.push(t.slice(i, i + max))
    }
  }

  const paragraphs = raw.split(/\n+/)
  let buf = ''
  for (const para of paragraphs) {
    const block = para.trim()
    if (!block) {
      if (buf) {
        pushPiece(buf)
        buf = ''
      }
      continue
    }
    if (!buf) {
      buf = block
      continue
    }
    if (buf.length + 1 + block.length <= max) {
      buf = `${buf}\n${block}`
    } else {
      pushPiece(buf)
      buf = block
    }
  }
  if (buf) pushPiece(buf)

  // 对仍可能超长的段（整段无换行）再按句拆
  const refined: string[] = []
  for (const p of parts) {
    if (p.length <= max) {
      refined.push(p)
      continue
    }
    const sentences = p.split(/(?<=[.!?。！？；;])\s*/)
    let sbuf = ''
    for (const s of sentences) {
      if (!s) continue
      if (!sbuf) {
        sbuf = s
      } else if (sbuf.length + 1 + s.length <= max) {
        sbuf = `${sbuf} ${s}`
      } else {
        refined.push(sbuf)
        sbuf = s
      }
    }
    if (sbuf) {
      if (sbuf.length <= max) refined.push(sbuf)
      else {
        for (let i = 0; i < sbuf.length; i += max) refined.push(sbuf.slice(i, i + max))
      }
    }
  }
  return refined.length ? refined : [raw.slice(0, max)]
}

function isApiLimitError(text: string): boolean {
  return /QUERY LENGTH LIMIT|MAX ALLOWED QUERY/i.test(text)
}

async function requestOnce(q: string, from: Lang): Promise<TranslateResult> {
  const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&langpair=${pair(from)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`翻译服务异常 (${res.status})`)
  const data = await res.json()
  const main: string = data?.responseData?.translatedText ?? ''
  if (isApiLimitError(main) || Number(data?.responseStatus) === 403) {
    throw new Error('单段过长，已自动拆分仍失败，请缩短后再试')
  }
  const matches: string[] = Array.isArray(data?.matches)
    ? data.matches
        .map((m: { translation?: string }) => m?.translation)
        .filter((t: unknown): t is string => typeof t === 'string' && t.length > 0 && t !== main)
        .slice(0, 3)
    : []
  return { text: main, matches, detected: from }
}

function joinTranslated(parts: string[], to: Lang): string {
  const joiner = to === 'zh' ? '' : ' '
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(joiner)
    .replace(/\s+\n/g, '\n')
    .trim()
}

export async function translateText(
  text: string,
  from: Lang,
  to: Lang,
): Promise<TranslateResult> {
  const q = text.trim()
  if (!q) return { text: '', matches: [], detected: from }

  const chunks = splitForTranslate(q)
  if (chunks.length === 1) {
    return requestOnce(chunks[0]!, from)
  }

  const results: TranslateResult[] = []
  for (const chunk of chunks) {
    results.push(await requestOnce(chunk, from))
  }
  return {
    text: joinTranslated(
      results.map((r) => r.text),
      to,
    ),
    matches: results[0]?.matches ?? [],
    detected: from,
  }
}

/** 自动检测源语言并翻译到另一种 */
export async function translateAuto(text: string): Promise<TranslateResult & { from: Lang; to: Lang }> {
  const from = detectLang(text)
  const to: Lang = from === 'zh' ? 'en' : 'zh'
  const r = await translateText(text, from, to)
  return { ...r, from, to }
}

export const TRANSLATE_MAX_CHARS = MAX_QUERY_CHARS
