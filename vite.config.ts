import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type ProxyOptions } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

/** 与 android/app/build.gradle versionCode 保持一致，发版时同步 +1 */
const APP_VERSION_CODE = 30

/** 从 backend/.env 或进程环境读取（不进前端包，只给 Vite 代理用） */
function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf-8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

const backendEnv = loadEnvFile(fileURLToPath(new URL('./backend/.env', import.meta.url)))
const GITEE_ACCESS_TOKEN =
  process.env.GITEE_ACCESS_TOKEN || backendEnv.GITEE_ACCESS_TOKEN || process.env.VITE_GITEE_TOKEN || ''

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

/** 开发环境拉 Git 仓：绕过浏览器 CORS；Gitee api/v5 自动附加 access_token */
const gitApiProxy: Record<string, ProxyOptions> = {
  '/git-proxy/github': {
    target: 'https://api.github.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/git-proxy\/github/, ''),
  },
  '/git-proxy/github-raw': {
    target: 'https://raw.githubusercontent.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/git-proxy\/github-raw/, ''),
  },
  '/git-proxy/gitee': {
    target: 'https://gitee.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/git-proxy\/gitee/, ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        if (!GITEE_ACCESS_TOKEN) return
        const path = proxyReq.path || ''
        // 仅给 Open API 加 token；raw 网页路径不加
        if (!path.includes('/api/v5/')) return
        if (path.includes('access_token=')) return
        const sep = path.includes('?') ? '&' : '?'
        proxyReq.path = `${path}${sep}access_token=${encodeURIComponent(GITEE_ACCESS_TOKEN)}`
      })
    },
  },
  '/git-proxy/gitlab': {
    target: 'https://gitlab.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/git-proxy\/gitlab/, ''),
  },
}

if (GITEE_ACCESS_TOKEN) {
  console.info('[vite] Gitee access_token 已加载（仅代理注入，不进前端包）')
} else {
  console.warn(
    '[vite] 未配置 GITEE_ACCESS_TOKEN：Gitee 匿名易 403 限流。请写入 backend/.env 后重启 npm run dev',
  )
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
    proxy: {
      ...baiduTtsProxy,
      ...gitApiProxy,
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
    headers: {
      'Permissions-Policy':
        'unload=*, clipboard-read=*, clipboard-write=*, cross-origin-isolated=*',
    },
  },
  preview: {
    proxy: {
      ...baiduTtsProxy,
      ...gitApiProxy,
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
    headers: {
      'Permissions-Policy':
        'unload=*, clipboard-read=*, clipboard-write=*, cross-origin-isolated=*',
    },
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
    // 本地运行按需加载；预先打包，避免首次点击时 dev 整页重载
    include: ['vue/compiler-sfc'],
  },
})
