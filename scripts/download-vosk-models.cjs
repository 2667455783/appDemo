// 下载 Vosk 中英文小模型到 .vosk-models/
const fs = require('fs')
const path = require('path')
const { pipeline } = require('stream/promises')

const dir = path.join(__dirname, '.vosk-models')
fs.mkdirSync(dir, { recursive: true })

const models = [
  { name: 'cn.zip', url: 'https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip' },
  { name: 'en.zip', url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip' },
]

;(async () => {
  for (const m of models) {
    const out = path.join(dir, m.name)
    console.log(`Downloading ${m.name} from ${m.url}`)
    try {
      const res = await fetch(m.url, { redirect: 'follow' })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const total = Number(res.headers.get('content-length') || 0)
      const file = fs.createWriteStream(out)
      let got = 0
      const reader = res.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          await new Promise((r) => file.write(Buffer.from(value), r))
          got += value.length
          if (total) process.stdout.write(`\r  ${m.name}: ${(got / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB`)
        }
      }
      file.end()
      await new Promise((r) => file.on('finish', r))
      console.log(`\n  ${m.name} done: ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`)
    } catch (e) {
      console.error(`  ${m.name} FAILED: ${e.message}`)
      process.exitCode = 1
    }
  }
})()
