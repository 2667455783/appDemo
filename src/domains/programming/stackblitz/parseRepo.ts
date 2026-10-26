export type GitProvider = 'github' | 'gitee' | 'gitlab'

export type ParsedRepo = {
  provider: GitProvider
  owner: string
  repo: string
  /** 分支 / tag / commit，未指定则拉默认分支 */
  ref?: string
  /** 子目录，导入时只取该目录 */
  subpath?: string
  /** 规范化后的展示用短路径 */
  display: string
}

function cleanPath(p: string): string {
  return p.replace(/^\/+|\/+$/g, '')
}

function splitOwnerRepo(parts: string[]): { owner: string; repo: string; rest: string[] } | null {
  if (parts.length < 2) return null
  const owner = parts[0]!
  const repo = parts[1]!.replace(/\.git$/i, '')
  return { owner, repo, rest: parts.slice(2) }
}

/** 解析 github / gitee / gitlab 公开仓地址 */
export function parseGitRepoInput(input: string): ParsedRepo | null {
  const raw = input.trim().replace(/\.git$/i, '')
  if (!raw) return null

  // 裸路径：默认当 GitHub 的 owner/repo[/...]
  if (!/^[a-z]+:\/\//i.test(raw) && !raw.includes('github.com') && !raw.includes('gitee.com') && !raw.includes('gitlab.com')) {
    const parts = cleanPath(raw).split('/').filter(Boolean)
    const sr = splitOwnerRepo(parts)
    if (!sr) return null
    let ref: string | undefined
    let subpath: string | undefined
    if (sr.rest[0] === 'tree' && sr.rest[1]) {
      ref = sr.rest[1]
      subpath = sr.rest.slice(2).join('/') || undefined
    } else if (sr.rest.length) {
      subpath = sr.rest.join('/')
    }
    return {
      provider: 'github',
      owner: sr.owner,
      repo: sr.repo,
      ref,
      subpath,
      display: [sr.owner, sr.repo, ref ? `tree/${ref}` : '', subpath ?? ''].filter(Boolean).join('/'),
    }
  }

  try {
    let urlStr = raw
    // git@github.com:owner/repo
    const ssh = raw.match(/^git@([^:]+):(.+)$/i)
    if (ssh) urlStr = `https://${ssh[1]}/${ssh[2]}`
    if (!/^[a-z]+:\/\//i.test(urlStr)) urlStr = `https://${urlStr}`

    const u = new URL(urlStr)
    const host = u.hostname.replace(/^www\./i, '').toLowerCase()
    let provider: GitProvider | null = null
    if (host === 'github.com') provider = 'github'
    else if (host === 'gitee.com') provider = 'gitee'
    else if (host === 'gitlab.com' || host.endsWith('.gitlab.com')) provider = 'gitlab'
    if (!provider) return null

    const parts = cleanPath(u.pathname).split('/').filter(Boolean)
    const sr = splitOwnerRepo(parts)
    if (!sr) return null

    let ref: string | undefined
    let subpath: string | undefined
    const rest = sr.rest

    if (provider === 'gitlab') {
      // gitlab: owner/repo/-/tree/main/path
      const dash = rest.indexOf('-')
      const r = dash >= 0 ? rest.slice(dash + 1) : rest
      if (r[0] === 'tree' && r[1]) {
        ref = r[1]
        subpath = r.slice(2).join('/') || undefined
      } else if (r[0] === 'blob' && r[1]) {
        ref = r[1]
        subpath = r.slice(2).join('/') || undefined
      }
    } else {
      // github / gitee: tree/branch/path 或 blob/branch/path
      if ((rest[0] === 'tree' || rest[0] === 'blob') && rest[1]) {
        ref = rest[1]
        subpath = rest.slice(2).join('/') || undefined
      }
    }

    return {
      provider,
      owner: sr.owner,
      repo: sr.repo,
      ref,
      subpath,
      display: `${provider}:${sr.owner}/${sr.repo}${ref ? `@${ref}` : ''}${subpath ? `/${subpath}` : ''}`,
    }
  } catch {
    return null
  }
}

export const GIT_EXAMPLES = [
  {
    label: 'GitHub Vue',
    url: 'https://github.com/vitejs/vite/tree/v5.4.11/packages/create-vite/template-vue',
  },
  {
    label: 'GitHub React',
    url: 'https://github.com/vitejs/vite/tree/v5.4.11/packages/create-vite/template-react',
  },
  {
    label: 'Gitee 示例',
    url: 'https://gitee.com/mirrors/vue-v3',
  },
] as const
