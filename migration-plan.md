# Plan de Migración y Mejora: ALPR Web → Vue 3

## Resumen ejecutivo

Migración de una aplicación ALPR (Reconocimiento Automático de Matrículas) de vanilla JavaScript a Vue 3 + Pinia + Tailwind CSS + ONNX Runtime Web. La app corre 100% en el navegador, sin backend, usando Web Workers para no bloquear el hilo principal.

**Estado actual**: La arquitectura está esbozada pero el pipeline end-to-end está desconectado. La app arranca visualmente pero no detecta matrículas.

---

## Análisis del proyecto de referencia (`alpr_web`)

### Pipeline completo (referencia)

```
[Imagen/Vídeo/Cámara]
        ↓
  createImageBitmap(canvas)          ← Main thread
        ↓  (transferencia zero-copy)
  Worker recibe ImageBitmap
        ↓
  prepare_input()                    ← OffscreenCanvas 384×384, planar RGB Float32
        ↓
  run_model() → YOLOv9              ← Tensor [1,3,384,384], output [N,7]
        ↓
  process_output_boxes()            ← Filtro conf>0.6, NMS IoU>0.7, escala coords
        ↓
  cropImage() por cada box          ← OffscreenCanvas → ImageBitmap del recorte
        ↓
  recognizePlateText()              ← OCR: grayscale [1,70,140,1] Uint8
        ↓
  postMessage(boxes)                ← Array con {x1,y1,x2,y2,confidence,croppedImage,plateText:{text,confidence[]}}
        ↓
  draw_boxes() en canvas            ← Main thread dibuja overlays
        ↓
  evaluatePlateQuality()            ← Filtro calidad: longitud + conf + formato
        ↓
  addPlateDetection()               ← Deduplicación por similitud Levenshtein ≥0.8
        ↓
  Pinia store / UI actualizada
```

### Formatos de tensores clave

| Modelo | Entrada | Salida |
|---|---|---|
| YOLOv9 | Float32[1,3,384,384] planar RGB 0–1 | Float32[N,7]: classId,x1,y1,x2,y2,?,conf |
| MobileViT v2 OCR | Uint8[1,70,140,1] grayscale 0–255 | Float32[9×38] flat → reshape [9][38] argmax |

### Configuración OCR (`european_mobile_vit_v2_ocr_config.json`)
```json
{
  "alphabet": "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-",
  "max_plate_slots": 9,
  "pad_char": "-",
  "img_width": 140,
  "img_height": 70
}
```

### Umbrales del sistema de referencia

| Parámetro | Valor | Dónde |
|---|---|---|
| Confianza mínima YOLO (worker) | 0.6 | `detectionProcessor.js:42` |
| Confianza mínima canvas (main) | 0.7 | `detector.js:43` |
| NMS IoU threshold | 0.7 | `boundingBoxUtils.js:20` |
| Similitud texto para agrupar | 0.8 | `plateStorage.js:10` |
| Score mínimo calidad placa | 0.7 | `validation.js:110` |
| Detecciones consecutivas (auto-stop cámara) | 10 | `plateStorage.js:12` |
| Timeout reset contador consecutivo | 5000ms | `plateStorage.js:11` |
| Intervalo frame processing | 20ms | `media.js:269` |

### Lógica de deduplicación (crítica)

```
addPlateDetection(plateData)
  → genera uniqueId
  → en modo cámara: processForCameraMode() → contador por texto
  → groupSimilarDetections():
      para cada grupo existente:
        calculateTextSimilarity(nuevo.text, grupo.mainText)
        si similitud >= 0.8 → añadir como variante
        actualizar mainText si la variante es más frecuente
      si ningún grupo coincide → crear nuevo grupo
  → estructura: { mainText, totalOccurrences, variants[], variantTexts[], confidenceMean }

getBestPlateDetections(limit=10)
  → ordena grupos por ocurrencias desc, luego confianza desc
  → devuelve la mejor variante de cada grupo con .occurrences
```

---

## Inventario del proyecto Vue (`my-vue-app`)

### ✅ Correcto y completo

| Archivo | Estado |
|---|---|
| `src/main.js` | OK – Pinia inicializada correctamente |
| `src/App.vue` | OK – Layout grid responsivo, header, componentes importados |
| `src/components/ui/CameraPreview.vue` | OK – Template con video+canvas overlay, controles |
| `src/components/ui/PlateList.vue` | OK – Template con `transition-group`, estructura de datos correcta |
| `src/stores/plateStore.js` | OK – Pinia store funcional, acciones addPlate/removePlate/clearPlates |
| `src/composables/useValidation.js` | OK – Levenshtein + evaluatePlateQuality implementados |
| `src/utils/validation.js` | OK (duplicado de useValidation.js, se puede unificar) |
| `src/utils/plateStorage.js` | OK – Lógica de agrupación y deduplicación completa |
| `src/workers/mainWorker.js` | OK – Orquestación correcta del pipeline |
| `src/workers/detector/detector/imageProcessor.js` | OK – prepare_input, cropImage, resizeImage |
| `src/workers/detector/detector/detectionProcessor.js` | OK – run_model, process_output_boxes, processModelOutput |
| `src/workers/detector/detector/boundingBoxUtils.js` | OK – NMS, IoU, intersection, union |
| `src/workers/ocr/ocr/imageProcessor.js` | OK – preprocessImage, convertToGrayscale |
| `src/workers/ocr/ocr/ocrProcessor.js` | OK – recognizePlateText, runOcrModel |
| `src/workers/ocr/ocr/textProcessor.js` | OK – postprocessOutput, reshapeOutput, argmax |
| `vite.config.js` | OK – Vue plugin, alias `@` → `./src` |

