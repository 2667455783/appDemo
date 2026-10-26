/**
 * uni-app 本地运行兼容（精简 H5 壳）：
 * - 读 pages.json 做页面切换与 tabBar
 * - 注册 view / text / image 等标签
 * - 提供 uni.request / 路由 / Toast / Storage
 * - 不跑官方 @dcloudio 构建，复杂原生能力会降级
 */

export type UniPageMeta = {
  path: string
  file: string
  title: string
  navBg: string
  navColor: string
}

export type UniCompatPlan = {
  entry: string
  virtualFiles: Record<string, string>
  pages: UniPageMeta[]
  warning: string
}

type PagesJson = {
  pages?: { path: string; style?: Record<string, string> }[]
  tabBar?: {
    color?: string
    selectedColor?: string
    backgroundColor?: string
    list?: { pagePath: string; text: string; iconPath?: string; selectedIconPath?: string }[]
  }
  globalStyle?: Record<string, string>
}

const ENTRY = '__localrun_uni_entry.js'
const SHIM = '__localrun_uni_shim.js'

/** 给 @dcloudio/* 用的空模块，避免去 esm.sh 拉巨型包 */
export const DCLOUD_STUB_CJS = `'use strict'; module.exports = {}; module.exports.default = {};`

export function isUniAppProject(files: Record<string, string>, pkgDeps: Record<string, string> = {}): boolean {
  if (Object.keys(pkgDeps).some((k) => k.startsWith('@dcloudio/'))) return true
  const pkg = files['package.json'] ?? ''
  if (/@dcloudio\/|vite-plugin-uni|"uni-app"/i.test(pkg)) return true
  if (files['pages.json'] != null || files['src/pages.json'] != null) return true
  const main = files['src/main.js'] ?? files['src/main.ts'] ?? ''
  return /createSSRApp/.test(main) && /export\s+function\s+createApp/.test(main)
}

/** 750 设计稿：rpx → vw */
export function convertRpx(css: string): string {
  return css.replace(/(-?\d*\.?\d+)rpx\b/g, (_, n: string) => {
    const v = parseFloat(n)
    if (!Number.isFinite(v)) return `${n}px`
    if (v === 0) return '0'
    return `${(v * 100) / 750}vw`
  })
}

