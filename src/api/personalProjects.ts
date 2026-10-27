import { apiRequest } from '@/api/http'

export type UserProjectSummary = {
  id: number
  title: string
  sourceType: string
  openFile?: string
  fileCount: number
  updatedAt?: string
}

export type UserProjectDetail = UserProjectSummary & {
  files: Record<string, string>
}

export type UserProjectUpsertPayload = {
  id?: number
  title?: string
  sourceType?: string
  openFile?: string
  files: Record<string, string>
}

export function listUserProjects() {
  return apiRequest<UserProjectSummary[]>('/api/v1/me/projects')
}

export function getUserProject(id: number) {
  return apiRequest<UserProjectDetail>(`/api/v1/me/projects/${id}`)
}

export function saveUserProject(body: UserProjectUpsertPayload) {
  return apiRequest<UserProjectDetail>('/api/v1/me/projects', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function uploadUserProjectZip(file: File, title?: string) {
  if (!file) throw new Error('未选择文件')
  if (!file.size) throw new Error('所选文件为空，请重新选择有效的 .zip')
  const name = file.name || 'project.zip'
  if (!/\.zip$/i.test(name) && file.type && !/zip/i.test(file.type)) {
    throw new Error('请选择 .zip 压缩包')
  }
  // 用原始二进制上传，避免部分浏览器/代理下 multipart 丢文件体
  const buf = await file.arrayBuffer()
  if (!buf.byteLength) throw new Error('读取 zip 失败：文件内容为空')
  const q = new URLSearchParams()
  const t = (title?.trim() || name.replace(/\.zip$/i, '')).trim()
  if (t) q.set('title', t)
  const qs = q.toString()
  return apiRequest<UserProjectDetail>(`/api/v1/me/projects/zip${qs ? `?${qs}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/zip' },
    body: buf,
  })
}

export function deleteUserProject(id: number) {
  return apiRequest<null>(`/api/v1/me/projects/${id}`, { method: 'DELETE' })
}
