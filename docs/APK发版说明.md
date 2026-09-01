# APK 打包与发版说明

本项目为 Vue3 + Capacitor Android。日常发版用脚本即可；也可手动分步打包。

---

## 环境说明

发版脚本会**自动**查找并设置：

- `JAVA_HOME`：优先 `C:\Users\PC\.jdks\*`（如 `ms-17.0.19`）
- `ANDROID_HOME`：项目内 `.android-sdk`（或 `android/local.properties` 的 `sdk.dir`）

一般**不必**每次手动设环境变量。直接在项目根目录执行下方命令即可。

SSH 密钥：`C:\Users\PC\.ssh\vue_admin_deploy`（已写入 `scripts/release.config.json`）

---

## 方式一：一键发版（推荐）

自动完成：版本号 +1 → `npm run build` → `cap sync` → 打 APK → 生成 `update.json` → SCP 上传服务器。

```powershell
# 打包并上传
npm run release:apk -- --notes "本次更新说明"

# 只打包不上传
npm run release:apk:local

# 其它参数
npm run release:apk -- --notes "说明" --skip-upload   # 同 local
npm run release:apk -- --skip-build                   # 跳过 gradle（已有 APK 时）
npm run release:apk -- --no-bump                      # 不升版本号
```

### 产物位置

| 文件 | 路径 |
|------|------|
| 带版本号 APK | `release/app-{version}.apk` |
| 固定名 APK | `release/latest.apk` |
| 更新清单 | `release/update.json`（同时写入 `public/update.json`） |
| Gradle 原始包 | `android/app/build/outputs/apk/debug/app-debug.apk` |

`release/` 与服务器目录都只**保留当前版 + 上一版**的 `app-*.apk`，更早的会在发版时自动删除；`latest.apk` / `update.json` 始终保留。

### 线上地址

- 清单：http://134.175.54.151/englishStudy/update.json
- APK：http://134.175.54.151/englishStudy/app-{version}.apk
- 备用：http://134.175.54.151/englishStudy/latest.apk

服务器目录：`/var/www/vue-admin/englishStudy`  
配置文件：`scripts/release.config.json`

### App 内如何更新

用户打开 **我的 → 检查更新**。  
远程 `versionCode` 大于本机才会提示更新；下载后需允许「未知来源」安装。

---

## 方式二：手动分步打包（不升版本、不上传）

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

APK：`android\app\build\outputs\apk\debug\app-debug.apk`

拷到桌面可参考：`node scripts/copy-apk.cjs`

---

## 桌面图标与应用名

| 项目 | 位置 |
|------|------|
| 源图（1024 或 500 方图） | `resources/app-icon-source.jpg` |
| 生成各尺寸图标 | `npm run generate:icon` |
| 桌面显示名称 | `capacitor.config.ts` 的 `appName` + `android/.../strings.xml` |

换图标：替换 `resources/app-icon-source.jpg` 后执行 `npm run generate:icon`，再重新打包。

## 版本号会改哪些文件

脚本升版本时会同步改：

1. `package.json` → `version`（如 `1.0.1`）
2. `android/app/build.gradle` → `versionName` / `versionCode`
3. `vite.config.ts` → `APP_VERSION_CODE`
4. `public/update.json` → 清单内容

`versionCode` 必须是递增整数，用户端靠它判断是否有新版本。

---

## 服务器相关（一般不用再做）

首次已配置 Nginx 的 `/englishStudy/`（CORS + JSON/APK MIME）。

若换机器或目录坏了，可参考：

```powershell
# 用密钥登录
ssh -i C:\Users\PC\.ssh\vue_admin_deploy -o IdentitiesOnly=yes root@134.175.54.151

# 目录应存在
# /var/www/vue-admin/englishStudy
```

本机初始化脚本：`scripts/server-setup-englishStudy.sh`（路径已按当前站点根目录改过）。

---

## 常见问题

| 现象 | 处理 |
|------|------|
| `JAVA_HOME is not set` | 已由脚本自动设置；若仍报错，确认存在 `C:\Users\你\.jdks\ms-17*` |
| `java` / `npm` 找不到 | 更新到最新 `scripts/release-apk.mjs` 后重试（已修 Windows Path） |
| SSH Permission denied | 确认用 `vue_admin_deploy` 密钥；检查 `release.config.json` 的 `identityFile` |
| 检查更新一直最新 | 确认线上 `versionCode` 大于手机已装版本；浏览器打开清单 URL 看是否更新 |
| 打开 update.json 却是 HTML | Nginx 未正确挂 `englishStudy`；确认文件在 `/var/www/vue-admin/englishStudy/` |
| 上传失败 | `npm run release:apk:local` 后，手动把 `release/` 下文件拷到服务器该目录 |
| 上次失败已升版本 | 用 `npm run release:apk:local -- --no-bump` 续跑，避免再 +1 |

---

## 相关文件一览

```
scripts/release-apk.mjs              # 发版主脚本
scripts/release.config.json          # 服务器 / 密钥 / 路径
scripts/server-setup-englishStudy.sh # 服务器初始化（备用）
src/config/update.ts                 # App 默认清单 URL
src/services/appUpdate.ts            # 检查更新逻辑
public/update.json                   # 本地清单模板（发版会改）
```
