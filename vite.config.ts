import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type ProxyOptions } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

/** 与 android/app/build.gradle versionCode 保持一致，发版时同步 +1 */
const APP_VERSION_CODE = 28

/** 电脑试听百度：浏览器直连会被 Origin: localhost 拦成空响应 */
const baiduTtsProxy: Record<string, ProxyOptions> = {
  '/baidu-tts': {
    target: 'https://fanyi.baidu.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/baidu-tts/, '/gettts'),
    headers: {
      Referer: 'https://fanyi.baidu.com/',
      Origin: 'https://fanyi.baidu.com',
    },
  },
}

export default defineConfig({
  plugins: [vue()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    'import.meta.env.VITE_APP_VERSION_CODE': JSON.stringify(String(APP_VERSION_CODE)),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8000,
    host: true,
    proxy: baiduTtsProxy,
  },
  preview: {
    proxy: baiduTtsProxy,
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
})
