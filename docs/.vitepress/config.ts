import { defineConfig } from 'vitepress'
import { buildSidebar } from './sidebar'

export default defineConfig({
  srcDir: '.',
  outDir: '../dist/docs',
  cacheDir: '.vitepress/cache',
  base: '/docs/',
  cleanUrls: true,

  srcExclude: [
    '**/README.md',
    '**/README.es.md',
    '**/CONTRIBUTING.md',
    '**/AGENTS.md',
    '**/LICENSE',
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'ALPR Vue',
      description:
        'Browser-based license plate recognition — no server, no account, works offline.',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Quick Start', link: '/quickstart' },
        ],
        sidebar: buildSidebar('en'),
      },
    },
    es: {
      label: 'Español',
      lang: 'es',
      title: 'ALPR Vue',
      description:
        'Reconocimiento de matrículas en el navegador — sin servidor, sin cuenta, funciona offline.',
      themeConfig: {
        nav: [
          { text: 'Inicio', link: '/es/' },
          { text: 'Inicio rápido', link: '/es/quickstart' },
        ],
        sidebar: buildSidebar('es'),
        docFooter: { prev: 'Anterior', next: 'Siguiente' },
        outlineTitle: 'En esta página',
        sidebarMenuLabel: 'Menú',
        returnToTopLabel: 'Volver arriba',
        darkModeSwitchLabel: 'Tema',
        lightModeSwitchTitle: 'Cambiar a modo claro',
        darkModeSwitchTitle: 'Cambiar a modo oscuro',
      },
    },
  },

  themeConfig: {
    logo: '/logo.png',
    socialLinks: [{ icon: 'github', link: 'https://github.com/asiercamara/alpr-vue' }],
    search: { provider: 'local' },
  },

  head: [
    ['link', { rel: 'icon', href: '/docs/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/docs/favicon-32x32.png' }],
  ],
})
