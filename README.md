# 英语备考 App（appDemo）

基于 `englishDemo`（Vue 3 + TypeScript + Vite）用 **Capacitor 6** 套壳生成的 Android / iOS 原生 App。
核心差异：翻译页的语音输入改用 **原生 SpeechRecognition 插件**，绕过浏览器 Web Speech API 的限制（iOS Safari 不支持、非 HTTPS 不可用），在手机 App 内可直接语音输入。

## 目录结构

```
appDemo/
├─ src/                # Vue 源码（与 englishDemo 同源，新增 services/voice.ts）
├─ android/            # Capacitor 生成的 Android 工程
├─ ios/                # Capacitor 生成的 iOS 工程（需 Mac+Xcode 编译）
├─ capacitor.config.ts # Capacitor 配置
└─ dist/               # vite build 产物，cap copy 会同步到原生工程
```

## 开发（Web 调试）

```bash
npm install
npm run dev      # http://localhost:5174
```

## 重新生成 web 资源并同步到原生工程

每次改完 src 代码后：

```bash
npm run cap:sync   # = npm run build && npx cap sync
```

## 编译 Android APK

> 需要先安装 **Android Studio**（含 Android SDK + JDK 17）。装好后：

```bash
npm run cap:sync
npx cap open android   # 用 Android Studio 打开 android/ 工程
```

在 Android Studio 里：
1. 等 Gradle 同步完成
2. 接 Android 手机（开启 USB 调试）或启动模拟器
3. 点 ▶ Run，或菜单 Build → Build Bundle(s)/APK(s) → Build APK(s)
4. 产物：`android/app/build/outputs/apk/debug/app-debug.apk`

权限：麦克风（RECORD_AUDIO）、网络（INTERNET）已在 `AndroidManifest.xml` 配好。

## 编译 iOS（需 Mac + Xcode）

> Windows 无法编译 iOS。把整个 appDemo 文件夹拷到 Mac 上：

```bash
npm install
npm run cap:sync
cd ios/App && pod install        # 首次需装 CocoaPods：sudo gem install cocoapods
npx cap open ios                  # 用 Xcode 打开
```

在 Xcode 里配置签名团队（Signing & Capabilities），选真机或模拟器，点 ▶ Run。
权限说明已在 `Info.plist` 配好：`NSMicrophoneUsageDescription`、`NSSpeechRecognitionUsageDescription`。

## 语音输入说明

- **App 内**：调用 `@capacitor-community/speech-recognition` 原生插件
  - Android：用系统 SpeechRecognizer（在线/离线取决于设备）
  - iOS：用 SFSpeechRecognizer
  - 首次使用会弹麦克风 + 语音识别授权
- **浏览器**（`npm run dev` 调试时）：自动 fallback 到 Web Speech API，需 Chrome/Edge + HTTPS/localhost

## 与 englishDemo 的差异

| 项 | englishDemo | appDemo |
|---|---|---|
| 形态 | 纯 Web | Capacitor 原生 App |
| 语音输入 | Web Speech API（手机受限） | 原生插件（手机可用） |
| dev HTTPS | basic-ssl | 不需要（webview 内安全） |
| 翻译 API | 同（MyMemory 免费引擎） | 同 |
