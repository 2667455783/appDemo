// 解压 Vosk 模型直接到 android/app/src/main/assets/<name>/，用 tar --strip-components=1 去掉顶层目录
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const crypto = require('crypto')

const root = path.join(__dirname, '..')
const srcDir = path.join(root, '.vosk-models')
const assetsDir = path.join(root, 'android', 'app', 'src', 'main', 'assets')
fs.mkdirSync(assetsDir, { recursive: true })

const tasks = [
  { zip: 'cn.zip', dest: 'vosk-model-small-cn' },
  { zip: 'en.zip', dest: 'vosk-model-small-en-us' },
]

for (const t of tasks) {
  const zipPath = path.join(srcDir, t.zip)
  const destAbs = path.join(assetsDir, t.dest)
  if (!fs.existsSync(zipPath)) { console.error(`missing ${t.zip}`); process.exitCode = 1; continue }

  // 清理目标
  if (fs.existsSync(destAbs)) {
    try { fs.rmSync(destAbs, { recursive: true, force: true }) } catch (e) { console.warn(`rm ${destAbs}: ${e.message}`) }
  }
  fs.mkdirSync(destAbs, { recursive: true })

  console.log(`Extracting ${t.zip} -> ${t.dest}`)
  const r = spawnSync('tar', ['-xf', zipPath, '--strip-components=1', '-C', destAbs], { stdio: 'inherit' })
  if (r.status !== 0) { console.error(`tar failed for ${t.zip} (status ${r.status})`); process.exitCode = 1; continue }

  // 写 uuid（Vosk StorageService.unpack 需要）
  const uuid = crypto.randomUUID()
  fs.writeFileSync(path.join(destAbs, 'uuid'), uuid, 'utf8')

  const files = fs.readdirSync(destAbs)
  console.log(`  ${t.dest}: ${files.length} entries: ${files.slice(0, 12).join(', ')}${files.length > 12 ? ' ...' : ''}`)
  console.log(`  has conf/am.json: ${fs.existsSync(path.join(destAbs, 'conf', 'am.json'))}`)
  console.log(`  has words.txt: ${fs.existsSync(path.join(destAbs, 'words.txt'))}`)
  console.log(`  uuid: ${uuid}`)
}
console.log('EXTRACT_DONE')
