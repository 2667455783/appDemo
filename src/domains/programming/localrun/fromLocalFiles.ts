/**
 * 把本机选择的 FileList 转成 LocalRun 可用的路径 → 文本（二进制为 data URL）映射。
 */
import { normalizePath } from '@/domains/programming/localrun/compile'

const TEXT_RE =
  /\.(html?|css|js|mjs|cjs|jsx|tsx|ts|vue|json|md|svg|txt|xml|map|less|scss|sass)$/i
const BIN_RE =
  /\.(png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|ogg)$/i

const MAX_TEXT_BYTES = 2 * 1024 * 1024
const MAX_BIN_BYTES = 5 * 1024 * 1024
const MAX_FILES = 200

export type LocalUploadResult = {
  files: Record<string, string>
  title: string
  openFile: string
}

function stripRoot(paths: string[]): string[] {
  if (paths.length <= 1) return paths.map((p) => normalizePath(p))
  const parts = paths.map((p) => p.split('/').filter(Boolean))
  let depth = 0
  while (true) {
    const head = parts[0]?.[depth]
    if (!head) break
    if (!parts.every((p) => p[depth] === head)) break
    // 只有当所有路径都还有更深一层时，才剥掉共同前缀目录
    if (!parts.every((p) => p.length > depth + 1)) break
    depth += 1
  }
  return parts.map((p) => normalizePath(p.slice(depth).join('/')))
}

function pickPath(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
  if (rel && rel.trim()) return rel.replace(/\\/g, '/')
  return file.name.replace(/\\/g, '/')
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result ?? ''))
    r.onerror = () => reject(r.error || new Error(`读取失败：${file.name}`))
    r.readAsText(file)
  })
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result ?? ''))
    r.onerror = () => reject(r.error || new Error(`读取失败：${file.name}`))
    r.readAsDataURL(file)
  })
}

/** 把 HTML/CSS 里指向本地二进制资源的相对路径换成 data URL，便于 srcdoc 预览 */
function embedLocalAssets(files: Record<string, string>): Record<string, string> {
  const dataFiles = Object.keys(files).filter((p) => files[p]!.startsWith('data:'))
  if (!dataFiles.length) return files

  const resolveRef = (fromDir: string, ref: string): string | null => {
    const clean = ref.split(/[?#]/)[0]!.trim()
    if (!clean || /^(https?:|data:|blob:|\/\/)/i.test(clean)) return null
    const abs = clean.startsWith('/')
      ? normalizePath(clean)
      : normalizePath(fromDir ? `${fromDir}/${clean}` : clean)
    if (files[abs]?.startsWith('data:')) return files[abs]!
    const bare = normalizePath(clean)
    if (files[bare]?.startsWith('data:')) return files[bare]!
    return null
  }

  const out = { ...files }
  for (const [path, content] of Object.entries(files)) {
    if (content.startsWith('data:')) continue
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
    if (/\.html?$/i.test(path)) {
      out[path] = content.replace(
        /\b(src|href)\s*=\s*(["'])([^"']+)\2/gi,
        (whole, attr: string, q: string, ref: string) => {
          const data = resolveRef(dir, ref)
          return data ? `${attr}=${q}${data}${q}` : whole
        },
      )
    } else if (/\.css$/i.test(path)) {
      out[path] = content.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (whole, _q: string, ref: string) => {
        const data = resolveRef(dir, ref.trim())
        return data ? `url(${JSON.stringify(data)})` : whole
      })
    }
  }
  return out
}

function ensureIndexHtml(files: Record<string, string>): { files: Record<string, string>; openFile: string } {
  const next = { ...files }
  if (next['index.html'] != null) return { files: next, openFile: 'index.html' }
  if (next['public/index.html'] != null) return { files: next, openFile: 'public/index.html' }

  const htmls = Object.keys(next)
    .filter((p) => /\.html?$/i.test(p))
    .sort()
  if (htmls.length === 1) {
    const only = htmls[0]!
    if (only !== 'index.html') {
      next['index.html'] = next[only]!
    }
    return { files: next, openFile: 'index.html' }
  }
  if (htmls.length > 1) {
    // 多 HTML：优先根目录最短路径，并复制一份为 index.html 以便预览入口
    const pick = htmls.sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))[0]!
    next['index.html'] = next[pick]!
    return { files: next, openFile: pick }
  }

  // 无 HTML：若有 vue/react 入口，交给 bundler；否则包一层空壳
  const hasEntry = [
    'src/main.ts',
    'src/main.js',
    'src/main.tsx',
    'src/main.jsx',
    'src/index.tsx',
    'src/index.jsx',
    'src/App.vue',
    'src/App.jsx',
  ].some((p) => next[p] != null)
  if (!hasEntry) {
    throw new Error('未找到可预览的 HTML（或 Vue/React 入口）。请上传 .html 文件，或包含 index.html 的文件夹。')
  }
  return { files: next, openFile: Object.keys(next).sort()[0]! }
}

export async function filesFromFileList(list: FileList | File[]): Promise<LocalUploadResult> {
  const arr = Array.from(list as ArrayLike<File>).filter((f) => f && f.size >= 0)
  if (!arr.length) throw new Error('未选择任何文件')
  if (arr.length > MAX_FILES) throw new Error(`一次最多上传 ${MAX_FILES} 个文件`)

  const rawPaths = arr.map(pickPath)
  const paths = stripRoot(rawPaths)
  const files: Record<string, string> = {}
  const skipped: string[] = []

  for (let i = 0; i < arr.length; i++) {
    const file = arr[i]!
    const path = paths[i]!
    if (!path || path.endsWith('/')) continue
    if (/^\./.test(path.split('/').pop() || '') || /(^|\/)node_modules\//.test(path)) {
      skipped.push(path)
      continue
    }

    const isText = TEXT_RE.test(path) || file.type.startsWith('text/') || file.type === 'application/json'
    const isBin = BIN_RE.test(path) || file.type.startsWith('image/')

    if (isText) {
      if (file.size > MAX_TEXT_BYTES) throw new Error(`文本文件过大：${path}（上限 2MB）`)
      files[path] = await readAsText(file)
      continue
    }
    if (isBin) {
      if (file.size > MAX_BIN_BYTES) throw new Error(`资源文件过大：${path}（上限 5MB）`)
      files[path] = await readAsDataUrl(file)
      continue
    }
    // 未知类型：小于 512KB 尝试当文本
    if (file.size <= 512 * 1024) {
      try {
        files[path] = await readAsText(file)
      } catch {
        skipped.push(path)
      }
    } else {
      skipped.push(path)
    }
  }

  if (!Object.keys(files).length) {
    throw new Error('没有可读的文本/网页文件（已跳过不支持的类型）')
  }

  const embedded = embedLocalAssets(files)
  const { files: normalized, openFile } = ensureIndexHtml(embedded)

  const firstName = paths[0]?.split('/').pop() || '本地文件'
  const title =
    arr.length === 1
      ? `本地上传 · ${firstName}`
      : `本地上传 · ${Object.keys(normalized).filter((p) => !p.startsWith('__')).length} 个文件`

  if (skipped.length) {
    console.info('[local-upload] 已跳过', skipped.slice(0, 20))
  }

  return { files: normalized, title, openFile }
}
