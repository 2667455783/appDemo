/**
 * 发版共用：语义化版本、Android/iOS/Vite 版本号同步
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function bumpSemver(v) {
  const parts = String(v || '1.0.0')
    .split('.')
    .map((n) => parseInt(n, 10) || 0)
  while (parts.length < 3) parts.push(0)
  parts[2] += 1
  return parts.join('.')
}

export function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function readPrevManifest(path) {
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
}

/** 同步 iOS MARKETING_VERSION / CURRENT_PROJECT_VERSION（与 Android versionName / versionCode 对齐） */
export function syncIosVersions(root, version, versionCode, opts = {}) {
  const pbxPath = join(root, 'ios/App/App.xcodeproj/project.pbxproj')
  if (!existsSync(pbxPath)) {
    console.warn('未找到 ios/App/App.xcodeproj/project.pbxproj，跳过 iOS 版本同步')
    return false
  }
  let text = readFileSync(pbxPath, 'utf-8')
  text = text
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${versionCode};`)

  const teamId = String(opts.teamId || '').trim()
  if (teamId) {
    if (/DEVELOPMENT_TEAM = /.test(text)) {
      text = text.replace(/DEVELOPMENT_TEAM = [^;]+;/g, `DEVELOPMENT_TEAM = ${teamId};`)
    } else {
      text = text.replace(
        /CODE_SIGN_STYLE = Automatic;/g,
        `CODE_SIGN_STYLE = Automatic;\n\t\t\t\tDEVELOPMENT_TEAM = ${teamId};`,
      )
    }
  }

  writeFileSync(pbxPath, text)
  console.log(`已同步 iOS：MARKETING_VERSION=${version} CURRENT_PROJECT_VERSION=${versionCode}`)
  return true
}

/** 写入 package.json / android build.gradle / vite APP_VERSION_CODE / iOS pbxproj */
export function writeAllVersions(root, { version, versionCode, teamId } = {}) {
  const pkgPath = join(root, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  pkg.version = version
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  const gradlePath = join(root, 'android/app/build.gradle')
  if (existsSync(gradlePath)) {
    let gradle = readFileSync(gradlePath, 'utf-8')
    gradle = gradle
      .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
      .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`)
    writeFileSync(gradlePath, gradle)
  } else {
    console.warn('未找到 android/app/build.gradle，跳过 Android 版本写入')
  }

  const vitePath = join(root, 'vite.config.ts')
  if (existsSync(vitePath)) {
    let vite = readFileSync(vitePath, 'utf-8')
    if (/const APP_VERSION_CODE\s*=\s*\d+/.test(vite)) {
      vite = vite.replace(/const APP_VERSION_CODE\s*=\s*\d+/, `const APP_VERSION_CODE = ${versionCode}`)
      writeFileSync(vitePath, vite)
    } else {
      console.warn('警告：vite.config.ts 未找到 APP_VERSION_CODE，请手动同步')
    }
  }

  syncIosVersions(root, version, versionCode, { teamId })
}

/** 从 Android gradle + package.json 读取当前版本 */
export function readCurrentVersions(root) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
  let versionCode = 1
  const gradlePath = join(root, 'android/app/build.gradle')
  if (existsSync(gradlePath)) {
    const m = readFileSync(gradlePath, 'utf-8').match(/versionCode\s+(\d+)/)
    if (m) versionCode = Number(m[1])
  } else {
    const pbxPath = join(root, 'ios/App/App.xcodeproj/project.pbxproj')
    if (existsSync(pbxPath)) {
      const m = readFileSync(pbxPath, 'utf-8').match(/CURRENT_PROJECT_VERSION = (\d+);/)
      if (m) versionCode = Number(m[1])
    }
  }
  return {
    version: pkg.version || '1.0.0',
    versionCode,
  }
}
