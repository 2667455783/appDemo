// 杀掉所有运行下载脚本的 node 进程（除自己），并清理 en.zip
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const myPid = String(process.pid)
try {
  const out = execSync('tasklist /v /fo csv /nh', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
  const lines = out.split(/\r?\n/)
  for (const line of lines) {
    if (!line.toLowerCase().includes('node.exe')) continue
    // CSV parse
    const cols = []
    let cur = '', q = false
    for (const ch of line) {
      if (ch === '"') { q = !q; continue }
      if (ch === ',' && !q) { cols.push(cur); cur = ''; continue }
      cur += ch
    }
    cols.push(cur)
    const pid = cols[1]
    const cmd = (cols[8] || '')
    if (pid && pid !== myPid && cmd.toLowerCase().includes('download-vosk-models')) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); console.log(`killed ${pid}: ${cmd.slice(0, 80)}`) }
      catch (e) { console.log(`kill ${pid} failed: ${e.message}`) }
    }
  }
} catch (e) { console.log('tasklist error: ' + e.message) }

const en = path.join(__dirname, '..', '.vosk-models', 'en.zip')
try { if (fs.existsSync(en)) { fs.unlinkSync(en); console.log('deleted en.zip') } } catch (e) { console.log('del en.zip: ' + e.message) }
console.log('CLEAN_DONE')
