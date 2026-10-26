export type ProgLangId =
  | 'javascript'
  | 'python'
  | 'vue'
  | 'react'
  | 'java'
  | 'c'
  | 'cpp'

export type RunKind = 'text' | 'preview' | 'remote'

export type RunResult = {
  ok: boolean
  kind: RunKind
  /** 控制台 / stdout / 错误信息 */
  output: string
  /** 远程语言未就绪时的说明 */
  notice?: string
  /** 预览挂载到页面容器后，调用以卸载 */
  unmount?: () => void
}

export type ProgLangMeta = {
  id: ProgLangId
  label: string
  /** 运行能力：local 前端 / preview 页面内挂载 / remote 云端待接 */
  mode: 'local' | 'preview' | 'remote'
  hint: string
}
