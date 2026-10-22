const fs = require('fs')
const path = require('path')
const apk = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const dest = 'C:\\Users\\PC\\Desktop\\学习宝典-debug.apk'
console.log('APK exists:', fs.existsSync(apk))
if (fs.existsSync(apk)) {
  const sz = fs.statSync(apk).size
  console.log(`APK size: ${(sz/1048576).toFixed(1)} MB (${sz} bytes)`)
  fs.copyFileSync(apk, dest)
  console.log('copied to:', dest)
  console.log('dest size:', (fs.statSync(dest).size/1048576).toFixed(1), 'MB')
}
console.log('APK_DONE')
