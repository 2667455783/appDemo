const fs = require('fs')
const path = require('path')
const os = require('os')
const dir = path.join(os.homedir(), '.gradle', 'wrapper', 'dists', 'gradle-8.2.1-all')
function walk(d, pre='') {
  let entries
  try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { console.log(pre + '(cannot read)'); return }
  for (const e of entries) {
    const full = path.join(d, e.name)
    if (e.isDirectory()) {
      console.log(`${pre}${e.name}/`)
      if (pre.split('').filter(c=>c===' ').length < 6) walk(full, pre + '  ')
    } else {
      console.log(`${pre}${e.name} (${fs.statSync(full).size} bytes)`)
    }
  }
}
walk(dir)
