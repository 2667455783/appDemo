// 下载并就地解压 gradle-8.2.1-all.zip 到 wrapper 缓存，创建 .ok 标记，避免 wrapper 重新下载
const fs = require('fs')
const path = require('path')
const os = require('os')
const https = require('https')
const { spawnSync } = require('child_process')

const hashDir = path.join(os.homedir(), '.gradle', 'wrapper', 'dists', 'gradle-8.2.1-all', 'd8pvvlun5bx6sdtwqhf8y9z4b')
fs.mkdirSync(hashDir, { recursive: true })

// 清理旧的 part/lck
for (const f of ['gradle-8.2.1-all.zip.part', 'gradle-8.2.1-all.zip.lck']) {
  const p = path.join(hashDir, f)
  if (fs.existsSync(p)) { try { fs.rmSync(p, { force: true }) } catch (e) {} }
}

const zipPath = path.join(hashDir, 'gradle-8.2.1-all.zip')
const extractDir = path.join(hashDir, 'gradle-8.2.1-all')
const okPath = path.join(hashDir, 'gradle-8.2.1-all.zip.ok')

// 若已解压且 ok 存在，跳过
if (fs.existsSync(okPath) && fs.existsSync(path.join(extractDir, 'bin', 'gradle.bat'))) {
  console.log('gradle already cached and extracted')
  console.log('GRADLE_READY')
  process.exit(0)
}

const urls = [
  'https://services.gradle.org/distributions/gradle-8.2.1-all.zip',
  'https://downloads.gradle.org/distributions/gradle-8.2.1-all.zip',
]

function httpGet(u, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(u, { headers, timeout: 120000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return resolve(httpGet(res.headers.location, headers))
      }
      if (res.statusCode !== 200 && res.statusCode !== 206) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)) }
      resolve(res)
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('timeout')))
  })
}

async function downloadOne(url) {
  const have = fs.existsSync(zipPath) ? fs.statSync(zipPath).size : 0
  const headers = {}
  if (have > 0) headers['Range'] = `bytes=${have}-`
  const res = await httpGet(url, headers)
  const is206 = res.statusCode === 206
  const total = Number(res.headers['content-length'] || 0) + have
  const out = fs.createWriteStream(zipPath, { flags: is206 && have > 0 ? 'a' : 'w' })
  let got = is206 && have > 0 ? have : 0
  let lastLog = 0
  await new Promise((res2, rej2) => {
    res.on('data', (d) => {
      out.write(d); got += d.length
      const now = Date.now()
      if (now - lastLog > 2000) {
        lastLog = now
        const t = total ? `${(got/1048576).toFixed(1)}/${(total/1048576).toFixed(1)}` : `${(got/1048576).toFixed(1)}`
        process.stdout.write(`\r  gradle zip: ${t} MB   `)
      }
    })
    res.on('end', res2); res.on('error', rej2); out.on('error', rej2)
  })
  out.end()
  await new Promise((r) => out.on('finish', r))
  const size = fs.statSync(zipPath).size
  if (total && size < total - 1) throw new Error(`incomplete ${size}/${total}`)
  console.log(`\r  gradle zip done: ${(size/1048576).toFixed(1)} MB              `)
}

;(async () => {
  const MAX = 15
  let done = false
  for (let attempt = 1; attempt <= MAX && !done; attempt++) {
    for (const url of urls) {
      try {
        console.log(`attempt ${attempt}: ${url}`)
        await downloadOne(url)
        done = true
        break
      } catch (e) {
        console.log(`\n  failed: ${e.message}`)
      }
    }
    if (!done) await new Promise((r) => setTimeout(r, 2000))
  }
  if (!done) { console.error('GRADLE_DOWNLOAD_FAILED'); process.exit(1) }

  // 校验：直接尝试解压，解压后验证 bin/gradle.bat 存在
  console.log('extracting...')
  if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true })
  const ex = spawnSync('tar', ['-xf', zipPath, '-C', hashDir], { stdio: 'inherit' })
  if (ex.status !== 0) { console.error('extract failed'); process.exit(1) }
  if (!fs.existsSync(path.join(extractDir, 'bin', 'gradle.bat'))) {
    console.error('extract incomplete: bin/gradle.bat missing'); process.exit(1)
  }
  // 创建 .ok 标记
  fs.writeFileSync(okPath, '')
  console.log('GRADLE_READY')
})()
