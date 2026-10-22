import type { CapacitorConfig } from '@capacitor/core'

const config: CapacitorConfig = {
  // 保持 appId 不变，避免已安装用户无法覆盖更新
  appId: 'com.englishdemo.app',
  appName: '学习宝典',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_reminder',
      iconColor: '#1f4d3a',
    },
  },
}

export default config
