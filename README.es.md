[![en](https://img.shields.io/badge/lang-en-red.svg)](./README.md)
[![es](https://img.shields.io/badge/lang-es-yellow.svg)](./README.es.md)

# ALPR Vue - Reconocimiento Automático de Matrículas en Navegador

Este proyecto implementa un sistema de reconocimiento automático de matrículas de vehículos (ALPR - Automatic License Plate Recognition) que funciona completamente en el navegador, sin necesidad de servidores externos. Utiliza modelos de IA optimizados (YOLO y OCR) que se ejecutan localmente mediante WebAssembly. Esta es una **reescritura en Vue 3** del proyecto original [fast-alpr](https://github.com/ankandrew/fast-alpr), usando Composition API, Pinia para gestión de estado y TypeScript.

## Características

- Detección de matrículas en tiempo real mediante cámara web
- Modelos de IA optimizados para navegador (ONNX Runtime Web)
- Funciona completamente offline
- Agrupación inteligente de matrículas con similitud Levenshtein
- Visualización de confianza carácter por carácter
- Modo oscuro/claro
- Diseño responsive para dispositivos móviles
- Procesamiento en Web Workers para una interfaz fluida
- Tests unitarios con Vitest

## Requisitos

- Node.js ^20.19.0 o >=22.12.0
- pnpm (gestor de paquetes recomendado)
- Navegador moderno con soporte para WebAssembly y OffscreenCanvas

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/alpr_vue.git
cd alpr_vue

# Instalar dependencias
pnpm install
```

## Uso

### Desarrollo

Para iniciar el servidor de desarrollo:

```bash
pnpm dev
```

La aplicación estará disponible en: http://localhost:5173/

### Compilación para producción

```bash
pnpm build
```

Esto ejecuta la comprobación de tipos (`vue-tsc`) seguida del build de Vite, generando una versión optimizada en la carpeta `dist/`.

### Vista previa de la versión de producción

```bash
pnpm preview
```

### Ejecutar tests

```bash
pnpm test          # Modo watch
pnpm test:run      # Ejecución única
pnpm test:coverage # Ejecutar con cobertura
```

## Estructura del Proyecto

```
alpr_vue/
├── index.html                          # Punto de entrada HTML
├── package.json                        # Dependencias y scripts
├── vite.config.ts                      # Configuración de Vite
├── vitest.config.ts                    # Configuración de tests
├── tsconfig.json                       # Referencias de proyecto TypeScript
├── tsconfig.app.json                   # Configuración TypeScript de la app
├── public/
│   ├── favicon.ico                     # Favicon
│   └── models/                         # Modelos ONNX pre-entrenados
│       ├── european_mobile_vit_v2_ocr.onnx
│       ├── european_mobile_vit_v2_ocr_config.yaml
│       └── yolo-v9-t-384-license-plates-end2end.onnx
└── src/
    ├── main.ts                         # Entrada de la app (crea Vue + Pinia)
    ├── App.vue                         # Componente raíz (layout grid responsive)
    ├── assets/
    │   └── main.css                    # Import de Tailwind CSS v4
    ├── components/
    │   ├── icons/
    │   │   ├── IconPlay.vue            # Icono SVG de reproducción
    │   │   └── IconStop.vue            # Icono SVG de parada
    │   └── ui/
    │       ├── CameraPreview.vue       # Video + canvas overlay, controles de cámara
    │       ├── PlateList.vue           # Lista de matrículas detectadas con animaciones
    │       └── PlateModal.vue          # Modal de detalle con barras de confianza
    ├── composables/
    │   ├── useCamera.ts               # Ciclo de vida de cámara y captura de frames
    │   └── useDetection.ts            # Comunicación con Web Worker y lógica de detección
    ├── models/
    │   └── european_mobile_vit_v2_ocr_config.json  # Config del modelo OCR
    ├── stores/
    │   ├── appStore.ts                # Estado de la app (errores, carga de modelos)
    │   └── plateStore.ts              # Estado de matrículas, agrupación y detección consecutiva
    ├── types/
    │   └── detection.ts               # Interfaces y tipos TypeScript
    ├── utils/
    │   ├── validation.ts              # Similitud Levenshtein y evaluación de calidad
    │   └── feedback.ts                # Pitido de audio y vibración al confirmar una matrícula
    └── workers/
        ├── mainWorker.js              # Entrada del Worker: carga modelos y procesa frames
        ├── modelsLoader.js            # Cargador de modelos ONNX con calentamiento
        ├── detector/detector/
        │   ├── boundingBoxUtils.js    # NMS, IoU, intersección/unión
        │   ├── detectionProcessor.js  # Inferencia YOLO y procesamiento de cajas
        │   └── imageProcessor.js      # Redimensionado, normalización y recorte
        └── ocr/ocr/
            ├── imageProcessor.js      # Conversión a escala de grises y preprocesamiento OCR
            ├── ocrProcessor.js        # Pipeline de inferencia OCR
            └── textProcessor.js       # Argmax, mapeo a alfabeto y limpieza de texto
```

## Arquitectura y Componentes

### Flujo de Procesamiento

1. **Captura de Cámara**: El usuario inicia la cámara web mediante el composable `useCamera`
2. **Procesamiento de Frames**: Los frames se envían al Web Worker a ~50fps vía `postMessage`
3. **Detección de Matrículas**: YOLOv9 identifica y localiza las matrículas
4. **Extracción de Regiones**: Se recortan las áreas detectadas del frame
5. **OCR**: MobileViT v2 reconoce el texto de las regiones recortadas
6. **Visualización de Resultados**: Se dibujan cajas delimitadoras en el canvas; las matrículas válidas se almacenan en el store de Pinia
7. **Parada automática**: La cámara se detiene al confirmar una matrícula — tras 3 segundos de detección continua (o 1 segundo si la confianza media ≥ 0.8)

### Componentes Principales

#### Vue 3 + Composition API

La interfaz está construida con **Vue 3** usando `<script setup>` y TypeScript. La gestión de estado usa **Pinia** con dos stores:

- **`appStore`**: Registra errores de cámara, estado de carga de modelos y errores de los mismos.
- **`plateStore`**: Gestiona las matrículas detectadas, agrupa matrículas similares usando distancia Levenshtein (umbral 0.8) e implementa confirmación basada en tiempo: una matrícula se confirma tras 3 segundos de detección continua, o 1 segundo si la confianza media por carácter ≥ 0.8.

#### Composables

- **`useCamera`**: Gestiona el ciclo de vida de la cámara web (`startCamera`/`stopCamera`), captura frames vía `ImageBitmap` y coordina la detección mediante `useDetection`.
- **`useDetection`**: Gestiona el singleton del Web Worker, envía frames para procesamiento, recibe resultados de cajas delimitadoras mediante un patrón pub/sub (`onBoxes`) y valida la calidad de las matrículas antes de añadirlas al store.

#### Componente CameraPreview

Combina un elemento `<video>` con un `<canvas>` superpuesto para dibujar las cajas delimitadoras. Muestra overlays de error, carga y estado apagado. Incluye botones de alternancia Play/Stop.

#### PlateList y PlateModal

`PlateList` muestra las detecciones agrupadas con transiciones animadas. `PlateModal` (teletransportado) muestra la confianza carácter por carácter con barras codificadas por color y una imagen recortada de la matrícula renderizada en canvas.

#### Web Workers

Los modelos de IA se ejecutan en un Web Worker dedicado para evitar bloquear el hilo principal:

- **`mainWorker`**: Punto de entrada; carga modelos al inicio, procesa los frames entrantes a través del pipeline de detección.
- **`modelsLoader`**: Carga los modelos ONNX de YOLO y OCR con una inferencia dummy de calentamiento.
- **Pipeline de detección**: `prepare_input` (redimensionar a 384x384, normalizar) -> `run_model` (inferencia YOLOv9) -> `process_output_boxes` (NMS con IoU 0.7, umbral de confianza 0.6, área mínima 5x5px) -> `cropImage`.
- **Pipeline OCR**: `preprocessImage` (escala de grises, redimensionar al tamaño de entrada del modelo) -> `runOcrModel` -> `postprocessOutput` (argmax, mapeo a alfabeto, eliminación de padding).

#### Validación de Calidad de Matrículas

Las matrículas se evalúan según 4 criterios antes de ser aceptadas:
- Longitud (4-10 caracteres)
- Confianza media >= 0.7
- Confianza mínima por carácter >= 0.5
- Formato regex: `^[A-Z0-9]{2,4}[\s-]?[A-Z0-9]{2,4}$`

Se requiere una puntuación combinada >= 0.7 para que una matrícula sea almacenada.

## Modelos Utilizados

### Detector de Matrículas

- **Modelo**: yolo-v9-t-384-license-plates-end2end.onnx ([open-image-models](https://github.com/ankandrew/open-image-models))
- **Formato**: ONNX
- **Resolución de entrada**: 384x384
- **Clases**: Detecta específicamente matrículas de vehículos

#### Arquitectura YOLO (You Only Look Once)

YOLO es un algoritmo de detección de objetos en tiempo real que aplica una única red neuronal a la imagen completa. Esta red divide la imagen en regiones y predice cuadros delimitadores y probabilidades para cada región. Los cuadros delimitadores se ponderan por las probabilidades predichas.

Características principales de YOLOv9:
- **Detección en una sola pasada**: A diferencia de los sistemas de dos etapas, YOLO analiza toda la imagen en una sola pasada, lo que lo hace extremadamente rápido.
- **Arquitectura optimizada**: YOLOv9-t es una versión compacta diseñada para ejecutarse en dispositivos con recursos limitados, ideal para aplicaciones web.
- **Alta precisión**: A pesar de su tamaño reducido, el modelo alcanza un equilibrio óptimo entre velocidad y precisión para la detección de matrículas.
- **Representación espacial**: El modelo divide la imagen en una cuadrícula y predice múltiples cuadros delimitadores y puntuaciones de confianza para cada celda.

El modelo usado en este proyecto ha sido específicamente entrenado y optimizado para detectar matrículas vehiculares en diferentes condiciones de iluminación y ángulos.

### OCR de Matrículas

- **Modelo**: european_mobile_vit_v2_ocr.onnx ([open-image-models](https://github.com/ankandrew/open-image-models))
- **Formato**: ONNX
- **Resolución de entrada**: 140x70 píxeles
- **Alfabeto**: Caracteres alfanuméricos (0-9, A-Z), guión y guion bajo (padding)
- **Slots máximos de matrícula**: 9

#### Arquitectura ConvNet (CNN)

La arquitectura del modelo OCR es simple pero efectiva, consistiendo en varias capas CNN con múltiples cabezas de salida. Cada cabeza representa la predicción de un carácter de la matrícula.

Si la matrícula consiste en un máximo de 9 caracteres (`max_plate_slots=9`), entonces el modelo tendría 9 cabezas de salida. Cada cabeza genera una distribución de probabilidad sobre el vocabulario especificado durante el entrenamiento. Por lo tanto, la predicción de salida para una sola matrícula tendrá una forma de `(max_plate_slots, vocabulary_size)`.

![Modelo de cabezas OCR](https://raw.githubusercontent.com/ankandrew/fast-plate-ocr/4a7dd34c9803caada0dc50a33b59487b63dd4754/extra/FCN.png)

#### Métricas del Modelo OCR

Durante el entrenamiento, el modelo utiliza las siguientes métricas:

* **plate_acc**: Calcula el número de **matrículas** que fueron **completamente clasificadas** correctamente. Para una matrícula individual, si la verdad fundamental es `ABC123` y la predicción también es `ABC123`, puntuaría 1. Sin embargo, si la predicción fuera `ABD123`, puntuaría 0, ya que **no todos los caracteres** fueron correctamente clasificados.

* **cat_acc**: Calcula la precisión de **caracteres individuales** dentro de las matrículas. Por ejemplo, si la etiqueta correcta es `ABC123` y la predicción es `ABC133`, produciría una precisión del 83.3% (5 de 6 caracteres clasificados correctamente), en lugar de 0% como en plate_acc.

* **top_3_k**: Calcula con qué frecuencia el carácter verdadero está incluido en las **3 predicciones principales** (las tres predicciones con mayor probabilidad).

En esta implementación web, el modelo ha sido convertido a formato ONNX para optimizar su rendimiento en el navegador, manteniendo un equilibrio entre precisión y velocidad de procesamiento.

## Stack Tecnológico

- **Vue 3** con Composition API (`<script setup>`)
- **TypeScript** para la lógica central (composables, stores, tipos, utils)
- **Pinia** para gestión de estado
- **Tailwind CSS v4** vía `@tailwindcss/vite`
- **Vite** con `vue-tsc` para builds con comprobación de tipos
- **Vitest** + `@vue/test-utils` para testing
- **ONNX Runtime Web** para inferencia de IA en el navegador

## Configuración Avanzada

### Modificar Umbrales de Detección

Los umbrales de confianza para la detección y el OCR pueden ajustarse en los siguientes archivos:

- `src/workers/detector/detector/detectionProcessor.js` - Umbral de confianza de detección y umbral IoU de NMS
- `src/composables/useDetection.ts` - Criterios de validación de calidad de matrículas

```javascript
// Umbral de confianza para detección (detectionProcessor.js)
const confThresh = 0.6;

// Umbral IoU para NMS (boundingBoxUtils.js)
const iouThreshold = 0.7;
```

### Umbral de Similitud para Agrupación

El umbral de similitud Levenshtein para agrupar matrículas similares puede ajustarse en:

- `src/stores/plateStore.ts` - Umbral de similitud (por defecto: 0.8)

### Personalización de la Interfaz

El proyecto utiliza Tailwind CSS v4, que puede personalizarse mediante `src/assets/main.css` o añadiendo clases utilitarias directamente en los componentes.

## Limitaciones

- El rendimiento depende de la capacidad de procesamiento del dispositivo
- Los modelos están optimizados para matrículas europeas
- No funciona en navegadores antiguos sin soporte para WebAssembly y OffscreenCanvas
- Requiere un contexto seguro (HTTPS o localhost) para el acceso a la cámara

## Reconocimientos

- [fast-alpr](https://github.com/ankandrew/fast-alpr) - Proyecto original en el que se basa esta reimplementación
  - [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) - Modelos de **OCR** por defecto
  - [open-image-models](https://github.com/ankandrew/open-image-models) - Modelos de **detección** de placas por defecto

## Uso de Inteligencia Artificial

Este proyecto ha hecho uso extenso de inteligencia artificial para:
- Conversiones de Python a JavaScript/TypeScript
- Migración a Vue 3 Composition API y desarrollo de componentes
- Diseño de patrones de composables y stores

Las herramientas de IA utilizadas incluyen:
- [Claude](https://claude.ai)
- [ChatGPT](https://chat.openai.com)
- [Google Gemini](https://gemini.google.com)