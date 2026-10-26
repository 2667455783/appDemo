#!/usr/bin/env node
/**
 * iOS 发版：升版本 → 构建 Web → cap sync ios →（仅 macOS）xcodebuild 打 IPA → 可选 SCP 上传
 *
 * 用法：
 *   npm run release:ios
 *   npm run release:ios -- --notes "修复语音"
 *   npm run release:ios:local                    # 不上传
 *   npm run release:ios -- --no-bump             # 不升版本号
 *   npm run release:ios -- --prepare-only        # 只升版本+构建+sync（Windows 常用）
 *   npm run release:ios -- --skip-build          # 跳过构建（已有 IPA 时只整理/上传）
 *   npm run release:ios -- --skip-upload
 *
 * 说明：Windows 无法执行 xcodebuild；脚本会完成准备步骤并提示在 Mac 上续跑。
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
import {
  bumpSemver,
  readCurrentVersions,
  readPrevManifest,
  today,
  writeAllVersions,
} from './lib/app-version.mjs'

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
const prepareOnly = flag('--prepare-only') || process.platform !== 'darwin'
const isMac = process.platform === 'darwin'

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
    console.error('未找到 ssh/scp。请安装 OpenSSH 客户端，或使用 --skip-upload')
    process.exit(1)
  }

  return { ssh, scp }
}

const buildEnv = { ...process.env }
const { ssh: sshBin, scp: scpBin } = resolveSshTools(buildEnv)

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit', shell: true, env: buildEnv })
}

function which(bin) {
  try {
    const cmd = process.platform === 'win32' ? `where ${bin}` : `command -v ${bin}`
    return execSync(cmd, { encoding: 'utf-8', env: buildEnv, shell: true }).trim().split(/\r?\n/)[0]
  } catch {
    return ''
  }
}

function writeExportOptionsPlist(outPath) {
  const method = String(cfg.iosExportMethod || 'development').trim() || 'development'
  const teamId = String(cfg.iosTeamId || '').trim()
  const dict = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '\t<key>method</key>',
    `\t<string>${method}</string>`,
    '\t<key>compileBitcode</key>',
    '\t<false/>',
    '\t<key>signingStyle</key>',
    '\t<string>automatic</string>',
    '\t<key>stripSwiftSymbols</key>',
    '\t<true/>',
    '\t<key>thinning</key>',
    '\t<string>&lt;none&gt;</string>',
  ]
  if (teamId) {
    dict.push('\t<key>teamID</key>', `\t<string>${teamId}</string>`)
  }
  dict.push('</dict>', '</plist>', '')
  writeFileSync(outPath, dict.join('\n'))
}

function findBuiltIpa(searchDirs) {
  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue
    const ipas = readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.ipa'))
    if (ipas.length === 1) return join(dir, ipas[0])
    if (ipas.length > 1) {
      // 优先 App.ipa
      const preferred = ipas.find((n) => /^app\.ipa$/i.test(n)) || ipas[0]
      return join(dir, preferred)
    }
  }
  return ''
}

function pruneOldIpas(dir, keepCurrentName) {
  const re = /^app-(\d+)\.(\d+)\.(\d+)\.ipa$/i
  const scored = []
  for (const name of readdirSync(dir)) {
    const m = name.match(re)
    if (!m) continue
    const score = Number(m[1]) * 1_000_000 + Number(m[2]) * 1_000 + Number(m[3])
    scored.push({ name, score })
  }
  scored.sort((a, b) => b.score - a.score)
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

function buildIpaOnMac() {
  if (!which('xcodebuild')) {
    console.error('未找到 xcodebuild。请安装 Xcode 并接受许可：sudo xcodebuild -license accept')
    process.exit(1)
  }

  const iosAppDir = join(root, 'ios/App')
  const workspace = join(iosAppDir, 'App.xcworkspace')
  if (!existsSync(workspace)) {
    console.error(`找不到 ${workspace}，请先 npx cap sync ios`)
    process.exit(1)
  }

  if (which('pod')) {
    run('pod install', iosAppDir)
  } else {
    console.warn('未找到 CocoaPods（pod）。若编译失败请先：sudo gem install cocoapods')
  }

  const derived = join(iosAppDir, 'build')
  const archivePath = join(derived, 'App.xcarchive')
  const exportDir = join(iosAppDir, 'output')
  mkdirSync(derived, { recursive: true })
  mkdirSync(exportDir, { recursive: true })

  const exportPlist = join(exportDir, 'ExportOptions.plist')
  writeExportOptionsPlist(exportPlist)

  const teamArg = String(cfg.iosTeamId || '').trim()
    ? ` DEVELOPMENT_TEAM=${String(cfg.iosTeamId).trim()}`
    : ''

  run(
    `xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath "${archivePath}"${teamArg} -allowProvisioningUpdates archive`,
    iosAppDir,
  )
  run(
    `xcodebuild -exportArchive -archivePath "${archivePath}" -exportPath "${exportDir}" -exportOptionsPlist "${exportPlist}" -allowProvisioningUpdates`,
    iosAppDir,
  )

  const ipa = findBuiltIpa([exportDir])
  if (!ipa) {
    console.error(`导出完成但未找到 .ipa，请检查：${exportDir}`)
    process.exit(1)
  }
  return ipa
}

// ---- 版本 ----
let { version, versionCode } = readCurrentVersions(root)
const teamId = String(cfg.iosTeamId || '').trim()

if (!noBump) {
  version = bumpSemver(version)
  versionCode += 1
  writeAllVersions(root, { version, versionCode, teamId })
  console.log(`版本已升至 ${version} (versionCode ${versionCode})`)
} else {
  writeAllVersions(root, { version, versionCode, teamId })
  console.log(`保持版本 ${version} (versionCode ${versionCode})（已重新同步到 Android/iOS/Vite）`)
}

const ipaFileName = String(cfg.ipaNamePattern || 'app-{version}.ipa').replace('{version}', version)
const ipaUrl = `${cfg.publicBase.replace(/\/$/, '')}/${ipaFileName}`
const apkFileName = String(cfg.apkNamePattern || 'app-{version}.apk').replace('{version}', version)
const defaultApkUrl = `${cfg.publicBase.replace(/\/$/, '')}/${apkFileName}`

const publicUpdate = join(root, 'public/update.json')
const prev = readPrevManifest(publicUpdate)
const manifest = {
  version,
  versionCode,
  apkUrl: typeof prev.apkUrl === 'string' && prev.apkUrl.trim() ? prev.apkUrl : defaultApkUrl,
  ipaUrl,
  notes,
  publishedAt: today(),
  force: false,
}
writeFileSync(publicUpdate, JSON.stringify(manifest, null, 2) + '\n')
console.log('已写入 public/update.json')

const releaseDir = join(root, 'release')
mkdirSync(releaseDir, { recursive: true })
const outJson = join(releaseDir, 'update.json')
writeFileSync(outJson, JSON.stringify(manifest, null, 2) + '\n')

// ---- 构建 ----
let builtIpa = ''
if (!skipBuild) {
  run('npm run build')
  run('npx cap sync ios')

  if (prepareOnly && !isMac) {
    console.log('\n========== 准备完成（非 macOS，跳过 xcodebuild）==========')
    console.log('已完成：版本同步 + Web 构建 + cap sync ios')
    console.log('请把整个项目拷到 Mac，然后执行：')
    console.log('  npm install')
    console.log('  npm run release:ios -- --no-bump --notes ' + JSON.stringify(notes))
    console.log('若 Mac 上只想打 IPA 不上传：')
    console.log('  npm run release:ios:local -- --no-bump')
    writeFileSync(
      join(releaseDir, 'ios-prepare-next.txt'),
      [
        `version=${version}`,
        `versionCode=${versionCode}`,
        `notes=${notes}`,
        '',
        '在 Mac 上续跑：',
        `npm run release:ios -- --no-bump --notes ${JSON.stringify(notes)}`,
        '',
      ].join('\n'),
    )
    if (skipUpload || !isMac) {
      console.log(`\n产物目录：${releaseDir}（含 update.json）`)
      process.exit(0)
    }
  } else if (prepareOnly && isMac && flag('--prepare-only')) {
    console.log('\n--prepare-only：已跳过 xcodebuild。')
    console.log(`产物目录：${releaseDir}`)
    process.exit(0)
  } else {
    builtIpa = buildIpaOnMac()
  }
} else {
  builtIpa =
    findBuiltIpa([
      join(root, 'ios/App/output'),
      releaseDir,
      join(root, 'ios/App/build'),
    ]) || ''
  if (!builtIpa) {
    console.error('--skip-build 但找不到已有 .ipa')
    console.error('请检查 ios/App/output/ 或 release/')
    process.exit(1)
  }
  console.log(`使用已有 IPA：${builtIpa}`)
}

if (!builtIpa) {
  console.error('未生成 IPA')
  process.exit(1)
}

const outIpa = join(releaseDir, ipaFileName)
copyFileSync(builtIpa, outIpa)
copyFileSync(builtIpa, join(releaseDir, 'latest.ipa'))
writeFileSync(outJson, JSON.stringify(manifest, null, 2) + '\n')

const pruned = pruneOldIpas(releaseDir, ipaFileName)
console.log(`\n产物目录：${releaseDir}`)
console.log(`  - ${ipaFileName}`)
console.log('  - latest.ipa')
console.log('  - update.json')
if (pruned.length) {
  console.log(`已清理旧包（仅保留当前+上一版）：${pruned.join(', ')}`)
}

if (skipUpload) {
  console.log('\n已跳过上传。请手动把 release/ 下 IPA 与 update.json 传到服务器 englishStudy 目录。')
  process.exit(0)
}

const remote = `${cfg.user}@${cfg.host}`
const remoteDir = cfg.remoteDir
const port = cfg.port || 22
const identity = cfg.identityFile
  ? `-i "${String(cfg.identityFile).replace(/\\/g, '/')}" -o IdentitiesOnly=yes`
  : ''
const sshBase = `${sshBin} -p ${port} ${identity}`.replace(/\s+/g, ' ').trim()
const scpBase = `${scpBin} -P ${port} ${identity}`.replace(/\s+/g, ' ').trim()

console.log(`\n上传到 ${remote}:${remoteDir}`)
try {
  execSync(`${sshBase} ${remote} "mkdir -p ${remoteDir}"`, {
    stdio: 'inherit',
    shell: true,
    env: buildEnv,
  })
  execSync(`${scpBase} "${outIpa}" "${remote}:${remoteDir}/${ipaFileName}"`, {
    stdio: 'inherit',
    shell: true,
    env: buildEnv,
  })
  execSync(`${scpBase} "${join(releaseDir, 'latest.ipa')}" "${remote}:${remoteDir}/latest.ipa"`, {
    stdio: 'inherit',
    shell: true,
    env: buildEnv,
  })
  execSync(`${scpBase} "${outJson}" "${remote}:${remoteDir}/update.json"`, {
    stdio: 'inherit',
    shell: true,
    env: buildEnv,
  })
  const pruneRemote = `cd ${remoteDir} && ls -1 app-*.ipa 2>/dev/null | sort -V | head -n -2 | xargs -r rm -f`
  try {
    execSync(`${sshBase} ${remote} "${pruneRemote}"`, { stdio: 'inherit', shell: true, env: buildEnv })
  } catch {
    console.warn('远端旧 IPA 清理跳过（不影响本次上传）')
  }
  console.log('\n上传成功。')
  console.log(`清单：${cfg.publicBase}/update.json`)
  console.log(`IPA：  ${ipaUrl}`)
  console.log('提示：iOS 侧载需描述文件/企业签或 TestFlight；普通链接下载无法像 APK 直接安装。')
} catch (e) {
  console.error('\n上传失败。也可：npm run release:ios -- --skip-upload 后手动上传')
  process.exit(1)
}
