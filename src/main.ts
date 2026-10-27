import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import App from './App.vue'
import router from './router'
import './style.css'
import { syncOnLaunch } from '@/api/bootstrap'
import { warmupWebVoices } from '@/utils/audio'
import { initTracking } from '@/utils/tracking/tracking-init'
import { installVConsoleGesture } from '@/utils/vconsoleGesture'

initTracking()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.mount('#app')

installVConsoleGesture()
warmupWebVoices()
void syncOnLaunch()

if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
  Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {})
}
