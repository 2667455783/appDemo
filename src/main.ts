import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// App 内原生体验适配
if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Light }).catch(() => {})
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
  Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {})
}
