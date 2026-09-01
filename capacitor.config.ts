import type { CapacitorConfig } from '@capacitor/core'

const config: CapacitorConfig = {
  appId: 'com.englishdemo.app',
  appName: '英语备考',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: true,
  },
}

export default config
