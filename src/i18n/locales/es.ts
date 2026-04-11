/** Spanish locale messages. */
export default {
  app: {
    status: {
      error: 'Error',
      scanning: 'Escaneando',
      waiting: 'Esperando',
    },
    title: {
      cameraError: 'Error de cámara',
      scanning: 'Cámara activa, escaneando...',
      waiting: 'Esperando activación de cámara',
    },
    nav: {
      settings: 'Configuración',
      help: 'Cómo usar',
    },
  },
  camera: {
    error: 'Error de cámara',
    retry: 'Reintentar',
    loading: 'Cargando modelo',
    detection: 'Detección de matrículas',
    closeViewer: 'Cerrar visor',
    scanning: 'Escaneando',
    processingVideo: 'Procesando vídeo',
    analyzed: 'Analizado',
    inactive: 'Cámara desactivada',
    hint: 'Pulsa Iniciar o sube un archivo',
    start: 'Iniciar cámara',
    stop: 'Detener',
    switchCamera: 'Cambiar cámara',
    zoomOut: 'Alejar',
    zoomIn: 'Acercar',
    live: 'En vivo',
  },
  plates: {
    title: 'Matrículas Detectadas',
    export: 'Exportar CSV',
    clear: 'Limpiar',
    empty: 'Sin detecciones',
    emptyHint: 'Activa la cámara o sube una imagen',
  },
  modal: {
    noImage: 'Sin imagen disponible',
    save: 'Guardar',
    cancel: 'Cancelar',
    copy: 'Copiar',
    edit: 'Editar',
    confidence: '{value}% confianza',
    average: 'Promedio general',
    charConfidence: 'Confianza por carácter',
    detected: 'Detectado',
    close: 'Cerrar',
  },
  uploader: {
    upload: 'Subir archivo',
    sample: 'O prueba con una muestra',
  },
  gallery: {
    images: 'Imágenes',
    imgLabel: 'IMG',
    videos: 'Vídeos',
    vidLabel: 'VÍD',
  },
  toast: {
    detected: 'detectada',
  },
  drawer: {
    plates: '{n} matrícula | {n} matrículas',
    noDetections: 'Sin detecciones',
    viewAll: 'Ver todas ↑',
  },
  settings: {
    title: 'Configuración',
    sound: {
      title: 'Sonido y vibración',
      desc: 'Alertar al detectar una matrícula',
    },
    confidence: {
      title: 'Umbral de confianza',
      desc: 'Confianza mínima para aceptar detecciones',
    },
    confirmTime: {
      title: 'Tiempo de confirmación',
      desc: 'Detección sostenida para confirmar matrícula',
    },
    fastConfirm: {
      title: 'Confirmación rápida',
      desc: 'En detecciones de alta confianza',
    },
    continuousScan: {
      title: 'Escaneo continuo',
      desc: 'Si se desactiva, la cámara se detiene al detectar',
    },
    skipDuplicates: {
      title: 'No alertar duplicados',
      desc: 'No pitar ni vibrar si la matrícula ya fue leída',
    },
    theme: {
      title: 'Apariencia',
      desc: 'Modo claro, oscuro o automático',
    },
    language: {
      title: 'Idioma',
      desc: 'Inglés, español o automático según el navegador',
    },
    buttons: {
      light: 'Claro',
      dark: 'Oscuro',
      system: 'Sistema',
      auto: 'Auto',
      close: 'Cerrar',
      resetAll: 'Restaurar todo',
    },
    resetDefault: 'Restaurar valor por defecto',
  },
  help: {
    title: 'Cómo usar',
    step1: 'Activa la cámara para comenzar el escaneo en tiempo real.',
    step2: 'Apunta la cámara directamente a la matrícula del vehículo.',
    step3: 'El sistema detectará automáticamente el texto y lo guardará en el historial.',
    close: 'Entendido',
  },
  errors: {
    camera: {
      denied: 'Permiso de cámara denegado',
      notFound: 'No se encontró cámara disponible',
    },
    model: 'No se pudo cargar el modelo de detección',
  },
}