### ❌ Bugs bloqueantes (la app no funciona sin estos)

#### BUG-1: `onnxruntime-web` no está en `package.json`

`src/workers/modelsLoader.js` importa `onnxruntime-web` pero el paquete no está declarado.

```bash
# Solución
pnpm add onnxruntime-web
```

También hay que configurar Vite para que no intente bundlear ort-wasm:
```js
// vite.config.js
export default defineConfig({
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
})
```

#### BUG-2: Rutas de importación del worker duplicadas

`src/workers/mainWorker.js` importa:
```js
import { prepare_input } from './detector/imageProcessor.js';      // ❌
import { run_model } from './detector/detectionProcessor.js';       // ❌
import { recognizePlateText } from './ocr/ocrProcessor.js';        // ❌
```

Pero los archivos están en:
```
src/workers/detector/detector/imageProcessor.js     // directorio duplicado!
src/workers/detector/detector/detectionProcessor.js
src/workers/ocr/ocr/ocrProcessor.js
```

**Solución**: Mover los archivos a las rutas correctas:
```
src/workers/detector/imageProcessor.js     (eliminar nivel extra)
src/workers/detector/detectionProcessor.js
src/workers/detector/boundingBoxUtils.js
src/workers/ocr/imageProcessor.js
src/workers/ocr/ocrProcessor.js
src/workers/ocr/textProcessor.js
```

O bien corregir los imports en `mainWorker.js`:
```js
import { prepare_input } from './detector/detector/imageProcessor.js';
import { run_model, process_output_boxes } from './detector/detector/detectionProcessor.js';
import { recognizePlateText } from './ocr/ocr/ocrProcessor.js';
```

#### BUG-3: Import path del worker en `utils/detector.js`

```js
import ModelWorker from '../worker/mainWorker?worker';  // ❌ singular "worker"
// Debe ser:
import ModelWorker from '../workers/mainWorker.js?worker';  // ✅ plural "workers"
```

#### BUG-4: Archivo `src/models/european_mobile_vit_v2_ocr_config.json` no existe

`src/workers/modelsLoader.js` importa:
```js
import ocrConfig from '../models/european_mobile_vit_v2_ocr_config.json' assert { type: 'json' };
```

El directorio `src/models/` no existe en el proyecto Vue. El archivo JSON sí existe en `alpr_web/src/models/`.

**Solución**: Crear `src/models/european_mobile_vit_v2_ocr_config.json`:
```json
{
  "alphabet": "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-",
  "max_plate_slots": 9,
  "pad_char": "-",
  "img_width": 140,
  "img_height": 70
}
```

**Nota**: La sintaxis `assert { type: 'json' }` está deprecada. Usar `with { type: 'json' }` en Vite 8 / Node ≥20.

#### BUG-5: `useCamera.js` no conecta con el worker — el pipeline no funciona

El corazón del sistema. `setupProcessingLoop()` tiene el código comentado:
```js
// const imageBitmap = await createImageBitmap(canvas)
// worker.postMessage({ imageBitmap }, [imageBitmap])
```

Sin esto, la cámara se muestra pero nunca se detecta ninguna matrícula.

**Solución**: Ver sección "Implementación del bridge Vue↔Worker" más abajo.

#### BUG-6: Modelos ONNX son placeholder (132 bytes)

Los archivos en `public/models/` en ambos proyectos son placeholders. Los modelos reales deben descargarse:

