// 列出 zip 内 graph 目录的全部文件，对比解压结果
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const srcDir = path.join(__dirname, '..', '.vosk-models')
for (const z of ['cn.zip', 'en.zip']) {
  console.log(`=== ${z} : graph/ contents (from zip) ===`)
  const r = spawnSync('tar', ['-tf', path.join(srcDir, z)], { encoding: 'utf8' })
  const lines = r.stdout.split(/\r?\n/).filter((l) => /\/graph\//.test(l) && !/\/graph\/phones\//.test(l))
  for (const l of lines) console.log('  ' + l)
}
console.log('=== extracted CN graph ===')
for (const f of fs.readdirSync(path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'vosk-model-small-cn', 'graph'))) {
  console.log('  ' + f)
}
