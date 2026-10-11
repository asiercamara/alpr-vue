/// <reference types="vite/client" />

/** App version from package.json, injected by Vite at build time. */
declare const __APP_VERSION__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
