import type { AppIconName } from '@/components/AppIcon.vue'

export type FileTreeIcon = {
  name: AppIconName
  /** 单色图标着色；品牌/多色文件图标留空，保留 SVG 自带配色 */
  color?: string
}

/** 按路径/文件名选文件树图标（文件夹 + 常见源码类型） */
export function fileTreeIconFor(name: string, isDir: boolean, dirOpen = false): FileTreeIcon {
  if (isDir) {
    return {
      name: dirOpen ? 'folder-open' : 'folder',
      color: '#d4a017',
    }
  }
  const n = name.toLowerCase()
  const ext = n.includes('.') ? n.slice(n.lastIndexOf('.') + 1) : ''

  // 可辨识后缀：用 vscode-icons 品牌图，不套单色
  if (ext === 'vue') return { name: 'file-vue' }
  if (ext === 'ts' || ext === 'tsx') return { name: 'file-ts' }
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') {
    return { name: 'file-js' }
  }
  if (ext === 'css') return { name: 'file-css' }
  if (ext === 'scss' || ext === 'sass') return { name: 'file-scss' }
  if (ext === 'less') return { name: 'file-css' }
  if (ext === 'json') return { name: 'file-json' }

  if (ext === 'html' || ext === 'htm') return { name: 'html5', color: '#e44d26' }
  if (ext === 'md' || ext === 'mdx') return { name: 'file-markdown', color: '#42a5f5' }
  if (/^(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/.test(ext)) {
    return { name: 'file-image', color: '#ab47bc' }
  }
  if (/^(zip|rar|7z|gz|tgz)$/.test(ext)) return { name: 'file-zip', color: '#8d6e63' }
  if (ext === 'py') return { name: 'code', color: '#3776ab' }
  if (ext === 'java') return { name: 'code', color: '#e76f00' }
  if (ext === 'xml' || ext === 'yml' || ext === 'yaml' || ext === 'toml') {
    return { name: 'file-text', color: '#78909c' }
  }
  if (ext === 'txt' || ext === 'log') return { name: 'file-text', color: '#90a4ae' }
  if (!ext) return { name: 'file-unknown', color: '#90a4ae' }
  return { name: 'file', color: '#90a4ae' }
}
