interface SidebarItem {
  key: string
  baseLink: string
}

interface SidebarSection {
  key: string
  items: SidebarItem[]
}

const sections: SidebarSection[] = [
  {
    key: 'get_started',
    items: [
      { key: 'introduction', baseLink: '/introduction' },
      { key: 'quickstart', baseLink: '/quickstart' },
      { key: 'browser_requirements', baseLink: '/browser-requirements' },
    ],
  },
  {
    key: 'using_the_app',
    items: [
      { key: 'camera_mode', baseLink: '/camera-mode' },
      { key: 'upload_files', baseLink: '/upload-files' },
      { key: 'viewing_results', baseLink: '/viewing-results' },
      { key: 'exporting_data', baseLink: '/exporting-data' },
    ],
  },
  {
    key: 'settings',
    items: [
      { key: 'settings_overview', baseLink: '/settings-overview' },
      { key: 'detection_settings', baseLink: '/detection-settings' },
      { key: 'appearance_language', baseLink: '/appearance-language' },
    ],
  },
  {
    key: 'how_it_works_section',
    items: [
      { key: 'how_it_works', baseLink: '/how-it-works' },
      { key: 'ai_models', baseLink: '/ai-models' },
      { key: 'privacy', baseLink: '/privacy' },
    ],
  },
  {
    key: 'troubleshooting_section',
    items: [
      { key: 'troubleshooting', baseLink: '/troubleshooting' },
      { key: 'faq', baseLink: '/faq' },
    ],
  },
]

type TranslationKey =
  | 'get_started'
  | 'using_the_app'
  | 'settings'
  | 'how_it_works_section'
  | 'troubleshooting_section'
  | 'introduction'
  | 'quickstart'
  | 'browser_requirements'
  | 'camera_mode'
  | 'upload_files'
  | 'viewing_results'
  | 'exporting_data'
  | 'settings_overview'
  | 'detection_settings'
  | 'appearance_language'
  | 'how_it_works'
  | 'ai_models'
  | 'privacy'
  | 'troubleshooting'
  | 'faq'

type Translations = Record<TranslationKey, string>

const i18n: Record<string, Translations> = {
  en: {
    get_started: 'Get Started',
    using_the_app: 'Using the App',
    settings: 'Settings',
    how_it_works_section: 'How It Works',
    troubleshooting_section: 'Troubleshooting',
    introduction: 'ALPR Vue: Read License Plates Directly in Browser',
    quickstart: 'Get Started with ALPR Vue',
    browser_requirements: 'Supported Browsers and Device Requirements',
    camera_mode: 'Detect License Plates Live with Your Camera',
    upload_files: 'Upload Images and Videos for Plate Recognition',
    viewing_results: 'View and Edit Detected License Plates',
    exporting_data: 'Export License Plate Detections to CSV',
    settings_overview: 'Configuring ALPR Vue Settings',
    detection_settings: 'Tuning Detection Sensitivity and Timing',
    appearance_language: 'Theme and Language Preferences',
    how_it_works: 'How ALPR Vue Detects and Reads License Plates',
    ai_models: 'AI Models Used for License Plate Recognition',
    privacy: 'Privacy and Data: What Stays on Your Device',
    faq: 'Frequently Asked Questions About ALPR Vue',
    troubleshooting: 'Troubleshooting',
  },
  es: {
    get_started: 'Primeros pasos',
    using_the_app: 'Usar la aplicación',
    settings: 'Ajustes',
    how_it_works_section: 'Cómo funciona',
    troubleshooting_section: 'Solución de problemas',
    introduction: 'ALPR Vue: Lee Matrículas Directamente en el Navegador',
    quickstart: 'Primeros pasos con ALPR Vue',
    browser_requirements: 'Navegadores Compatibles y Requisitos del Dispositivo',
    camera_mode: 'Detectar Matrículas en Vivo con la Cámara',
    upload_files: 'Cargar Imágenes y Vídeos para el Reconocimiento de Matrículas',
    viewing_results: 'Ver y Editar las Matrículas Detectadas',
    exporting_data: 'Exportar Detecciones de Matrículas a CSV',
    settings_overview: 'Configurar los Ajustes de ALPR Vue',
    detection_settings: 'Ajustar la Sensibilidad y el Tiempo de Detección',
    appearance_language: 'Preferencias de Tema e Idioma',
    how_it_works: 'Cómo Detecta y Lee Matrículas ALPR Vue',
    ai_models: 'Modelos de IA para el Reconocimiento de Matrículas',
    privacy: 'Privacidad y Datos: Lo Que Queda en Tu Dispositivo',
    faq: 'Preguntas Frecuentes sobre ALPR Vue',
    troubleshooting: 'Solución de problemas',
  },
}

export function buildSidebar(locale: string) {
  const t = i18n[locale] ?? i18n.en
  const prefix = locale === 'en' ? '' : `/${locale}`
  return sections.map((section) => ({
    text: t[section.key as TranslationKey],
    items: section.items.map((item) => ({
      text: t[item.key as TranslationKey],
      link: `${prefix}${item.baseLink}`,
    })),
  }))
}