- **YOLOv9**: `yolo-v9-t-384-license-plates-end2end.onnx` (~7MB)  
  Fuente: [niconiconico23/yolo-v9-t-384-license-plates-end2end](https://huggingface.co/niconiconico23/yolo-v9-t-384-license-plates-end2end)

- **MobileViT v2 OCR**: `european_mobile_vit_v2_ocr.onnx` (~20MB)  
  Fuente: buscar en Hugging Face o el repositorio original del proyecto

Colocarlos en `public/models/` de ambos proyectos.

#### BUG-7: Tailwind CSS no instalado

`App.vue`, `CameraPreview.vue` y `PlateList.vue` usan clases Tailwind extensivamente pero el paquete no está en `package.json`. Para Vite 8:

```bash
pnpm add -D tailwindcss @tailwindcss/vite
```

```js
// vite.config.js
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  ...
})
```

```css
/* src/assets/main.css */
@import "tailwindcss";
```

### ⚠️ Problemas arquitecturales (funciona parcialmente)

#### ARCH-1: Doble arquitectura — Vue vs Vanilla JS

Los archivos en `src/utils/` son vanilla JS del proyecto original. Asumen DOM directo y un `appState` global:

| Archivo | Problema |
|---|---|
| `utils/config.js` | `getElements()` busca IDs de DOM que no existen en Vue. `appState` duplica la reactividad de Pinia |
| `utils/detector.js` | `updatePlatesListUI()` usa `document.getElementById('platesList')` — ese elemento no existe en Vue |
| `utils/media.js` | Duplica la lógica de `useCamera.js`, manipula DOM directamente |
| `utils/ui.js` | Dark mode con DOM directo, debe ser estado Vue reactivo |
| `utils/modal.js` | Construye el modal con innerHTML, asume IDs que no existen |

**Solución**: Estos archivos deben quedar como referencia únicamente. La lógica se reimplementa en composables Vue.

#### ARCH-2: `utils/detector.js` — `draw_boxes()` no actualiza el store

La función `draw_boxes()` hace `updatePlatesListUI()` (DOM directo) en lugar de llamar a `plateStore.addPlate()`. El store nunca recibe datos, `PlateList.vue` siempre muestra "No hay detecciones recientes".

#### ARCH-3: `modelsLoader.js` — export de variables `let` antes de asignación

```js
let modelYolov9 = null;
let ocrModel = null;
export { modelYolov9, ocrModel, ... };  // exporta referencias null

async function initializeModelYolov9() {
  modelYolov9 = await ort.InferenceSession.create(...);  // reasigna local
}
```

En ES Modules, `export { modelYolov9 }` crea un *live binding* — cuando `initializeModelYolov9()` reasigna `modelYolov9`, los módulos que importaron la referencia SÍ ven el nuevo valor. Esto funciona correctamente. No necesita cambios.

#### ARCH-4: `CameraPreview.vue` — solo soporta cámara

El diseño de referencia soporta tres modos: imagen, vídeo y cámara. El componente actual solo tiene el modo cámara. Falta:
- Input para seleccionar imagen (file input `accept="image/*"`)
- Input para seleccionar vídeo (file input `accept="video/*"`)
- Controles de reproducción (play/pause/stop) para vídeo
- Lógica de procesamiento de imagen estática

#### ARCH-5: `PlateList.vue` — `viewDetails()` solo hace console.log

No abre ningún modal. Necesita integración con un componente `PlateModal.vue`.

---

## Implementación del bridge Vue↔Worker (pieza más crítica)

### Estrategia: Composable `useDetection.js`

Este composable centraliza toda la comunicación con el worker, el procesamiento de frames, el dibujo en canvas y la actualización del store.

```js
// src/composables/useDetection.js
import { ref, shallowRef } from 'vue'
import { usePlateStore } from '@/stores/plateStore'
import { evaluatePlateQuality } from '@/composables/useValidation'
import { addPlateDetection, getBestPlateDetections, clearPlateStorage } from '@/utils/plateStorage'

export function useDetection() {
  const plateStore = usePlateStore()
  const isModelReady = ref(false)
  const modelError = ref(null)
  const isProcessing = ref(false)   // lock flag: worker ocupado

  // Worker instanciado como Vite Web Worker
  const worker = new Worker(
    new URL('../workers/mainWorker.js', import.meta.url),
    { type: 'module' }
  )

  // Escuchar mensajes del worker
  worker.onmessage = (event) => {
    const data = event.data

    if (data.status === 'model_ready') {
      isModelReady.value = true
      return
    }
    if (data.status === 'model_failed' || data.error) {
      modelError.value = data.error || 'Error cargando modelo'
      isProcessing.value = false
      return
    }

    // Resultado de inferencia: array de boxes
    const boxes = Array.isArray(data) ? data : []
    isProcessing.value = false
    return boxes  // quien llama dibujará y procesará
  }

  // Enviar frame al worker (zero-copy con ImageBitmap)
  const processFrame = async (canvas) => {
    if (!isModelReady.value || isProcessing.value) return
    isProcessing.value = true
    const imageBitmap = await createImageBitmap(canvas)
    worker.postMessage({ imageBitmap }, [imageBitmap])
  }

  // Dibujar bounding boxes y actualizar store
  const drawBoxesAndUpdate = (canvas, boxes, mode, stopCallback) => {
    if (!boxes || boxes.length === 0) return

    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 3
    ctx.font = '18px serif'

    const CONF_THRESH = 0.7

    for (const box of boxes) {
      if (!box.plateText?.confidence) continue
      const confValues = box.plateText.confidence
      const confMean = confValues.reduce((a, b) => a + b, 0) / confValues.length

      if (confMean < CONF_THRESH) continue

      const { x1, y1, x2, y2 } = box

      // Dibujar rectángulo
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

      // Etiqueta de texto
      const label = `${box.plateText.text} ${(confMean * 100).toFixed(1)}%`
      const textW = ctx.measureText(label).width
      ctx.fillStyle = '#00FF00'
      ctx.fillRect(x1, y1 - 25, textW + 10, 25)
      ctx.fillStyle = '#000000'
      ctx.fillText(label, x1 + 5, y1 - 7)

      // Evaluar calidad
      const quality = evaluatePlateQuality({ ...box, confidenceMean: confMean })
      if (!quality.isValid) continue

      // Añadir al sistema de almacenamiento y deduplicación
      const plateData = {
        text: box.plateText.text,
        confidence: confMean,
        croppedImage: box.croppedImage,
        boundingBox: { x1, y1, x2, y2 },
        plateText: box.plateText
      }
      const detection = addPlateDetection(plateData, mode)

      // Auto-stop en modo cámara
      if (mode === 'camera' && detection === true) {
        stopCallback?.()
        return
      }

      // Actualizar Pinia store
      if (detection?.id) {
        plateStore.addPlate({
          id: detection.id,
          plateText: box.plateText,
          confidence: confMean,
          croppedImage: box.croppedImage
        })
      }
    }
  }

  return {
    isModelReady,
    modelError,
    isProcessing,
    worker,
    processFrame,
    drawBoxesAndUpdate
  }
}
```

### Refactorizar `useCamera.js` para usar `useDetection`

```js
// src/composables/useCamera.js — versión completa
import { ref, onUnmounted } from 'vue'
import { useDetection } from './useDetection'

export function useCamera() {
  const videoRef = ref(null)
  const canvasRef = ref(null)
  const isCameraActive = ref(false)

  let stream = null
  let intervalId = null
  let lastBoxes = []

  const { isModelReady, isProcessing, worker, drawBoxesAndUpdate } = useDetection()

  // El worker llama onmessage — redirigir el resultado a la lógica de dibujado
  worker.onmessage = (event) => {
    const data = event.data
    if (data.status) return  // model_ready / model_failed ya manejados en useDetection
    lastBoxes = Array.isArray(data) ? data : []
    isProcessing.value = false
  }

  const stopCamera = () => {
    clearInterval(intervalId)
    intervalId = null
    stream?.getTracks().forEach(t => t.stop())
    stream = null
    isCameraActive.value = false
    canvasRef.value?.getContext('2d')?.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  }

  const startCamera = async () => {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    })
    videoRef.value.srcObject = stream
    await videoRef.value.play()
    isCameraActive.value = true

    intervalId = setInterval(async () => {
      const video = videoRef.value
      const canvas = canvasRef.value
      if (!video || !canvas || video.readyState < 2) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      // Dibujar últimas detecciones conocidas (pipeline asíncrono)
      if (lastBoxes.length > 0) {
        drawBoxesAndUpdate(canvas, lastBoxes, 'camera', stopCamera)
      }

      // Enviar nuevo frame si el worker está libre
      if (isModelReady.value && !isProcessing.value) {
        isProcessing.value = true
        const imageBitmap = await createImageBitmap(canvas)
        worker.postMessage({ imageBitmap }, [imageBitmap])
      }
    }, 20)  // 20ms = 50fps máximo
  }

  onUnmounted(stopCamera)

  return { videoRef, canvasRef, isCameraActive, isModelReady, startCamera, stopCamera }
}
```

---

## Estructura de datos correcta entre capas

### Worker → `useDetection` → `plateStore`

```
Worker output (box):
{
  x1, y1, x2, y2,
  label: 'license_plate',
  confidence: 0.92,          // confianza YOLO del bounding box
  croppedImage: ImageBitmap,
  plateText: {
    text: 'ABC1234',
    confidence: [0.98, 0.95, 0.91, ...]  // 9 valores, uno por slot OCR
  }
}

plateStorage.addPlateDetection() → detection:
{
  id: 'plate_1712345678_0',
  text: 'ABC1234',
  confidence: 0.94,           // promedio de plateText.confidence
  croppedImage: ImageBitmap,
  plateText: { text, confidence[] },
  timestamp: Date,
  mode: 'camera'
}

plateStore.addPlate() → plate en store:
{
  id: 'plate_1712345678_0',
  plateText: { text: 'ABC1234', confidence: [...] },
  confidence: 0.94,
  croppedImage: ImageBitmap,
  timestamp: Date              // añadido por la action del store
}

PlateList.vue lee:
  plate.plateText.text    → 'ABC1234'
  plate.confidence        → 0.94
  plate.timestamp         → para toLocaleTimeString()
```

---

## Componentes faltantes

### 1. `PlateModal.vue` — Modal de inspección detallada

Equivalente Vue del `modal.js` de referencia. Debe:
- Recibir una placa como prop (o leer del store)
- Mostrar el ImageBitmap en un canvas
- Mostrar barra de confianza por carácter
- Navegación entre múltiples placas (prev/next)
- Cerrar con ESC o click exterior
- Animación de entrada/salida con `<Transition>`

```vue
<!-- src/components/ui/PlateModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60" @click="close" />
        <div class="relative bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
          <!-- canvas para mostrar el recorte de la matrícula -->
          <canvas ref="plateCanvas" class="w-full rounded-lg mb-4" />
          
          <!-- Texto y confianza -->
          <div class="text-center mb-4">
            <p class="text-3xl font-mono font-bold">{{ currentPlate?.plateText.text }}</p>
            <p class="text-sm text-gray-500">Confianza: {{ (currentPlate?.confidence * 100).toFixed(1) }}%</p>
          </div>
          
          <!-- Barras de confianza por carácter -->
          <div class="flex gap-1 justify-center mb-4">
            <div v-for="(conf, i) in currentPlate?.plateText.confidence" :key="i" class="flex flex-col items-center">
              <span class="text-xs mb-1">{{ (conf * 100).toFixed(0) }}%</span>
              <div class="w-6 bg-gray-200 rounded" style="height: 80px">
                <div
                  class="w-full rounded transition-all"
                  :class="conf > 0.9 ? 'bg-green-500' : conf > 0.7 ? 'bg-blue-500' : conf > 0.5 ? 'bg-yellow-500' : 'bg-red-500'"
                  :style="{ height: `${Math.max(5, conf * 100)}%`, marginTop: `${100 - Math.max(5, conf * 100)}%` }"
                />
              </div>
              <span class="text-xs mt-1">{{ currentPlate.plateText.text[i] }}</span>
            </div>
          </div>
          
          <!-- Navegación si hay múltiples placas -->
          <div v-if="plates.length > 1" class="flex items-center justify-between">
            <button @click="prev" :disabled="index === 0">←</button>
            <span>{{ index + 1 }} de {{ plates.length }}</span>
            <button @click="next" :disabled="index === plates.length - 1">→</button>
          </div>
          
          <button @click="close" class="absolute top-4 right-4">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

### 2. Modos imagen y vídeo en `CameraPreview.vue`

Falta soporte para los otros dos modos de entrada del proyecto de referencia:

```vue
<!-- Añadir al template de CameraPreview.vue -->
<div class="flex gap-2 mb-4">
  <button @click="mode = 'camera'">Cámara</button>
  <label>
    <input type="file" accept="image/*" class="hidden" @change="onImageFile" />
    <span>Imagen</span>
  </label>
  <label>
    <input type="file" accept="video/*" class="hidden" @change="onVideoFile" />
    <span>Vídeo</span>
  </label>
</div>
```

Se necesita añadir `useImage.js` y `useVideo.js` composables (o unificar en `useDetection.js`).

### 3. `useImage.js` — Procesamiento de imagen estática

```js
// src/composables/useImage.js
export function useImageMode(canvasRef, worker, onResult) {
  const processImage = async (file) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await new Promise(r => img.onload = r)

    canvasRef.value.width = img.width
    canvasRef.value.height = img.height
    canvasRef.value.getContext('2d').drawImage(img, 0, 0)

    const imageBitmap = await createImageBitmap(canvasRef.value)
    worker.postMessage({ imageBitmap }, [imageBitmap])
    // worker.onmessage devolverá boxes → onResult(boxes)
  }
  return { processImage }
}
```

### 4. Toast notifications (`useToast.js`)

Para errores (cámara denegada, modelo fallido) y confirmaciones (nueva placa detectada):

```js
// src/composables/useToast.js
import { ref } from 'vue'
const toasts = ref([])

