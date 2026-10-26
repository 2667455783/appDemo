import { getLangMeta } from '@/domains/programming/langs'
import type { ProgLangId, RunResult } from '@/domains/programming/types'

export async function runCode(
  lang: ProgLangId,
  code: string,
  host?: HTMLElement | null,
): Promise<RunResult> {
  const meta = getLangMeta(lang)
  if (meta.mode === 'remote') {
    return {
      ok: false,
      kind: 'remote',
      output: '',
      notice: `${meta.label} 需要云端编译沙箱（Judge0 / 自建 Docker），本地无法直接执行。当前可编辑示例，正式「运行」即将接入。`,
    }
  }

  switch (lang) {
    case 'javascript': {
      const { runJavaScript } = await import('@/domains/programming/runners/javascript')
      return runJavaScript(code)
    }
    case 'python': {
      const { runPython } = await import('@/domains/programming/runners/python')
      return runPython(code)
    }
    case 'vue': {
      if (!host) return { ok: false, kind: 'preview', output: '预览容器未就绪' }
      const { mountVuePreview } = await import('@/domains/programming/runners/preview')
      return mountVuePreview(host, code)
    }
    case 'react': {
      if (!host) return { ok: false, kind: 'preview', output: '预览容器未就绪' }
      const { mountReactPreview } = await import('@/domains/programming/runners/preview')
      return mountReactPreview(host, code)
    }
    default:
      return { ok: false, kind: 'text', output: `暂不支持：${lang}` }
  }
}
