// gradle zip 已完整下载（184MB），直接解压并创建 .ok
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawnSync } = require('child_process')

const hashDir = path.join(os.homedir(), '.gradle', 'wrapper', 'dists', 'gradle-8.2.1-all', 'd8pvvlun5bx6sdtwqhf8y9z4b')
const zipPath = path.join(hashDir, 'gradle-8.2.1-all.zip')
const extractDir = path.join(hashDir, 'gradle-8.2.1-all')
const okPath = path.join(hashDir, 'gradle-8.2.1-all.zip.ok')

console.log('zip exists:', fs.existsSync(zipPath), 'size:', fs.existsSync(zipPath) ? (fs.statSync(zipPath).size/1048576).toFixed(1)+' MB' : 'n/a')
if (!fs.existsSync(zipPath)) { console.error('NO ZIP'); process.exit(1) }

// 清理 part/lck
for (const f of ['gradle-8.2.1-all.zip.part', 'gradle-8.2.1-all.zip.lck']) {
  const p = path.join(hashDir, f)
  if (fs.existsSync(p)) { try { fs.rmSync(p, { force: true }) } catch (e) {} }
}

if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true })
console.log('extracting...')
const ex = spawnSync('tar', ['-xf', zipPath, '-C', hashDir], { stdio: 'inherit' })
console.log('tar exit:', ex.status)
if (ex.status !== 0) { console.error('extract failed'); process.exit(1) }
console.log('bin/gradle.bat exists:', fs.existsSync(path.join(extractDir, 'bin', 'gradle.bat')))
console.log('listing extractDir:', fs.existsSync(extractDir) ? fs.readdirSync(extractDir).slice(0,10).join(', ') : 'MISSING')
if (!fs.existsSync(path.join(extractDir, 'bin', 'gradle.bat'))) {
  console.error('bin/gradle.bat missing — extract incomplete')
  process.exit(1)
}
fs.writeFileSync(okPath, '')
console.log('GRADLE_READY')
