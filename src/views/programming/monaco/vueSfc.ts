export type VueScriptBlock = {
  /** script 内容在整文件中的起始 offset（不含开标签） */
  start: number
  end: number
  lang: 'javascript' | 'typescript'
  content: string
}

/** 取第一个 <script> / <script setup> 块；光标在块内才返回 */
export function scriptBlockAt(src: string, offset: number): VueScriptBlock | null {
  const re = /<script(\b[^>]*)>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const attrs = m[1] || ''
    const content = m[2] || ''
    const openTag = m[0].slice(0, m[0].length - content.length - '</script>'.length)
    const start = m.index + openTag.length
    const end = start + content.length
    if (offset < start || offset > end) continue
    const isTs = /lang\s*=\s*["']tsx?["']/i.test(attrs)
    return {
      start,
      end,
      lang: isTs ? 'typescript' : 'javascript',
      content,
    }
  }
  return null
}

export function isInVueScript(src: string, offset: number): boolean {
  return !!scriptBlockAt(src, offset)
}
