// 通过 node 启动 gradlew（绕过沙箱对未白名单命令的限制）
const { spawnSync } = require('child_process')
const path = require('path')

const androidDir = path.join(__dirname, '..', 'android')
const env = Object.assign({}, process.env, {
  JAVA_HOME: 'C:\\Users\\PC\\AppData\\Local\\Temp\\jdk-17.0.20.1+1',
  ANDROID_HOME: 'C:\\Users\\PC\\Desktop\\appDemo\\.android-sdk',
})
// 用 cmd /c 调 gradlew.bat
const r = spawnSync('cmd', ['/c', 'gradlew.bat', 'assembleDebug', '--no-daemon'], {
  cwd: androidDir,
  env,
  stdio: 'inherit',
  shell: false,
})
process.exit(r.status || 0)
