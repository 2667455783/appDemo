/**
 * 上传文件到腾讯云 COS（发版 APK 用）
 * 凭证优先环境变量，其次 scripts/release.cos.json（已 gitignore）
 */
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scriptsDir = join(__dirname, '..')

function loadCosSecrets() {
  const fromEnv = {
    SecretId: process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID || '',
    SecretKey: process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY || '',
  }
  const secretFile = join(scriptsDir, 'release.cos.json')
  if (existsSync(secretFile)) {
    try {
      const j = JSON.parse(readFileSync(secretFile, 'utf-8'))
      if (j.SecretId) fromEnv.SecretId = j.SecretId
      if (j.SecretKey) fromEnv.SecretKey = j.SecretKey
    } catch {
      /* ignore */
    }
  }
  return fromEnv
}

/**
 * @param {{
 *   bucket: string
 *   region: string
 *   localPath: string
 *   key: string
 *   onProgress?: (p: { percent: number }) => void
 * }} opts
 */
export async function uploadFileToCos(opts) {
  const { SecretId, SecretKey } = loadCosSecrets()
  if (!SecretId || !SecretKey) {
    throw new Error(
      '缺少 COS 凭证：请设置环境变量 COS_SECRET_ID / COS_SECRET_KEY，或创建 scripts/release.cos.json（见 release.cos.example.json）',
    )
  }
  if (!opts.bucket || !opts.region) {
    throw new Error('release.config.json 的 cos.bucket / cos.region 未配置')
  }

  let COS
  try {
    const require = createRequire(import.meta.url)
    COS = require('cos-nodejs-sdk-v5')
  } catch {
    throw new Error('未安装 cos-nodejs-sdk-v5，请执行：npm i -D cos-nodejs-sdk-v5')
  }

  const cos = new COS({ SecretId, SecretKey })
  const key = String(opts.key).replace(/^\/+/, '')

  await new Promise((resolve, reject) => {
    cos.uploadFile(
      {
        Bucket: opts.bucket,
        Region: opts.region,
        Key: key,
        FilePath: opts.localPath,
        SliceSize: 1024 * 1024 * 5,
        onProgress: (p) => {
          if (typeof opts.onProgress === 'function' && p && typeof p.percent === 'number') {
            opts.onProgress({ percent: p.percent })
          }
        },
      },
      (err, data) => {
        if (err) reject(err)
        else resolve(data)
      },
    )
  })

  return { bucket: opts.bucket, region: opts.region, key }
}

/** 拼接对象公网/CDN URL */
export function cosObjectUrl({ cdnBase, bucket, region, key }) {
  const k = String(key).replace(/^\/+/, '')
  const base = String(cdnBase || '').replace(/\/$/, '')
  if (base) return `${base}/${k}`
  return `https://${bucket}.cos.${region}.myqcloud.com/${k}`
}
