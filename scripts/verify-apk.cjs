// 列出 APK 内的关键条目，确认模型与原生库已打包
const { spawnSync } = require('child_process')
const apk = 'C:\\Users\\PC\\Desktop\\英语备考-debug.apk'
const r = spawnSync('tar', ['-tf', apk], { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 })
const lines = r.stdout.split(/\r?\n/).filter(Boolean)
console.log('APK total entries:', lines.length)
const checks = [
  'assets/vosk-model-small-cn/uuid',
  'assets/vosk-model-small-cn/conf/mfcc.conf',
  'assets/vosk-model-small-cn/graph/Gr.fst',
  'assets/vosk-model-small-en-us/uuid',
  'assets/vosk-model-small-en-us/graph/Gr.fst',
  'assets/public/index.html',
]
for (const c of checks) console.log(`  ${c}: ${lines.includes(c) ? 'OK' : 'MISSING'}`)
// native libs
const libs = lines.filter(l => /^lib\/[^/]+\/(libvosk|libjnidispatch)\.so$/.test(l))
console.log('native libs:')
for (const l of libs) console.log('  ' + l)
// vosk classes
const cls = lines.filter(l => l.includes('englishdemo/app/vosk/'))
console.log('plugin classes:', cls.length)
for (const c of cls) console.log('  ' + c)
