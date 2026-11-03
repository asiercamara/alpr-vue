import { withAppDocs } from 'vitepress-theme-app-docs/config'
import { buildSidebar } from './sidebar'

export default withAppDocs({
  srcDir: '.',
  outDir: '../dist/docs',
  cacheDir: '.vitepress/cache',
  base: '/docs/',
  cleanUrls: true,
  ignoreDeadLinks: true,

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
    search: {
      provider: 'local',
      options: {
        // An empty aria-label makes the button take its name from its visible
        // text ("Search Ctrl K"). VitePress' default label is just "Search",
        // which axe flags under WCAG 2.5.3 (label-content-name-mismatch).
        translations: { button: { buttonText: 'Search', buttonAriaLabel: '' } },
        locales: {
          es: {
            translations: {
              button: { buttonText: 'Buscar', buttonAriaLabel: '' },
              modal: {
                displayDetails: 'Mostrar lista detallada',
                resetButtonTitle: 'Borrar búsqueda',
                backButtonTitle: 'Cerrar búsqueda',
                noResultsText: 'No hay resultados para',
                footer: {
                  selectText: 'para seleccionar',
                  navigateText: 'para navegar',
                  closeText: 'para cerrar',
                },
              },
            },
          },
        },
      },
    },
    mergeDocs: { enabled: true },
    // Language flags are opt-in since 1.0 (the 0.9 theme always showed them).
    languageFlags: true,
  },

  head: [
    ['link', { rel: 'icon', href: '/docs/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/docs/favicon-32x32.png' }],
  ],
})
