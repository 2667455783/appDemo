export {}

declare module 'vue-router' {
  interface RouteMeta {
    tab?: boolean
    public?: boolean
  }
}

declare global {
  interface Window {
    _hmt?: unknown[][]
  }
}

