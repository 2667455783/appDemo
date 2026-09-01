const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawnSync } = require('child_process')
const hashDir = path.join(os.homedir(), '.gradle', 'wrapper', 'dists', 'gradle-8.2.1-all', 'd8pvvlun5bx6sdtwqhf8y9z4b')
console.log('hashDir entries:')
for (const e of fs.readdirSync(hashDir, { withFileTypes: true })) {
  console.log(`  ${e.isDirectory() ? '[D]' : '[F]'} ${e.name}`)
}
// 用 tar -tf 列出 zip 顶层
const t = spawnSync('tar', ['-tf', path.join(hashDir, 'gradle-8.2.1-all.zip')], { encoding: 'utf8' })
const lines = t.stdout.split(/\r?\n/).filter(Boolean)
console.log('zip total entries:', lines.length)
console.log('first 5:', lines.slice(0, 5))
// 顶层目录名
const tops = new Set(lines.map(l => l.split('/')[0]))
console.log('top-level names:', [...tops])
