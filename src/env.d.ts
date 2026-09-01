export {}

declare module 'vue-router' {
  interface RouteMeta {
    tab?: boolean
    public?: boolean
  }
}
