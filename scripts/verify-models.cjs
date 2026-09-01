// 验证模型结构
const fs = require('fs')
const path = require('path')
const assets = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets')
for (const m of ['vosk-model-small-cn', 'vosk-model-small-en-us']) {
  const root = path.join(assets, m)
  console.log(`=== ${m} ===`)
  function walk(d, pre = '') {
    let entries
    try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) {
        const sub = fs.readdirSync(full)
        console.log(`${pre}${e.name}/ (${sub.length} entries)`)
        if (pre.length < 2) walk(full, pre + '  ')
      } else {
        const sz = fs.statSync(full).size
        console.log(`${pre}${e.name} (${sz} bytes)`)
      }
    }
  }
  walk(root)
  // 关键文件检查
  const key = (rel) => fs.existsSync(path.join(root, rel))
  console.log(`  graph/HCLG.fst: ${key('graph/HCLG.fst')}`)
  console.log(`  graph/words.txt: ${key('graph/words.txt')}`)
  console.log(`  conf/mfcc.conf: ${key('conf/mfcc.conf')}`)
  console.log(`  am/final.al: ${key('am/final.al')}`)
}
