#!/usr/bin/env node
/**
 * 发版脚本：升版本 → 构建 Web → 打 APK → 生成 update.json → SCP 上传到服务器
 *
 * 用法：
 *   npm run release:apk
 *   npm run release:apk -- --notes "修复语音与词典"
 *   npm run release:apk -- --skip-upload          # 只打包不上传
 *   npm run release:apk -- --skip-build           # 跳过 gradle（已有 APK 时）
 *   npm run release:apk -- --no-bump             # 不升版本号
 *
 * 首次请先在服务器执行：
 *   bash scripts/server-setup-englishStudy.sh
 * 并确保本机可 SSH：ssh root@134.175.54.151
 */
import { execSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const cfg = JSON.parse(readFileSync(join(__dirname, 'release.config.json'), 'utf-8'))

const args = process.argv.slice(2)
function flag(name) {
  return args.includes(name)
}
function opt(name, fallback = '') {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const notes = opt('--notes', '常规更新')
const skipUpload = flag('--skip-upload')
const skipBuild = flag('--skip-build')
const noBump = flag('--no-bump')

/** 自动补齐 JAVA_HOME / ANDROID_HOME，避免新开终端忘记设环境变量 */
function ensureAndroidEnv() {
  const env = { ...process.env }
  const home = homedir()

  if (!env.JAVA_HOME || !existsSync(join(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))) {
    const candidates = []
    const jdksRoot = join(home, '.jdks')
    if (existsSync(jdksRoot)) {
      const names = readdirSync(jdksRoot).sort((a, b) => {
        // 优先 JDK 17（Android Gradle 常用）
        const score = (n) => (/17/.test(n) ? 0 : /11/.test(n) ? 1 : 2)
        return score(a) - score(b) || a.localeCompare(b)
      })
      for (const name of names) candidates.push(join(jdksRoot, name))
    }
    candidates.push(
      'C:\\Program Files\\Android\\Android Studio\\jbr',
      'C:\\Program Files\\Java\\jdk-17',
      join(home, 'AppData', 'Local', 'Programs', 'Android', 'Android Studio', 'jbr'),
    )
    const found = candidates.find((p) =>
      existsSync(join(p, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')),
    )
    if (found) {
      env.JAVA_HOME = found
      console.log(`已自动设置 JAVA_HOME=${found}`)
    }
  }

  if (!env.ANDROID_HOME && !env.ANDROID_SDK_ROOT) {
    let sdk = join(root, '.android-sdk')
    const localProps = join(root, 'android', 'local.properties')
    if (existsSync(localProps)) {
      const m = readFileSync(localProps, 'utf-8').match(/sdk\.dir\s*=\s*(.+)/)
      if (m) {
        sdk = m[1].trim().replace(/\\\\/g, '\\').replace(/\\/g, process.platform === 'win32' ? '\\' : '/')
      }
    }
    if (existsSync(sdk)) {
      env.ANDROID_HOME = sdk
      env.ANDROID_SDK_ROOT = sdk
      console.log(`已自动设置 ANDROID_HOME=${sdk}`)
    }
  }

  if (env.JAVA_HOME) {
    const sep = process.platform === 'win32' ? ';' : ':'
    const pathKey = process.platform === 'win32' && env.Path !== undefined ? 'Path' : 'PATH'
    const prev = env[pathKey] || env.PATH || env.Path || ''
    env[pathKey] = `${join(env.JAVA_HOME, 'bin')}${sep}${prev}`
    env.PATH = env[pathKey]
    env.Path = env[pathKey]
  }
  if (env.ANDROID_HOME) {
    const sep = process.platform === 'win32' ? ';' : ':'
    const pathKey = process.platform === 'win32' && env.Path !== undefined ? 'Path' : 'PATH'
    const prev = env[pathKey] || env.PATH || env.Path || ''
    env[pathKey] = `${join(env.ANDROID_HOME, 'platform-tools')}${sep}${prev}`
    env.PATH = env[pathKey]
    env.Path = env[pathKey]
  }

  if (!env.JAVA_HOME) {
    console.error('未找到 JDK。请安装 JDK 17，或设置 JAVA_HOME（例如 C:\\Users\\你\\.jdks\\ms-17.x.x）')
    process.exit(1)
  }
  return env
}

/** Windows 上 npm 子进程的 PATH 常缺 OpenSSH，需解析 ssh/scp 完整路径 */
function resolveSshTools(env) {
  const isWin = process.platform === 'win32'
  const candidates = isWin
    ? [
        join(process.env.WINDIR || 'C:\\Windows', 'System32', 'OpenSSH', 'ssh.exe'),
        'C:\\Program Files\\Git\\usr\\bin\\ssh.exe',
      ]
    : ['ssh']

  let ssh = 'ssh'
  for (const p of candidates) {
    if (p === 'ssh' || existsSync(p)) {
      ssh = p.includes(' ') ? `"${p}"` : p
      break
    }
  }

  let scp = 'scp'
  if (isWin) {
    const scpCandidates = [
      join(process.env.WINDIR || 'C:\\Windows', 'System32', 'OpenSSH', 'scp.exe'),
      'C:\\Program Files\\Git\\usr\\bin\\scp.exe',
    ]
    for (const p of scpCandidates) {
      if (existsSync(p)) {
        scp = p.includes(' ') ? `"${p}"` : p
        break
      }
    }
    if (scp === 'scp' && ssh !== 'ssh') {
      const sshPath = ssh.replace(/^"|"$/g, '')
      const scpPath = sshPath.replace(/ssh\.exe$/i, 'scp.exe')
      if (existsSync(scpPath)) scp = scpPath.includes(' ') ? `"${scpPath}"` : scpPath
    }
  }

  if (isWin && ssh === 'ssh') {
    try {
      const out = spawnSync('where.exe', ['ssh'], { encoding: 'utf-8', env }).stdout?.trim()
      const first = out?.split(/\r?\n/).find(Boolean)
      if (first && existsSync(first)) {
        ssh = first.includes(' ') ? `"${first}"` : first
        const scpPath = first.replace(/ssh\.exe$/i, 'scp.exe')
        if (existsSync(scpPath)) scp = scpPath.includes(' ') ? `"${scpPath}"` : scpPath
      }
    } catch {
      /* ignore */
    }
  }

  if (isWin && ssh === 'ssh') {
    console.error('未找到 ssh/scp。请安装「OpenSSH 客户端」（Windows 可选功能），或使用：')
    console.error('  npm run release:apk -- --skip-upload')
    process.exit(1)
  }

  return { ssh, scp }
}

const buildEnv = ensureAndroidEnv()
const { ssh: sshBin, scp: scpBin } = resolveSshTools(buildEnv)

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit', shell: true, env: buildEnv })
}

const androidDir = join(root, 'android')
const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew'

/** Windows 上残留 Gradle daemon 会占端口，assemble 报 BindException */
function assembleAndroidApk() {
  try {
    run(`${gradlew} --stop`, androidDir)
  } catch {
    console.warn('gradle --stop 跳过（没有可停的 daemon）')
  }
  run(`${gradlew} assembleDebug --no-daemon`, androidDir)
}

function bumpSemver(v) {
  const parts = v.split('.').map((n) => parseInt(n, 10) || 0)
  while (parts.length < 3) parts.push(0)
  parts[2] += 1
  return parts.join('.')
}

function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ---- 读当前版本 ----
const pkgPath = join(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const gradlePath = join(root, 'android/app/build.gradle')
let gradle = readFileSync(gradlePath, 'utf-8')
const vitePath = join(root, 'vite.config.ts')
let vite = readFileSync(vitePath, 'utf-8')

const codeMatch = gradle.match(/versionCode\s+(\d+)/)
let versionCode = codeMatch ? Number(codeMatch[1]) : 1
let version = pkg.version || '1.0.0'

if (!noBump) {
  version = bumpSemver(version)
  versionCode += 1
  pkg.version = version
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  gradle = gradle
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`)
  writeFileSync(gradlePath, gradle)

  if (/const APP_VERSION_CODE\s*=\s*\d+/.test(vite)) {
    vite = vite.replace(/const APP_VERSION_CODE\s*=\s*\d+/, `const APP_VERSION_CODE = ${versionCode}`)
  } else {
    console.warn('警告：vite.config.ts 未找到 APP_VERSION_CODE，请手动同步')
  }
  writeFileSync(vitePath, vite)
  console.log(`版本已升至 ${version} (versionCode ${versionCode})`)
} else {
  console.log(`保持版本 ${version} (versionCode ${versionCode})`)
}

const apkFileName = String(cfg.apkNamePattern || 'app-{version}.apk').replace('{version}', version)
const apkUrl = `${cfg.publicBase.replace(/\/$/, '')}/${apkFileName}`
const manifest = {
  version,
  versionCode,
  apkUrl,
  notes,
  publishedAt: today(),
  force: false,
}

const publicUpdate = join(root, 'public/update.json')
writeFileSync(publicUpdate, JSON.stringify(manifest, null, 2) + '\n')
console.log('已写入 public/update.json')

// ---- 构建 ----
if (!skipBuild) {
  run('npm run build')
  run('npx cap sync android')
  assembleAndroidApk()
}

const builtApk = join(root, 'android/app/build/outputs/apk/debug/app-debug.apk')
const releaseDir = join(root, 'release')
mkdirSync(releaseDir, { recursive: true })
const outApk = join(releaseDir, apkFileName)
const outJson = join(releaseDir, 'update.json')

if (!existsSync(builtApk)) {
  console.error(`找不到 APK：${builtApk}`)
  console.error('请先能成功执行 android 打包，或去掉 --skip-build')
  process.exit(1)
}

copyFileSync(builtApk, outApk)
writeFileSync(outJson, JSON.stringify(manifest, null, 2) + '\n')
// 额外放一份 latest.apk 方便固定链接
copyFileSync(builtApk, join(releaseDir, 'latest.apk'))

/** 只保留当前版 + 上一版带版本号 APK，删掉更早的，避免 release/ 堆满 */
function pruneOldApks(dir, keepCurrentName) {
  const re = /^app-(\d+)\.(\d+)\.(\d+)\.apk$/i
  const scored = []
  for (const name of readdirSync(dir)) {
    const m = name.match(re)
    if (!m) continue
    const score = Number(m[1]) * 1_000_000 + Number(m[2]) * 1_000 + Number(m[3])
    scored.push({ name, score })
  }
  scored.sort((a, b) => b.score - a.score)
  // 始终保留最新 2 个（当前 + 上一个）；若 keepCurrentName 不在列表里也强制保留
  const keep = new Set(scored.slice(0, 2).map((x) => x.name))
  if (keepCurrentName) keep.add(keepCurrentName)
  const removed = []
  for (const { name } of scored) {
    if (keep.has(name)) continue
    try {
      unlinkSync(join(dir, name))
      removed.push(name)
    } catch {
      /* ignore */
    }
  }
  return removed
}

const pruned = pruneOldApks(releaseDir, apkFileName)
console.log(`\n产物目录：${releaseDir}`)
console.log(`  - ${apkFileName}`)
console.log('  - latest.apk')
console.log('  - update.json')
if (pruned.length) {
  console.log(`已清理旧包（仅保留当前+上一版）：${pruned.join(', ')}`)
}

if (skipUpload) {
  console.log('\n已跳过上传。请手动把 release/ 下文件传到服务器 englishStudy 目录。')
  process.exit(0)
}

// ---- 上传 ----
const remote = `${cfg.user}@${cfg.host}`
const remoteDir = cfg.remoteDir
const port = cfg.port || 22
const identity = cfg.identityFile
  ? `-i "${String(cfg.identityFile).replace(/\\/g, '/')}" -o IdentitiesOnly=yes`
  : ''
const sshBase = `${sshBin} -p ${port} ${identity}`.replace(/\s+/g, ' ').trim()
const scpBase = `${scpBin} -P ${port} ${identity}`.replace(/\s+/g, ' ').trim()

console.log(`\n上传到 ${remote}:${remoteDir}`)
console.log(`使用 ${sshBin} / ${scpBin}`)
try {
  execSync(`${sshBase} ${remote} "mkdir -p ${remoteDir}"`, {
    stdio: 'inherit',
    shell: true,
    env: buildEnv,
  })
  execSync(`${scpBase} "${outApk}" "${remote}:${remoteDir}/${apkFileName}"`, {
    stdio: 'inherit',
    shell: true,
    env: buildEnv,
  })
  execSync(`${scpBase} "${join(releaseDir, 'latest.apk')}" "${remote}:${remoteDir}/latest.apk"`, {
    stdio: 'inherit',
    shell: true,
    env: buildEnv,
  })
  execSync(`${scpBase} "${outJson}" "${remote}:${remoteDir}/update.json"`, {
    stdio: 'inherit',
    shell: true,
    env: buildEnv,
  })
  // 远端同样只留当前 + 上一版 app-*.apk（保留 latest.apk / update.json）
  const pruneRemote = `cd ${remoteDir} && ls -1 app-*.apk 2>/dev/null | sort -V | head -n -2 | xargs -r rm -f`
  try {
    execSync(`${sshBase} ${remote} "${pruneRemote}"`, { stdio: 'inherit', shell: true, env: buildEnv })
  } catch {
    console.warn('远端旧包清理跳过（不影响本次上传）')
  }
  console.log('\n上传成功。')
  console.log(`清单：${cfg.publicBase}/update.json`)
  console.log(`APK：  ${apkUrl}`)
  console.log('用户打开「我的 → 检查更新」即可下载安装。')
} catch (e) {
  console.error('\n上传失败。请确认：')
  console.error(`  1. 能 SSH：${sshBase} ${remote}`)
  console.error(`  2. 远端目录可写：${remoteDir}`)
  console.error('  3. release.config.json 的 identityFile / remoteDir 是否正确')
  console.error('也可：npm run release:apk -- --skip-upload 后手动上传 release/ 文件')
  process.exit(1)
}
