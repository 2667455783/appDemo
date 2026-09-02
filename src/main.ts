import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
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
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
  Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {})
}