export function useToast() {
  const add = (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    toasts.value.push({ id, message, type })
    setTimeout(() => toasts.value = toasts.value.filter(t => t.id !== id), duration)
  }
  return { toasts, add, success: m => add(m, 'success'), error: m => add(m, 'error') }
}
```

---

## Roadmap de implementación por fases

### Fase 0: Corrección de bugs bloqueantes

- [ ] `pnpm add onnxruntime-web`
- [ ] `pnpm add -D tailwindcss @tailwindcss/vite`
- [ ] Configurar `@tailwindcss/vite` en `vite.config.js`
- [ ] Configurar `optimizeDeps.exclude: ['onnxruntime-web']` en `vite.config.js`
- [ ] Crear `src/models/european_mobile_vit_v2_ocr_config.json`
- [ ] Corregir rutas en `src/workers/mainWorker.js` (directorios duplicados)
- [ ] Descargar modelos ONNX reales a `public/models/`
- [ ] Cambiar `assert { type: 'json' }` por `with { type: 'json' }` en `modelsLoader.js`

### Fase 1: Pipeline funcional

- [ ] Crear `src/composables/useDetection.js` (bridge worker↔Vue)
- [ ] Reescribir `src/composables/useCamera.js` usando `useDetection`
- [ ] Conectar `drawBoxesAndUpdate()` → `plateStore.addPlate()`
- [ ] Añadir indicador de estado del modelo (`isModelReady`) en `CameraPreview.vue`
- [ ] Crear `src/composables/useImage.js` para modo imagen estática
- [ ] Actualizar `CameraPreview.vue` para soportar los 3 modos
- [ ] Verificar funcionamiento end-to-end con modelos reales

### Fase 2: Componentes de UI faltantes

- [ ] Crear `src/components/ui/PlateModal.vue` (reemplaza `utils/modal.js`)
- [ ] Conectar botón "Ver detalles" en `PlateList.vue` con `PlateModal.vue`
- [ ] Crear `src/components/ui/ToastContainer.vue`
- [ ] Crear `src/composables/useToast.js`
- [ ] Añadir estado de carga (skeleton) mientras el modelo inicializa
- [ ] Añadir controles de reproducción para modo vídeo (play/pause/stop)

### Fase 3: UI/UX Glassmorphism

- [ ] Implementar dark mode reactivo con `useDarkMode.js` composable
- [ ] Overlay glassmorphism en header y panel lateral
- [ ] Animaciones con `<Transition>` en bounding boxes y lista de placas
- [ ] Panel lateral colapsable en móvil
- [ ] Status indicator: "Analizando…" / "Listo" / "Buscando placa…"
- [ ] Frame throttle configurable (slider 1–10 frames)

### Fase 4: Tests

- [ ] Instalar Vitest + @vue/test-utils + happy-dom
- [ ] Configurar `vitest.config.js` con coverage v8
- [ ] Tests unitarios de `useValidation.js`
- [ ] Tests unitarios de `plateStorage.js` (lógica de agrupación y auto-stop)
- [ ] Tests unitarios de `textProcessor.js` (OCR postprocesado)
- [ ] Tests unitarios de `boundingBoxUtils.js` (NMS e IoU)
- [ ] Tests de componente de `PlateList.vue` y `PlateModal.vue`
- [ ] Tests E2E con Playwright (UI: carga, modos, modal)

### Fase 5: Optimización y PWA

- [ ] `vite-plugin-pwa` para modo offline
- [ ] Web Worker WASM SIMD si el navegador lo soporta
- [ ] Lazy loading de modelos con progress bar

---

## Testing

### Stack de testing

| Rol | Herramienta | Motivo |
|---|---|---|
| Unit + componentes | `vitest` | Misma config Vite, ESM nativo, 10–20× más rápido que Jest |
| Utilidades Vue | `@vue/test-utils` | Montaje de SFCs, simulación de eventos |
| DOM simulado | `happy-dom` | Más ligero que jsdom, suficiente para Vue |
| Coverage | `v8` (integrado en Vitest) | Sin plugins extra |
| E2E | `playwright` | Soporta WebAssembly/SharedArrayBuffer, más estable en CI que Cypress |

**Por qué no Jest**: requiere configuración adicional de Babel/transforms para ESM nativo, necesario aquí por `onnxruntime-web` y los Web Workers con `import`.

### Instalación

```bash
pnpm add -D vitest @vue/test-utils happy-dom @vitest/coverage-v8
pnpm add -D @playwright/test
```

### `vitest.config.js`

```js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,               // describe/it/expect sin imports
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/composables/**', 'src/stores/**']
    }
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  }
})
```

### Mock del worker y ONNX

Los tests unitarios no deben cargar modelos reales. Crear mocks en `src/workers/__mocks__/`:

```js
// src/workers/__mocks__/mainWorker.js
export default class MockWorker {
  onmessage = null
  postMessage(data) {
    // Simula respuesta del worker con boxes sintéticos
    const mockBoxes = [{
      x1: 10, y1: 10, x2: 200, y2: 60,
      label: 'license_plate',
      confidence: 0.95,
      croppedImage: null,
      plateText: { text: 'TEST1234', confidence: [0.99, 0.98, 0.97, 0.96, 0.95, 0.94, 0.93, 0.0, 0.0] }
    }]
    setTimeout(() => this.onmessage?.({ data: mockBoxes }), 10)
  }
  terminate() {}
}
```

```js
// tests/__mocks__/onnxruntime-web.js — bloquea la carga real de WASM
export const InferenceSession = {
  create: vi.fn().mockResolvedValue({
    run: vi.fn().mockResolvedValue({ output0: { cpuData: new Float32Array(0), dims: [0, 7] } }),
    outputNames: ['output0']
  })
}
export const Tensor = vi.fn()
```

### Tests unitarios por módulo

#### `useValidation.js` / `utils/validation.js`

```js
// tests/unit/useValidation.test.js
import { describe, it, expect } from 'vitest'
import { calculateTextSimilarity, evaluatePlateQuality } from '@/composables/useValidation'

describe('calculateTextSimilarity', () => {
  it('retorna 1.0 para textos idénticos', () => {
    expect(calculateTextSimilarity('ABC1234', 'ABC1234')).toBe(1.0)
  })

  it('ignora mayúsculas/minúsculas y espacios', () => {
    expect(calculateTextSimilarity('abc 123', 'ABC123')).toBeCloseTo(1.0)
  })

  it('retorna ~0.86 para un carácter diferente en 7', () => {
    // 'ABC1234' vs 'ABc1234' — distancia 1, maxLen 7 → 1 - 1/7 ≈ 0.857
    expect(calculateTextSimilarity('ABC1234', 'ABc1234')).toBeCloseTo(0.857, 2)
  })

  it('retorna 0 para textos completamente distintos', () => {
    expect(calculateTextSimilarity('AAAAAAA', 'BBBBBBB')).toBe(0)
  })

  it('retorna 0 si alguno es vacío', () => {
    expect(calculateTextSimilarity('', 'ABC')).toBe(0)
  })
})

describe('evaluatePlateQuality', () => {
  const goodPlate = {
    plateText: { text: 'ABC1234', confidence: [0.99, 0.98, 0.97, 0.96, 0.95, 0.94, 0.93] },
    confidenceMean: 0.96
  }

  it('aprueba una matrícula de buena calidad', () => {
    expect(evaluatePlateQuality(goodPlate).isValid).toBe(true)
  })

  it('rechaza si el texto es demasiado corto (< 4 chars)', () => {
    const plate = { ...goodPlate, plateText: { text: 'AB', confidence: [0.99, 0.99] } }
    expect(evaluatePlateQuality(plate).isValid).toBe(false)
  })

  it('rechaza si la confianza media es baja (< 0.7)', () => {
    const plate = { ...goodPlate, confidenceMean: 0.5 }
    expect(evaluatePlateQuality(plate).isValid).toBe(false)
  })

  it('rechaza si algún carácter tiene confianza < 0.5', () => {
    const plate = {
      ...goodPlate,
      plateText: { text: 'ABC1234', confidence: [0.99, 0.99, 0.99, 0.4, 0.99, 0.99, 0.99] }
    }
    expect(evaluatePlateQuality(plate).isValid).toBe(false)
  })
})
```

#### `plateStorage.js`

```js
// tests/unit/plateStorage.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  addPlateDetection,
  getBestPlateDetections,
  clearPlateStorage
} from '@/utils/plateStorage'

const makePlate = (text, confidence = 0.9) => ({
  text,
  confidence,
  croppedImage: null,
  plateText: { text, confidence: Array(7).fill(confidence) }
})

describe('plateStorage', () => {
  beforeEach(() => clearPlateStorage())

  it('añade una detección y la recupera', () => {
    addPlateDetection(makePlate('ABC1234'))
    const best = getBestPlateDetections()
    expect(best).toHaveLength(1)
    expect(best[0].text).toBe('ABC1234')
  })

  it('agrupa variantes similares (similitud >= 0.8) en un solo grupo', () => {
    addPlateDetection(makePlate('ABC1234'))
    addPlateDetection(makePlate('ABC1235'))  // 1 carácter diferente en 7 → ~0.857
    const best = getBestPlateDetections()
    expect(best).toHaveLength(1)
    expect(best[0].occurrences).toBe(2)
  })

  it('crea grupos separados para textos distintos (similitud < 0.8)', () => {
    addPlateDetection(makePlate('ABC1234'))
    addPlateDetection(makePlate('XYZ9999'))
    expect(getBestPlateDetections()).toHaveLength(2)
  })

  it('promueve la variante más frecuente como texto principal', () => {
    addPlateDetection(makePlate('ABC1234'))
    addPlateDetection(makePlate('ABC1235'))
    addPlateDetection(makePlate('ABC1235'))  // ABC1235 aparece 2 veces
    const best = getBestPlateDetections()
    expect(best[0].text).toBe('ABC1235')
  })

  it('ordena por ocurrencias descendentes', () => {
    addPlateDetection(makePlate('XYZ9999'))
    addPlateDetection(makePlate('ABC1234'))
    addPlateDetection(makePlate('ABC1234'))
    const best = getBestPlateDetections()
    expect(best[0].text).toBe('ABC1234')
  })

  it('auto-stop: retorna true al llegar a 10 detecciones consecutivas en modo cámara', () => {
    vi.useFakeTimers()
    let stopSignal = false
    for (let i = 0; i < 10; i++) {
      const result = addPlateDetection(makePlate('ABC1234'), 'camera')
      if (result === true) stopSignal = true
    }
    expect(stopSignal).toBe(true)
    vi.useRealTimers()
  })

  it('resetea el contador consecutivo tras 5 segundos sin detecciones', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 5; i++) addPlateDetection(makePlate('ABC1234'), 'camera')
    vi.advanceTimersByTime(6000)  // superar el timeout de 5s
    for (let i = 0; i < 9; i++) {
      const result = addPlateDetection(makePlate('ABC1234'), 'camera')
      expect(result).not.toBe(true)  // no debe disparar el auto-stop todavía
    }
    vi.useRealTimers()
  })
})
```

#### `boundingBoxUtils.js`

```js
// tests/unit/boundingBoxUtils.test.js
import { describe, it, expect } from 'vitest'
import { iou, nonMaxSuppression } from '@/workers/detector/detector/boundingBoxUtils'

describe('iou', () => {
  it('retorna 1.0 para boxes idénticos', () => {
    const box = { x1: 0, y1: 0, x2: 100, y2: 100 }
    expect(iou(box, box)).toBeCloseTo(1.0)
  })

  it('retorna 0 para boxes sin solapamiento', () => {
    const b1 = { x1: 0, y1: 0, x2: 50, y2: 50 }
    const b2 = { x1: 60, y1: 60, x2: 100, y2: 100 }
    expect(iou(b1, b2)).toBe(0)
  })

  it('retorna 0.25 para solapamiento parcial', () => {
    // b1: 100×100=10000, b2: 100×100=10000, intersección 50×50=2500
    // union = 10000+10000-2500 = 17500, iou = 2500/17500 ≈ 0.143
    const b1 = { x1: 0, y1: 0, x2: 100, y2: 100 }
    const b2 = { x1: 50, y1: 50, x2: 150, y2: 150 }
    expect(iou(b1, b2)).toBeCloseTo(0.143, 2)
  })
})

describe('nonMaxSuppression', () => {
  it('elimina boxes con IoU > 0.7 manteniendo el de mayor confianza', () => {
    const boxes = [
      { x1: 0, y1: 0, x2: 100, y2: 100, confidence: 0.9, label: 'license_plate' },
      { x1: 5, y1: 5, x2: 105, y2: 105, confidence: 0.8, label: 'license_plate' }  // solapan >0.7
    ]
    const result = nonMaxSuppression(boxes)
    expect(result).toHaveLength(1)
    expect(result[0].confidence).toBe(0.9)
  })

  it('mantiene boxes sin solapamiento', () => {
    const boxes = [
      { x1: 0, y1: 0, x2: 50, y2: 50, confidence: 0.9, label: 'license_plate' },
      { x1: 200, y1: 200, x2: 300, y2: 250, confidence: 0.8, label: 'license_plate' }
    ]
    expect(nonMaxSuppression(boxes)).toHaveLength(2)
  })
})
```

#### `textProcessor.js`

```js
// tests/unit/textProcessor.test.js
import { describe, it, expect } from 'vitest'
import { postprocessOutput, cleanPlateText } from '@/workers/ocr/ocr/textProcessor'

const mockConfig = {
  alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-',
  max_plate_slots: 9,
  pad_char: '-',
  img_width: 140,
  img_height: 70
}

describe('cleanPlateText', () => {
  it('elimina guiones de relleno al final', () => {
    expect(cleanPlateText('ABC1234--', '-')).toBe('ABC1234')
  })

  it('no elimina guiones internos', () => {
    expect(cleanPlateText('AB-1234-', '-')).toBe('AB-1234')
  })

  it('devuelve cadena vacía si todo es padding', () => {
    expect(cleanPlateText('---------', '-')).toBe('')
  })
})

describe('postprocessOutput', () => {
  it('convierte índices del tensor a texto legible', () => {
    // Construir tensor sintético: 9 slots × 38 chars
    // Índices para 'ABC1234--': A=10, B=11, C=12, 1=1, 2=2, 3=3, 4=4, -=36, -=36
    const alphabetLen = 38
    const slots = 9
    const output = new Float32Array(slots * alphabetLen).fill(0)
    const charIndices = [10, 11, 12, 1, 2, 3, 4, 36, 36]  // ABC1234--
    charIndices.forEach((charIdx, slot) => {
      output[slot * alphabetLen + charIdx] = 1.0  // máxima confianza para ese carácter
    })
    const result = postprocessOutput(output, mockConfig, false)
    expect(result).toBe('ABC1234')
  })
})
```

#### Tests de componente con `@vue/test-utils`

```js
// tests/components/PlateList.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PlateList from '@/components/ui/PlateList.vue'
import { usePlateStore } from '@/stores/plateStore'

describe('PlateList.vue', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('muestra mensaje vacío cuando no hay placas', () => {
    const wrapper = mount(PlateList)
    expect(wrapper.text()).toContain('No hay detecciones recientes')
  })

  it('renderiza las placas del store', async () => {
    const store = usePlateStore()
    store.addPlate({
      id: 'test-1',
      plateText: { text: 'ABC1234', confidence: [0.99] },
      confidence: 0.99
    })
    const wrapper = mount(PlateList)
    expect(wrapper.text()).toContain('ABC1234')
    expect(wrapper.text()).toContain('99.0%')
  })

  it('llama a clearPlates al hacer click en "Limpiar lista"', async () => {
    const store = usePlateStore()
    store.addPlate({ id: '1', plateText: { text: 'ABC', confidence: [0.9] }, confidence: 0.9 })
    const wrapper = mount(PlateList)
    await wrapper.find('button').trigger('click')
    expect(store.plates).toHaveLength(0)
  })
})
```

### Tests E2E con Playwright

Los tests E2E comprueban la UI sin depender de los modelos reales. Los modelos se mockean a nivel de service worker o se omiten.

```js
// tests/e2e/app.spec.js
import { test, expect } from '@playwright/test'

test.describe('ALPR Vue App', () => {
  test('carga la aplicación correctamente', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('ALPR Vue')
    await expect(page.locator('text=Matrículas Detectadas')).toBeVisible()
  })

  test('muestra estado de carga del modelo', async ({ page }) => {
    await page.goto('/')
    // El indicador de estado del modelo debe estar visible durante la carga
    await expect(page.locator('[data-testid="model-status"]')).toBeVisible()
  })

  test('el botón de cámara está disponible', async ({ page }) => {
    await page.goto('/')
    const cameraBtn = page.locator('button', { hasText: /cámara/i })
    await expect(cameraBtn).toBeVisible()
  })

  test('la lista de placas está vacía inicialmente', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=No hay detecciones recientes')).toBeVisible()
  })
})
```

```js
// playwright.config.js
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    // Permisos de cámara para tests que la usen
    permissions: ['camera'],
    // Necesario para WebAssembly cross-origin isolation
    launchOptions: { args: ['--enable-features=SharedArrayBuffer'] }
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
})
```

### Scripts en `package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Qué NO testear con mocks de ONNX

El pipeline real de inferencia (worker + modelos ONNX) no se puede testear correctamente en CI sin los modelos reales. La estrategia es:

1. **Unit tests**: lógica pura (validación, deduplicación, postprocesado OCR) — mocks para todo lo que sea ONNX
2. **Component tests**: comportamiento de UI con datos sintéticos — mocks para el worker
3. **E2E en local**: con modelos reales, manualmente o en un runner con los archivos `.onnx` disponibles
4. **CI pipeline**: solo unit + component tests; E2E opcionales si se proveen los modelos como artifacts

---

## Stack técnico final

| Categoría | Paquete | Versión |
|---|---|---|
| Framework | `vue` | ^3.5 |
| Estado | `pinia` | ^3.0 |
| Build | `vite` | ^8.0 |
| Vue plugin | `@vitejs/plugin-vue` | ^6.0 |
| CSS | `tailwindcss` | ^4.x (via @tailwindcss/vite) |
| Inferencia | `onnxruntime-web` | ^1.21 |
| Dev tools | `vite-plugin-vue-devtools` | ^8 |
| Tests unit | `vitest` + `@vue/test-utils` + `happy-dom` | ^3.x |
| Coverage | `@vitest/coverage-v8` | ^3.x |
| Tests E2E | `@playwright/test` | ^1.x |
| PWA (futuro) | `vite-plugin-pwa` | ^1.x |

---

## Comandos de referencia rápida

```bash
# Instalar dependencias faltantes
pnpm add onnxruntime-web
pnpm add -D tailwindcss @tailwindcss/vite

# Iniciar dev server
pnpm dev

# Build producción
pnpm build
```
