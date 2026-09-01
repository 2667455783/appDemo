const fs = require('fs')
const path = require('path')
const os = require('os')
const hashDir = path.join(os.homedir(), '.gradle', 'wrapper', 'dists', 'gradle-8.2.1-all', 'd8pvvlun5bx6sdtwqhf8y9z4b')
const extractDir = path.join(hashDir, 'gradle-8.2.1')  // 正确名
const okPath = path.join(hashDir, 'gradle-8.2.1-all.zip.ok')
const gradleBat = path.join(extractDir, 'bin', 'gradle.bat')
console.log('gradle-8.2.1 exists:', fs.existsSync(extractDir))
console.log('bin/gradle.bat exists:', fs.existsSync(gradleBat))
if (fs.existsSync(extractDir)) console.log('contents:', fs.readdirSync(extractDir).slice(0, 12).join(', '))
if (!fs.existsSync(gradleBat)) { console.error('STILL MISSING gradle.bat'); process.exit(1) }
fs.writeFileSync(okPath, '')
console.log('ok marker created:', fs.existsSync(okPath))
console.log('GRADLE_READY')
