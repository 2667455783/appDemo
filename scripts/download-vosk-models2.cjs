// 稳健下载 Vosk 中英文小模型：
// 1) 先杀掉可能仍在运行的旧下载脚本（download-vosk-models.cjs）进程
// 2) 用 node https + Range 断点续传 + 重试下载到 .vosk-models/
const fs = require('fs')
const path = require('path')
const https = require('https')
const { execSync } = require('child_process')

const dir = path.join(__dirname, '..', '.vosk-models')
fs.mkdirSync(dir, { recursive: true })

// 1) 杀旧进程
try {
  const out = execSync('tasklist /v /fo csv /nh', { encoding: 'utf8' })
  const myPid = String(process.pid)
  const lines = out.split(/\r?\n/).filter((l) => l.toLowerCase().includes('node.exe'))
  for (const line of lines) {
    const cols = []
    let cur = ''
    let q = false
    for (const ch of line) {
      if (ch === '"') { q = !q; continue }
      if (ch === ',' && !q) { cols.push(cur); cur = ''; continue }
      cur += ch
    }
    cols.push(cur)
    const pid = cols[1]
    const cmd = (cols[8] || '').toLowerCase()
    if (pid && pid !== myPid && cmd.includes('download-vosk-models')) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); console.log(`killed old pid ${pid}`) } catch (e) { /* ignore */ }
    }
  }
} catch (e) { /* ignore */ }

const models = [
  { name: 'cn.zip', url: 'https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip' },
  { name: 'en.zip', url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip' },
]

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return resolve(httpGet(res.headers.location, headers))
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      resolve(res)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(new Error('timeout')) })
  })
}

function download(url, file) {
  return new Promise(async (resolve, reject) => {
    const MAX = 12
    for (let attempt = 1; attempt <= MAX; attempt++) {
      try {
        const have = fs.existsSync(file) ? fs.statSync(file).size : 0
        const headers = {}
        if (have > 0) headers['Range'] = `bytes=${have}-`
        const res = await httpGet(url, headers)
        const total = Number(res.headers['content-length'] || 0) + have
        const supportsRange = res.statusCode === 206
        const out = fs.createWriteStream(file, { flags: supportsRange && have > 0 ? 'a' : 'w' })
        let got = have
        let lastLog = 0
        await new Promise((res2, rej2) => {
          res.on('data', (d) => {
            out.write(d)
            got += d.length
            const now = Date.now()
            if (now - lastLog > 1000) {
              lastLog = now
              const t = total ? `${(got / 1048576).toFixed(1)}/${(total / 1048576).toFixed(1)}` : `${(got / 1048576).toFixed(1)}`
              process.stdout.write(`\r  ${path.basename(file)}: ${t} MB (try ${attempt})   `)
            }
          })
          res.on('end', () => res2())
          res.on('error', rej2)
          out.on('error', rej2)
        })
        out.end()
        await new Promise((r) => out.on('finish', r))
        const size = fs.statSync(file).size
        if (total && size < total - 1) throw new Error(`incomplete ${size}/${total}`)
        console.log(`\r  ${path.basename(file)}: done ${(size / 1048576).toFixed(1)} MB (try ${attempt})              `)
        return resolve(size)
      } catch (e) {
        console.log(`\n  ${path.basename(file)} attempt ${attempt} failed: ${e.message}`)
        if (attempt === MAX) return reject(e)
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
  })
}

;(async () => {
  for (const m of models) {
    const out = path.join(dir, m.name)
    console.log(`Downloading ${m.name}`)
    try {
      await download(m.url, out)
    } catch (e) {
      console.error(`  ${m.name} FAILED: ${e.message}`)
      process.exitCode = 1
    }
  }
  console.log('ALL_DONE')
})()
