import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import App from './App.vue'
import router from './router'
import './style.css'
import { warmupWebVoices } from '@/utils/audio'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

warmupWebVoices()

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Light }).catch(() => {})
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
  Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {})
}
