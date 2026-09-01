// 仅下载 en.zip（cn.zip 已完成）
const fs = require('fs')
const path = require('path')
const https = require('https')

const dir = path.join(__dirname, '..', '.vosk-models')
fs.mkdirSync(dir, { recursive: true })
const url = 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip'
const file = path.join(dir, 'en.zip')

function httpGet(u, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(u, { headers, timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return resolve(httpGet(res.headers.location, headers))
      }
      if (res.statusCode !== 200 && res.statusCode !== 206) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      resolve(res)
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('timeout')))
  })
}

;(async () => {
  const MAX = 20
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      const have = fs.existsSync(file) ? fs.statSync(file).size : 0
      const headers = {}
      if (have > 0) headers['Range'] = `bytes=${have}-`
      const res = await httpGet(url, headers)
      const is206 = res.statusCode === 206
      const total = Number(res.headers['content-length'] || 0) + have
      const out = fs.createWriteStream(file, { flags: is206 && have > 0 ? 'a' : 'w' })
      let got = is206 && have > 0 ? have : 0
      let lastLog = 0
      await new Promise((res2, rej2) => {
        res.on('data', (d) => {
          out.write(d)
          got += d.length
          const now = Date.now()
          if (now - lastLog > 1000) {
            lastLog = now
            const t = total ? `${(got / 1048576).toFixed(1)}/${(total / 1048576).toFixed(1)}` : `${(got / 1048576).toFixed(1)}`
            process.stdout.write(`\r  en.zip: ${t} MB (try ${attempt})   `)
          }
        })
        res.on('end', res2)
        res.on('error', rej2)
        out.on('error', rej2)
      })
      out.end()
      await new Promise((r) => out.on('finish', r))
      const size = fs.statSync(file).size
      if (total && size < total - 1) throw new Error(`incomplete ${size}/${total}`)
      console.log(`\r  en.zip: done ${(size / 1048576).toFixed(1)} MB (try ${attempt})              `)
      console.log('EN_DONE')
      return
    } catch (e) {
      console.log(`\n  en.zip attempt ${attempt} failed: ${e.message}`)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  console.log('EN_FAILED')
  process.exitCode = 1
})()
