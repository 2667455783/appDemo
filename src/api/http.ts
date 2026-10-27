import { getDeviceId } from '@/utils/deviceId'

export type ApiResult<T> = { code: number; message: string; data: T }

/**
 * 开发：走 Vite `/api` 代理到 localhost:8080
 * 真机/生产：设置 VITE_API_BASE（如 http://192.168.1.8:8080）
 */
function apiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return ''
}

export class ApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { skipDeviceHeader?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  // FormData / 二进制体不能强制成 JSON；FormData 还要让浏览器自带 boundary
  const binaryBody =
    init.body instanceof FormData ||
    init.body instanceof Blob ||
    init.body instanceof ArrayBuffer ||
    ArrayBuffer.isView(init.body)
  if (!headers.has('Content-Type') && init.body && !binaryBody) {
    headers.set('Content-Type', 'application/json')
  }
  if (!init.skipDeviceHeader) {
    headers.set('X-Device-Id', getDeviceId())
  }

  const url = `${apiBase()}${path}`
  let res: Response
  try {
    res = await fetch(url, { ...init, headers })
  } catch (err) {
    const tip = err instanceof Error ? err.message : String(err)
    throw new ApiError(
      0,
      `网络请求失败：${tip}（${url || path}）。若在 App 内，请确认已允许混合内容且可访问线上 API`,
    )
  }
  let body: ApiResult<T>
  try {
    body = (await res.json()) as ApiResult<T>
  } catch {
    throw new ApiError(res.status, `接口响应不是 JSON：${path}`)
  }
  if (body.code !== 0) {
    throw new ApiError(body.code, body.message || '请求失败')
  }
  return body.data
}
