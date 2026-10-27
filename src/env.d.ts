/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_VERSION_CODE: string
  /** 真机/生产后端根地址，如 http://192.168.1.8:8080；开发留空走 Vite /api 代理 */
  readonly VITE_API_BASE?: string
  /** 可选：真机直连 Gitee API 时用；浏览器开发请用 backend/.env 的 GITEE_ACCESS_TOKEN */
  readonly VITE_GITEE_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}

declare module 'vue-router' {
  interface RouteMeta {
    tab?: boolean
    public?: boolean
  }
}

declare module '*?url' {
  const src: string
  export default src
}

declare module '*?raw' {
  const src: string
  export default src
}

declare module '@babel/standalone' {
  const Babel: {
    transform: (
      code: string,
      options?: Record<string, unknown>,
    ) => { code: string | null | undefined }
  }
  export default Babel
}

declare global {
  interface Window {
    _hmt?: unknown[][]
  }
}

