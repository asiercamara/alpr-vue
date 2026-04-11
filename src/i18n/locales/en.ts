/** English locale messages. */
export default {
  app: {
    status: {
      error: 'Error',
      scanning: 'Scanning',
      waiting: 'Waiting',
    },
    title: {
      cameraError: 'Camera error',
      scanning: 'Camera active, scanning...',
      waiting: 'Waiting for camera activation',
    },
    nav: {
      settings: 'Settings',
      help: 'How to use',
    },
  },
  camera: {
    error: 'Camera error',
    retry: 'Retry',
    loading: 'Loading model',
    detection: 'License plate detection',
    closeViewer: 'Close viewer',
    scanning: 'Scanning',
    processingVideo: 'Processing video',
    analyzed: 'Analyzed',
    inactive: 'Camera off',
    hint: 'Press Start or upload a file',
    start: 'Start camera',
    stop: 'Stop',
    switchCamera: 'Switch camera',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    live: 'Live',
  },
  plates: {
    title: 'Detected Plates',
    export: 'Export CSV',
    clear: 'Clear',
    empty: 'No detections',
    emptyHint: 'Enable the camera or upload an image',
  },
  modal: {
    noImage: 'No image available',
    save: 'Save',
    cancel: 'Cancel',
    copy: 'Copy',
    edit: 'Edit',
    confidence: '{value}% confidence',
    average: 'Overall average',
    charConfidence: 'Confidence per character',
    detected: 'Detected',
    close: 'Close',
  },
  uploader: {
    upload: 'Upload file',
    sample: 'Or try a sample',
  },
  gallery: {
    images: 'Images',
    imgLabel: 'IMG',
    videos: 'Videos',
    vidLabel: 'VID',
  },
  toast: {
    detected: 'detected',
  },
  drawer: {
    plates: '{n} plate | {n} plates',
    noDetections: 'No detections',
    viewAll: 'View all ↑',
  },
  settings: {
    title: 'Settings',
    sound: {
      title: 'Sound & vibration',
      desc: 'Alert when a plate is detected',
    },
    confidence: {
      title: 'Confidence threshold',
      desc: 'Minimum confidence to accept detections',
    },
    confirmTime: {
      title: 'Confirmation time',
      desc: 'Sustained detection to confirm plate',
    },
    fastConfirm: {
      title: 'Fast confirmation',
      desc: 'On high-confidence detections',
    },
    continuousScan: {
      title: 'Continuous scan',
      desc: 'If disabled, camera stops on detection',
    },
    skipDuplicates: {
      title: 'Skip duplicate alerts',
      desc: "Don't beep or vibrate if plate already read",
    },
    theme: {
      title: 'Appearance',
      desc: 'Light, dark or automatic mode',
    },
    language: {
      title: 'Language',
      desc: 'English, Spanish or automatic from browser',
    },
    buttons: {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      auto: 'Auto',
      close: 'Close',
      resetAll: 'Reset all',
    },
    resetDefault: 'Restore default value',
  },
  help: {
    title: 'How to use',
    step1: 'Enable the camera to start real-time scanning.',
    step2: 'Point the camera directly at the vehicle license plate.',
    step3: 'The system will automatically detect the text and save it to history.',
    close: 'Got it',
  },
  errors: {
    camera: {
      denied: 'Camera permission denied',
      notFound: 'No camera found',
    },
    model: 'Failed to load detection model',
  },
}
