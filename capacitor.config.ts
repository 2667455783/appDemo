import type { CapacitorConfig } from '@capacitor/core'

const config: CapacitorConfig = {
  // 保持 appId 不变，避免已安装用户无法覆盖更新
  appId: 'com.englishdemo.app',
  appName: '学习宝典',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // 允许 WebView 请求明文 HTTP（更新包 / 线上 API）
    cleartext: true,
  },
  android: {
    // App 页面是 https://localhost，API 是 http://IP → 必须允许混合内容，否则 fetch 报 Failed to fetch
    allowMixedContent: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_reminder',
      iconColor: '#1f4d3a',
    },
  },
}

export default config
