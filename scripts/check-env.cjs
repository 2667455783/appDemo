const fs = require('fs')
const paths = {
  'JAVA_HOME': 'C:\\Users\\PC\\AppData\\Local\\Temp\\jdk-17.0.20.1+1',
  'jdk17.zip': 'C:\\Users\\PC\\AppData\\Local\\Temp\\jdk17.zip',
  'ANDROID_HOME': 'C:\\Users\\PC\\Desktop\\appDemo\\.android-sdk',
}
for (const [k, p] of Object.entries(paths)) {
  console.log(`${k}: ${fs.existsSync(p) ? 'EXISTS' : 'MISSING'}  -> ${p}`)
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    try { console.log('   contents:', fs.readdirSync(p).slice(0, 8).join(', ')) } catch (e) { console.log('   err', e.message) }
  }
}
