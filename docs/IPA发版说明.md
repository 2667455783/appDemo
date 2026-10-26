# IPA 打包与发版说明

本项目为 Vue3 + Capacitor iOS。流程对齐 APK 发版，但 **真正打出 IPA 必须在 macOS + Xcode** 上完成。Windows 上可先做「准备」：升版本、构建 Web、`cap sync ios`。

---

## 环境说明

| 步骤 | Windows | Mac |
|------|---------|-----|
| 升版本 / `vite build` / `cap sync ios` | ✅ | ✅ |
| `pod install` + `xcodebuild` 导出 IPA | ❌ | ✅ |
| SCP 上传服务器 | ✅（有 OpenSSH） | ✅ |

Mac 需安装：

- Xcode（含 Command Line Tools）
- CocoaPods：`sudo gem install cocoapods`
- Apple 开发者账号（免费账号仅能装到本机已注册设备）

在 `scripts/release.config.json` 中可填：

```json
{
  "iosExportMethod": "development",
  "iosTeamId": "你的10位TeamID"
}
```

- `iosExportMethod`：`development`（本机调试）/ `ad-hoc`（已登记 UDID）/ `app-store`（上架）
- `iosTeamId`：Xcode → Settings → Accounts → Team ID；填写后写入工程 `DEVELOPMENT_TEAM`

SSH 密钥与 APK 共用：`scripts/release.config.json` 的 `identityFile`。

---

## 方式一：Windows 准备 + Mac 打 IPA（推荐跨机）

**1. 在 Windows 项目根目录：**

```powershell
# 升版本 + 构建 + sync，不打 IPA、不上传
npm run release:ios:prepare -- --notes "本次更新说明"

# 不升版本号
npm run release:ios:prepare -- --no-bump --notes "说明"
```

**2. 把整个项目拷到 Mac**（或 git push / pull），然后：

```bash
npm install
npm run release:ios -- --no-bump --notes "本次更新说明"

# 只打 IPA 不上传
npm run release:ios:local -- --no-bump
```

`--no-bump` 很重要：避免 Windows 已 +1 后 Mac 再 +1。

---

## 方式二：全程在 Mac 一键发版

```bash
npm run release:ios -- --notes "本次更新说明"
npm run release:ios:local -- --notes "说明"   # 不上传
npm run release:ios -- --no-bump              # 不升版本
npm run release:ios -- --skip-build           # 已有 IPA，只整理/上传
```

脚本会：版本号 +1（可选）→ `npm run build` → `npx cap sync ios` → `pod install` → `xcodebuild archive` → `exportArchive` → 写入 `release/` → SCP 上传。

### 产物位置

| 文件 | 路径 |
|------|------|
| 带版本号 IPA | `release/app-{version}.ipa` |
| 固定名 IPA | `release/latest.ipa` |
| 更新清单 | `release/update.json`（同时写 `public/update.json`，含 `ipaUrl`） |
| Xcode 导出目录 | `ios/App/output/*.ipa` |
| Archive | `ios/App/build/App.xcarchive` |

`release/` 与服务器目录对 `app-*.ipa` 只保留当前版 + 上一版。

### 线上地址

- 清单：http://134.175.54.151/englishStudy/update.json
- IPA：http://134.175.54.151/englishStudy/app-{version}.ipa
- 备用：http://134.175.54.151/englishStudy/latest.ipa

---

## 方式三：手动分步（Mac）

```bash
npm run build
npx cap sync ios
cd ios/App && pod install
npx cap open ios
```

在 Xcode：选真机或 Generic iOS Device → Product → Archive → Distribute App → 导出 IPA。

---

## 版本号会改哪些文件

与 APK 发版共用同一套版本，脚本会同步改：

1. `package.json` → `version`
2. `android/app/build.gradle` → `versionName` / `versionCode`
3. `vite.config.ts` → `APP_VERSION_CODE`
4. `ios/App/App.xcodeproj/project.pbxproj` → `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`
5. `public/update.json` → 清单（含 `ipaUrl`；保留已有 `apkUrl`）

`CURRENT_PROJECT_VERSION` 必须与 Android `versionCode` 一致，App 内「检查更新」靠它比较。

发 APK 时也会同步改 iOS 工程版本，避免双端分叉。

---

## 桌面图标

```powershell
npm run generate:icon
```

会同时写入 Android `mipmap-*` 与 iOS `AppIcon.appiconset/AppIcon-512@2x.png`。

---

## 安装说明（重要）

iOS **不能**像 Android 那样点链接直接装 IPA，除非：

- 开发签 / Ad Hoc：设备 UDID 已加到描述文件，用 Apple Configurator、爱思助手等安装；或
- TestFlight / App Store；或
- 企业签（需企业账号，有风险与合规要求）

App 内「检查更新」目前仍以 Android `apkUrl` 下载为主；清单里的 `ipaUrl` 供分发与后续扩展。

---

## 常见问题

| 现象 | 处理 |
|------|------|
| Windows 上 `xcodebuild` 找不到 | 正常；用 `release:ios:prepare` 后到 Mac 续跑 |
| No signing certificate / Team | 在 Xcode 登录 Apple ID，或填 `iosTeamId` |
| `pod: command not found` | `sudo gem install cocoapods` |
| 版本被升了两次 | Mac 续跑务必加 `--no-bump` |
| 导出 method 不对 | 改 `release.config.json` 的 `iosExportMethod` |
| 上传失败 | `npm run release:ios:local` 后手动拷 `release/` |

---

## 相关文件一览

```
scripts/release-ios.mjs           # iOS 发版主脚本
scripts/lib/app-version.mjs       # 双端版本同步
scripts/ios/ExportOptions.plist   # 导出选项模板
scripts/release.config.json       # 服务器 / Team / 导出方式
docs/APK发版说明.md               # Android 对照文档
```