function findPageFile(files: Record<string, string>, pagePath: string): string | null {
  const clean = pagePath.replace(/^\//, '')
  const candidates = [
    `src/${clean}.vue`,
    `src/${clean}.nvue`,
    `${clean}.vue`,
    `src/${clean}/index.vue`,
    `${clean}/index.vue`,
  ]
  return candidates.find((p) => files[p] != null) ?? null
}

function parsePagesJson(files: Record<string, string>): PagesJson {
  const raw = files['src/pages.json'] ?? files['pages.json'] ?? '{}'
  try {
    const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    return JSON.parse(cleaned) as PagesJson
  } catch {
    return {}
  }
}

function assetUrl(assetBase: string | undefined, rel: string): string {
  if (!assetBase || !rel) return ''
  const clean = rel.replace(/^\//, '')
  const underSrc = clean.startsWith('src/') ? clean : `src/${clean}`
  return assetBase + underSrc.split('/').map(encodeURIComponent).join('/')
}

export function buildUniCompatPlan(
  files: Record<string, string>,
  assetBase?: string,
): UniCompatPlan | null {
  if (!isUniAppProject(files)) return null

  const cfg = parsePagesJson(files)
  const global = cfg.globalStyle ?? {}
  const pages: UniPageMeta[] = []

  for (const p of cfg.pages ?? []) {
    if (!p?.path) continue
    const file = findPageFile(files, p.path)
    if (!file) continue
    pages.push({
      path: p.path.replace(/^\//, ''),
      file,
      title: p.style?.navigationBarTitleText || global.navigationBarTitleText || '',
      navBg: p.style?.navigationBarBackgroundColor || global.navigationBarBackgroundColor || '#000000',
      navColor: (p.style?.navigationBarTextStyle || global.navigationBarTextStyle) === 'white' ? '#fff' : '#000',
    })
  }

  if (!pages.length) {
    for (const path of Object.keys(files)) {
      const m = path.match(/^src\/(pages\/.+)\.vue$/i)
      if (!m) continue
      pages.push({
        path: m[1]!,
        file: path,
        title: m[1]!.split('/').pop() || '',
        navBg: global.navigationBarBackgroundColor || '#4facfe',
        navColor: '#fff',
      })
    }
  }

  const tabs = (cfg.tabBar?.list ?? [])
    .filter((t) => t?.pagePath)
    .map((t) => ({
      pagePath: t.pagePath.replace(/^\//, ''),
      text: t.text || '',
      icon: assetUrl(assetBase, t.iconPath || ''),
      iconActive: assetUrl(assetBase, t.selectedIconPath || ''),
    }))

  const tabBar = {
    color: cfg.tabBar?.color || '#999',
    selectedColor: cfg.tabBar?.selectedColor || '#4facfe',
    backgroundColor: cfg.tabBar?.backgroundColor || '#fff',
    list: tabs,
  }

  if (!pages.length) {
    return {
      entry: ENTRY,
      virtualFiles: {
        [ENTRY]: `import { createApp, h } from 'vue'
createApp({
  render: () => h('div', { style: 'padding:24px;font-family:sans-serif' }, 'uni-app：未找到 pages')
}).mount('#app')
`,
      },
      pages: [],
      warning: 'uni-app 兼容模式：未找到可渲染页面',
    }
  }

  const importLines = pages
    .map((p, i) => `import __P${i} from ${JSON.stringify('./' + p.file)}`)
    .join('\n')

  const pageArray = pages
    .map(
      (p, i) =>
        `{ path: ${JSON.stringify(p.path)}, component: __P${i}, title: ${JSON.stringify(p.title)}, navBg: ${JSON.stringify(p.navBg)}, navColor: ${JSON.stringify(p.navColor)} }`,
    )
    .join(',\n  ')

  const shimSrc = `import { h, defineComponent } from 'vue'

export function registerTags(app) {
  const make = (name, tagName) => {
    app.component(name, defineComponent({
      name,
      inheritAttrs: true,
      setup(_, ctx) {
        return () => h(tagName, ctx.attrs, ctx.slots.default ? ctx.slots.default() : undefined)
      },
    }))
  }
  ;[
    ['view', 'div'], ['View', 'div'],
    ['text', 'span'], ['Text', 'span'],
    ['image', 'img'], ['Image', 'img'],
    ['scroll-view', 'div'], ['ScrollView', 'div'],
    ['swiper', 'div'], ['swiper-item', 'div'],
    ['navigator', 'a'], ['rich-text', 'div'],
    ['picker', 'div'], ['label', 'label'], ['form', 'form'],
    ['icon', 'i'], ['progress', 'progress'],
    ['checkbox-group', 'div'], ['radio-group', 'div'],
  ].forEach(([a, b]) => make(a, b))
}
`

  const entry = `${importLines}
import { createSSRApp, h, ref, computed, defineComponent, onMounted } from 'vue'
import { registerTags } from './${SHIM}'

const pages = [
  ${pageArray}
]
const tabBar = ${JSON.stringify(tabBar)}

const route = ref(pages[0].path)
const stack = ref([pages[0].path])
const toast = ref(null)

function norm(url) {
  if (!url) return pages[0].path
  let u = String(url).split('?')[0].replace(/^\\//, '')
  const i = u.indexOf('pages/')
  if (i > 0) u = u.slice(i)
  return u
}

function go(url, replace) {
  const path = norm(url)
  if (!pages.some((p) => p.path === path)) {
    console.warn('[uni] 页面不存在', url)
    return
  }
  if (replace) stack.value = [path]
  else stack.value = stack.value.concat([path])
  route.value = path
}

const storage = window.localStorage
const sk = (k) => 'uni:' + k
const uniApi = {
  navigateTo: (o) => go(o && o.url, false),
  redirectTo: (o) => go(o && o.url, true),
  reLaunch: (o) => go(o && o.url, true),
  switchTab: (o) => go(o && o.url, true),
  navigateBack: (o) => {
    let delta = (o && o.delta) || 1
    const next = stack.value.slice()
    while (delta-- > 0 && next.length > 1) next.pop()
    stack.value = next
    route.value = next[next.length - 1]
  },
  showToast: (o) => {
    toast.value = { title: (o && o.title) || '', icon: (o && o.icon) || 'none' }
    clearTimeout(uniApi.__t)
    uniApi.__t = setTimeout(() => { toast.value = null }, (o && o.duration) || 1500)
  },
  hideToast: () => { toast.value = null },
  showLoading: (o) => uniApi.showToast({ title: (o && o.title) || '加载中', icon: 'none', duration: 60000 }),
  hideLoading: () => uniApi.hideToast(),
  setStorageSync: (k, v) => {
    try { storage.setItem(sk(k), typeof v === 'string' ? v : JSON.stringify(v)) } catch (e) {}
  },
  getStorageSync: (k) => {
    try {
      const raw = storage.getItem(sk(k))
      if (raw == null || raw === '') return ''
      try { return JSON.parse(raw) } catch (e) { return raw }
    } catch (e) { return '' }
  },
  removeStorageSync: (k) => { try { storage.removeItem(sk(k)) } catch (e) {} },
  clearStorageSync: () => {
    try {
      Object.keys(storage).forEach((k) => { if (k.startsWith('uni:')) storage.removeItem(k) })
    } catch (e) {}
  },
  getSystemInfoSync: () => ({
    platform: 'h5',
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
  }),
  request: (o) => {
    o = o || {}
    const method = String(o.method || 'GET').toUpperCase()
    let url = o.url || ''
    const data = o.data || {}
    const headers = Object.assign({ 'Content-Type': 'application/json' }, o.header || {})
    let body
    if (method === 'GET' || method === 'HEAD') {
      const q = Object.keys(data)
        .filter((k) => data[k] != null)
        .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(data[k]))
      if (q.length) url += (url.includes('?') ? '&' : '?') + q.join('&')
    } else {
      body = typeof data === 'string' ? data : JSON.stringify(data)
    }
    return fetch(url, { method, headers, body })
      .then((r) => r.text().then((text) => {
        let parsed = text
        try { parsed = JSON.parse(text) } catch (e) {}
        const res = { statusCode: r.status, data: parsed, header: {}, errMsg: 'request:ok' }
        if (typeof o.success === 'function') o.success(res)
        if (typeof o.complete === 'function') o.complete(res)
        return res
      }))
      .catch((err) => {
        if (typeof o.fail === 'function') o.fail(err)
        if (typeof o.complete === 'function') o.complete(err)
        throw err
      })
  },
}
window.uni = uniApi
globalThis.uni = uniApi

const current = computed(() => pages.find((p) => p.path === route.value) || pages[0])
const showTab = computed(() => !!(tabBar.list && tabBar.list.some((t) => t.pagePath === route.value)))

const Shell = defineComponent({
  name: 'UniShell',
  setup() {
    onMounted(() => {
      try { console.log('[uni] localrun H5 shell ready') } catch (e) {}
    })
    return () => {
      const page = current.value
      const Comp = page.component
      return h(
        'div',
        {
          class: 'uni-shell',
          style: {
            minHeight: '100vh',
            background: '#f5f5f5',
            paddingBottom: showTab.value ? '56px' : '0',
          },
        },
        [
          h(
            'div',
            {
              class: 'uni-nav',
              style: {
                position: 'sticky',
                top: '0',
                zIndex: '10',
                height: '44px',
                lineHeight: '44px',
                textAlign: 'center',
                background: page.navBg,
                color: page.navColor,
                fontWeight: '600',
                fontSize: '16px',
              },
            },
            page.title || '',
          ),
          h('div', { class: 'uni-page', style: { minHeight: 'calc(100vh - 44px)' } }, [
            h(Comp, { key: page.path }),
          ]),
          showTab.value
            ? h(
                'div',
                {
                  class: 'uni-tabbar',
                  style: {
                    position: 'fixed',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    height: '56px',
                    display: 'flex',
                    background: tabBar.backgroundColor,
                    borderTop: '1px solid #eee',
                    zIndex: '20',
                  },
                },
                tabBar.list.map((t) => {
                  const on = t.pagePath === route.value
                  const icon = on ? t.iconActive || t.icon : t.icon
                  return h(
                    'div',
                    {
                      key: t.pagePath,
                      style: {
                        flex: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: on ? tabBar.selectedColor : tabBar.color,
                        fontSize: '11px',
                        cursor: 'pointer',
                      },
                      onClick: () => go(t.pagePath, true),
                    },
                    [
                      icon
                        ? h('img', {
                            src: icon,
                            style: { width: '24px', height: '24px', marginBottom: '2px' },
                          })
                        : null,
                      h('span', null, t.text || ''),
                    ],
                  )
                }),
              )
            : null,
          toast.value
            ? h(
                'div',
                {
                  style: {
                    position: 'fixed',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,.78)',
                    color: '#fff',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    zIndex: '99',
                    fontSize: '14px',
                    maxWidth: '70vw',
                    textAlign: 'center',
                  },
                },
                toast.value.title,
              )
            : null,
        ],
      )
    }
  },
})

const app = createSSRApp(Shell)
registerTags(app)
app.mixin({
  created() {
    if (typeof this.$options.onLaunch === 'function') {
      try { this.$options.onLaunch.call(this, {}) } catch (e) { console.warn(e) }
    }
  },
  mounted() {
    if (typeof this.$options.onShow === 'function') {
      try { this.$options.onShow.call(this, {}) } catch (e) { console.warn(e) }
    }
  },
})
app.mount('#app')
`

  return {
    entry: ENTRY,
    virtualFiles: {
      [ENTRY]: entry,
      [SHIM]: shimSrc,
    },
    pages,
    warning: `uni-app 兼容模式：已用简易 H5 壳渲染 ${pages.length} 个页面（非官方 @dcloudio 构建）`,
  }
}
