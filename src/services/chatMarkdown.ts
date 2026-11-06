export type MdPart =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'code'; v: string }
  | { t: 'pre'; v: string }

/** 保守解析：只拆 **加粗**、`行内代码`、```代码块```，不当 HTML 用。未闭合标记当普通文本。 */
export function parseChatMarkdown(src: string): MdPart[] {
  if (!src) return []
  const parts: MdPart[] = []
  const fence = /```([^\n]*)\n([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = fence.exec(src))) {
    pushInline(parts, src.slice(last, m.index))
    parts.push({ t: 'pre', v: m[2] ?? '' })
    last = m.index + m[0].length
  }
  pushInline(parts, src.slice(last))
  return parts
}

function pushInline(parts: MdPart[], src: string) {
  if (!src) return
  const re = /(`+)([^`]+?)\1|\*\*([^*]+)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (m.index > last) parts.push({ t: 'text', v: src.slice(last, m.index) })
    if (m[2] != null) parts.push({ t: 'code', v: m[2] })
    else parts.push({ t: 'bold', v: m[3] ?? '' })
    last = m.index + m[0].length
  }
  if (last < src.length) parts.push({ t: 'text', v: src.slice(last) })
}
