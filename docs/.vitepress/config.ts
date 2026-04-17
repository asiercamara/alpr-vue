import { defineConfig } from 'vitepress'

const enSidebar = [
  {
    text: 'Get Started',
    items: [
      { text: 'ALPR Vue: Read License Plates Directly in Browser', link: '/introduction' },
      { text: 'Get Started with ALPR Vue', link: '/quickstart' },
      { text: 'Supported Browsers and Device Requirements', link: '/browser-requirements' },
    ],
  },
  {
    text: 'Using the App',
    items: [
      { text: 'Detect License Plates Live with Your Camera', link: '/camera-mode' },
      { text: 'Upload Images and Videos for Plate Recognition', link: '/upload-files' },
      { text: 'View and Edit Detected License Plates', link: '/viewing-results' },
      { text: 'Export License Plate Detections to CSV', link: '/exporting-data' },
    ],
  },
  {
    text: 'Settings',
    items: [
      { text: 'Configuring ALPR Vue Settings', link: '/settings-overview' },
      { text: 'Tuning Detection Sensitivity and Timing', link: '/detection-settings' },
      { text: 'Theme and Language Preferences', link: '/appearance-language' },
    ],
  },
  {
    text: 'How It Works',
    items: [
      { text: 'How ALPR Vue Detects and Reads License Plates', link: '/how-it-works' },
      { text: 'AI Models Used for License Plate Recognition', link: '/ai-models' },
      { text: 'Privacy and Data: What Stays on Your Device', link: '/privacy' },
    ],
  },
  {
    text: 'Troubleshooting',
    items: [
      { text: 'Troubleshooting ALPR Vue Issues', link: '/troubleshooting' },
      { text: 'Frequently Asked Questions About ALPR Vue', link: '/faq' },
    ],
  },
]

const esSidebar = [
  {
    text: 'Primeros pasos',
    items: [
      { text: 'ALPR Vue: Lee Matrículas Directamente en el Navegador', link: '/es/introduction' },
      { text: 'Primeros pasos con ALPR Vue', link: '/es/quickstart' },
      {
        text: 'Navegadores Compatibles y Requisitos del Dispositivo',
        link: '/es/browser-requirements',
      },
    ],
  },
  {
    text: 'Usar la aplicación',
    items: [
      { text: 'Detectar Matrículas en Vivo con la Cámara', link: '/es/camera-mode' },
      {
        text: 'Cargar Imágenes y Vídeos para el Reconocimiento de Matrículas',
        link: '/es/upload-files',
      },
      { text: 'Ver y Editar las Matrículas Detectadas', link: '/es/viewing-results' },
      { text: 'Exportar Detecciones de Matrículas a CSV', link: '/es/exporting-data' },
    ],
  },
  {
    text: 'Ajustes',
    items: [
      { text: 'Configurar los Ajustes de ALPR Vue', link: '/es/settings-overview' },
      { text: 'Ajustar la Sensibilidad y el Tiempo de Detección', link: '/es/detection-settings' },
      { text: 'Preferencias de Tema e Idioma', link: '/es/appearance-language' },
    ],
  },
  {
    text: 'Cómo funciona',
    items: [
      { text: 'Cómo Detecta y Lee Matrículas ALPR Vue', link: '/es/how-it-works' },
      { text: 'Modelos de IA para el Reconocimiento de Matrículas', link: '/es/ai-models' },
      { text: 'Privacidad y Datos: Lo Que Queda en Tu Dispositivo', link: '/es/privacy' },
    ],
  },
  {
    text: 'Solución de problemas',
    items: [
      { text: 'Solución de Problemas de ALPR Vue', link: '/es/troubleshooting' },
      { text: 'Preguntas Frecuentes sobre ALPR Vue', link: '/es/faq' },
    ],
  },
]

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
        sidebar: enSidebar,
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
        sidebar: esSidebar,
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
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
  ],
})
