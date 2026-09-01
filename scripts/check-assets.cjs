const fs = require('fs')
const path = require('path')
const assets = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets')
console.log('assets entries:')
for (const e of fs.readdirSync(assets)) console.log('  ' + e)
function sizeMB(d) {
  let s = 0
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, e.name)
    if (f.isDirectory()) s += sizeMB(full)
    else s += fs.statSync(full).size
  }
  return s
}
for (const m of ['vosk-model-small-cn', 'vosk-model-small-en-us']) {
  const p = path.join(assets, m)
  console.log(`${m}: ${(sizeMB(p) / 1048576).toFixed(1)} MB`)
}
