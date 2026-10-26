import { apiRequest } from '@/api/http'

export type GitRepoSummary = {
  id: number
  provider: string
  owner: string
  repo: string
  subpath: string
  sourceUrl: string
  title: string
  defaultBranch: string
  currentBranch: string
  assetBase?: string | null
  detectedRoot?: string | null
  openFile?: string | null
  cachedBranches: string[]
}

export type GitRepoDetail = GitRepoSummary & {
  files: Record<string, string>
}

export type GitBranchSnapshot = {
  repoId: number
  branchName: string
  openFile?: string | null
  files: Record<string, string>
}

export type GitRepoUpsertPayload = {
  provider: string
  owner: string
  repo: string
  subpath?: string
  sourceUrl?: string
  title?: string
  defaultBranch?: string
  currentBranch: string
  assetBase?: string
  detectedRoot?: string
  openFile?: string
  files: Record<string, string>
}

export function listGitRepos() {
  return apiRequest<GitRepoSummary[]>('/api/v1/me/git/repos')
}

export function loadGitRepo(id: number) {
  return apiRequest<GitRepoDetail>(`/api/v1/me/git/repos/${id}`)
}

export function saveGitRepo(body: GitRepoUpsertPayload) {
  return apiRequest<GitRepoDetail>('/api/v1/me/git/repos', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteGitRepo(id: number) {
  return apiRequest<null>(`/api/v1/me/git/repos/${id}`, { method: 'DELETE' })
}

export function getGitBranch(repoId: number, branch: string) {
  return apiRequest<GitBranchSnapshot>(
    `/api/v1/me/git/repos/${repoId}/branches/${encodeURIComponent(branch)}`,
  )
}

export function putGitBranch(
  repoId: number,
  branch: string,
  body: { files: Record<string, string>; openFile?: string; makeCurrent?: boolean },
) {
  return apiRequest<GitBranchSnapshot>(
    `/api/v1/me/git/repos/${repoId}/branches/${encodeURIComponent(branch)}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  )
}
