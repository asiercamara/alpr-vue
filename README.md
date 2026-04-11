[![en](https://img.shields.io/badge/lang-en-red.svg)](./README.md)
[![es](https://img.shields.io/badge/lang-es-yellow.svg)](./README.es.md)

# ALPR Vue - Automatic License Plate Recognition in Browser

This project implements an automatic license plate recognition (ALPR) system that runs entirely in the browser without the need for external servers. It uses optimized AI models (YOLO and OCR) that run locally via WebAssembly. This is a **Vue 3** rewrite of the original [fast-alpr](https://github.com/ankandrew/fast-alpr) project, using Composition API, Pinia for state management, and TypeScript.

## Features

- Real-time license plate detection via webcam
- **Upload image/video files** for offline plate detection
- Smart plate grouping with Levenshtein similarity
- Character-by-character confidence visualization
- **Edit detected plate text** directly in the detail modal
- **Export detections to CSV** for further analysis
- **Camera facing toggle** (front/back) on mobile devices
- **Bottom sheet help instructions** accessible from the header
- **Configurable settings panel** (gear icon) with confidence, timing, and mode controls
- **Three theme modes**: light, dark, system (follows OS preference with FOUC prevention)
- **Zoom controls** (native hardware zoom with digital fallback)
- **Toast notifications** for plate confirmations
- **Custom font system**: Inter (UI), Space Grotesk (display), JetBrains Mono (plate text)
- Responsive design optimized for mobile devices
- **Improved contrast** for sunlight readability
- Processing offloaded to Web Workers for smooth UI
- Unit tests with Vitest (92%+ coverage)

## Requirements

- Node.js ^20.19.0 or >=22.12.0
- pnpm (recommended package manager)
- Modern browser with WebAssembly and OffscreenCanvas support

## Installation

```bash
# Clone the repository
git clone https://github.com/your-user/alpr_vue.git
cd alpr_vue

# Install dependencies
pnpm install
```

## Usage

### Development

To start the development server:

```bash
pnpm dev
```

The application will be available at: http://localhost:5173/

### Build for production

```bash
pnpm build
```

This runs type checking (`vue-tsc`) followed by the Vite build, generating an optimized version in the `dist/` folder.

### Preview production build

```bash
pnpm preview
```

### Run tests

```bash
pnpm test          # Watch mode
pnpm test:run      # Single run
pnpm test:coverage # Run with coverage
```

### Lint and format

```bash
pnpm lint          # Run ESLint
pnpm format        # Run Prettier
```

## Project Structure

```
alpr_vue/
├── index.html                          # Main HTML entry point
├── package.json                        # Dependencies and scripts
├── vite.config.ts                      # Vite configuration
├── vitest.config.ts                    # Test configuration
├── tsconfig.json                       # TypeScript project references
├── tsconfig.app.json                   # TypeScript app config
├── scripts/
│   └── deploy-surge.sh                 # Surge.sh deployment script
├── public/
│   ├── favicon.ico                     # Favicon
│   ├── android-chrome-*.png            # PWA icons
│   ├── apple-touch-icon.png           # Apple touch icon
│   ├── site.webmanifest               # PWA manifest
│   └── models/                         # Pre-trained ONNX models
│       ├── european_mobile_vit_v2_ocr.onnx
│       ├── european_mobile_vit_v2_ocr_config.yaml
│       └── yolo-v9-t-384-license-plates-end2end.onnx
└── src/
    ├── main.ts                         # App entry (creates Vue + Pinia)
    ├── App.vue                         # Root component (header + camera + history)
    ├── assets/
    │   └── main.css                    # Tailwind CSS v4 with custom tokens
    ├── components/
    │   ├── icons/
    │   │   ├── IconAlertTriangle.vue   # Alert icon
    │   │   ├── IconCamera.vue          # Camera icon
    │   │   ├── IconClose.vue           # Close/dismiss icon
    │   │   ├── IconCopy.vue            # Copy to clipboard icon
    │   │   ├── IconDownload.vue        # Download/export icon
    │   │   ├── IconEdit.vue            # Edit icon
    │   │   ├── IconFlipCamera.vue      # Toggle camera facing icon
    │   │   ├── IconImage.vue           # Image file icon
    │   │   ├── IconMoon.vue            # Dark mode icon
    │   │   ├── IconMonitor.vue         # System theme icon
    │   │   ├── IconPlay.vue            # Play icon
    │   │   ├── IconReset.vue           # Reset/restore icon
    │   │   ├── IconSettings.vue        # Settings gear icon
    │   │   ├── IconStop.vue            # Stop icon
    │   │   ├── IconSun.vue             # Light mode icon
    │   │   ├── IconTrash.vue           # Delete icon
    │   │   ├── IconUpload.vue          # Upload file icon
    │   │   ├── IconVideo.vue           # Video file icon
    │   │   ├── IconVolumeOff.vue       # Muted feedback icon
    │   │   ├── IconVolumeOn.vue        # Active feedback icon
    │   │   ├── IconZoomIn.vue          # Zoom in icon
    │   │   └── IconZoomOut.vue         # Zoom out icon
    │   └── ui/
    │       ├── BottomDrawer.vue        # Reusable bottom sheet container
    │       ├── CameraPreview.vue       # Video + canvas overlay, camera controls, upload
    │       ├── ConfidenceRing.vue      # Circular confidence indicator
    │       ├── HelpSheet.vue           # Bottom sheet with usage instructions
    │       ├── MediaUploader.vue       # Image/video file upload with progress overlay
    │       ├── PlateList.vue           # Detected plates list with export CSV
    │       ├── PlateListItem.vue       # Single plate card with confidence ring
    │       ├── PlateModal.vue          # Plate detail modal with edit & confidence bars
    │       ├── SampleGallery.vue       # Built-in sample images/videos for demo
    │       ├── SettingsSheet.vue       # Bottom sheet settings panel
    │       └── ToastNotification.vue   # Transient confirmation toast
    ├── composables/
    │   ├── useCamera.ts               # Camera lifecycle, facing toggle & frame capture
    │   ├── useDetection.ts            # Web Worker communication & detection logic
    │   ├── useStaticMedia.ts          # Image/video file processing composable
    │   └── useTheme.ts                # Dark/light/system theme management
    ├── models/
    │   └── european_mobile_vit_v2_ocr_config.json  # OCR model config
    ├── stores/
    │   ├── appStore.ts                # App state (errors, model loading, camera active)
    │   ├── plateStore.ts              # Plates state, grouping, text editing & detection
    │   └── settingsStore.ts           # User settings with localStorage persistence
    ├── types/
    │   └── detection.ts               # TypeScript interfaces & types
    ├── utils/
    │   ├── export.ts                  # CSV generation and download
    │   ├── feedback.ts                # Audio beep & vibration feedback
    │   └── validation.ts              # Levenshtein similarity & plate quality evaluation
    └── workers/
        ├── mainWorker.js              # Worker entry: loads models & processes frames
        ├── modelsLoader.js            # ONNX model loader with warmup
        ├── detector/detector/
        │   ├── boundingBoxUtils.js    # NMS, IoU, intersection/union
        │   ├── detectionProcessor.js  # YOLO inference & box processing
        │   └── imageProcessor.js      # Image resize, normalize & crop
        └── ocr/ocr/
            ├── imageProcessor.js      # Grayscale conversion & OCR preprocessing
            ├── ocrProcessor.js        # OCR inference pipeline
            └── textProcessor.js       # Argmax, alphabet mapping & text cleaning
```

## Architecture and Components

### Processing Flow

1. **Input**: User starts webcam via `useCamera` or uploads an image/video via `useStaticMedia`
2. **Frame Processing**: Frames sent to Web Worker at ~50fps via `postMessage`
3. **License Plate Detection**: YOLOv9 identifies and locates plates
4. **Region Extraction**: Detected plate regions are cropped from the frame
5. **OCR**: MobileViT v2 recognizes text from cropped regions
6. **Result Display**: Bounding boxes drawn on canvas; valid plates stored in Pinia store
7. **Auto-stop**: Camera stops after a plate is confirmed — 3 seconds of continuous detection (or 1 second for high-confidence detections with mean ≥ 0.8)

### Main Components

#### Vue 3 + Composition API

The UI is built with **Vue 3** using `<script setup>` and TypeScript. State management uses **Pinia** with two stores:

- **`appStore`**: Tracks camera errors, model loading state, camera active state, and model errors.
- **`plateStore`**: Manages detected plates, groups similar plates using Levenshtein distance (threshold 0.8), implements time-based confirmation logic, and supports editing plate text. Plates are sorted chronologically (most recent first).
- **`settingsStore`**: Persists all 7 settings to localStorage under `'alpr-settings'`. Provides typed setters and per-setting reset functions. `useTheme` consumes `settingsStore.theme` to drive the dark class on `<html>`.

#### Composables

- **`useCamera`**: Manages webcam lifecycle (`startCamera`/`stopCamera`), camera facing toggle (`toggleCameraFacing`), captures frames via `ImageBitmap`, and coordinates detection via `useDetection`. Syncs camera state with `appStore`.
- **`useDetection`**: Manages the Web Worker singleton, sends frames for processing, receives bounding box results via a pub/sub pattern (`onBoxes`), and validates plate quality before adding to the store.
- **`useStaticMedia`**: Processes uploaded image/video files frame-by-frame through the same detection pipeline. Shows progress (loading/processing/done/error) and supports cancellation.
- **`useTheme`**: Watches `settingsStore.theme`, toggles the `dark` class on `document.documentElement`, and listens to OS `prefers-color-scheme` changes in `'system'` mode. Called once in `App.vue`.

#### CameraPreview Component

Combines a `<video>` element with a `<canvas>` overlay for drawing bounding boxes. Displays:

- Error overlay with retry button
- Model loading spinner
- Camera-off state with **Iniciar cámara** and **Subir archivo** buttons stacked vertically
- Scanning indicator (Escaneando/En vivo) when camera is active
- Stop and flip camera buttons during scanning

#### MediaUploader Component

Provides file upload for images and videos with a processing progress overlay, cancel button, and status text. Uses `useStaticMedia` composable internally.

#### HelpSheet Component

Bottom sheet modal showing usage instructions, triggered by the `?` icon in the header. Replaces the inline instructions section to save vertical space.

#### SettingsSheet Component

Bottom sheet with theme selector (light/dark/system), audio/haptic toggle, confidence slider, confirmation time sliders, continuous mode and skip-duplicates toggles, and per-setting reset buttons.

#### PlateList & PlateModal

`PlateList` displays grouped detections sorted by most recent first, with **Export CSV** and **Clear** buttons. `PlateModal` (teleported) shows:

- Character-by-character confidence with color-coded bars
- Cropped plate image rendered on canvas
- **Edit button** to modify detected plate text
- **Copy to clipboard** button
- Detection metadata (timestamp, ID)

#### Export Utility

`src/utils/export.ts` provides `generateCSV()` and `downloadCSV()` for exporting detected plates as a CSV file with columns: Texto, Confianza, Fecha, ID. Properly escapes commas and quotes.

#### Web Workers

AI models run in a dedicated Web Worker to prevent blocking the main thread:

- **`mainWorker`**: Entry point; loads models on init, processes incoming frames through the detection pipeline.
- **`modelsLoader`**: Loads YOLO and OCR ONNX models with a warmup dummy inference.
- **Detection pipeline**: `prepare_input` (resize 384x384, normalize) -> `run_model` (YOLOv9 inference) -> `process_output_boxes` (NMS with IoU 0.7, confidence threshold 0.6, min area 5x5px) -> `cropImage`.
- **OCR pipeline**: `preprocessImage` (grayscale, resize to model input size) -> `runOcrModel` -> `postprocessOutput` (argmax, alphabet mapping, padding removal).

#### Plate Quality Validation

Plates are scored on 4 criteria before being accepted:

- Length (4-10 characters)
- Mean confidence >= 0.7
- Min character confidence >= 0.5
- Regex format: `^[A-Z0-9]{2,4}[\s-]?[A-Z0-9]{2,4}$`

A combined score >= 0.7 is required for a plate to be stored.

## Models Used

### License Plate Detector

- **Model**: yolo-v9-t-384-license-plates-end2end.onnx ([open-image-models](https://github.com/ankandrew/open-image-models))
- **Format**: ONNX
- **Input Resolution**: 384x384
- **Classes**: Specifically detects vehicle license plates

#### YOLO (You Only Look Once) Architecture

YOLO is a real-time object detection algorithm that applies a single neural network to the entire image. This network divides the image into regions and predicts bounding boxes and probabilities for each region. Bounding boxes are weighted by predicted probabilities.

Key features of YOLOv9:

- **Single-pass detection**: Unlike two-stage systems, YOLO analyzes the entire image in a single pass, making it extremely fast.
- **Optimized architecture**: YOLOv9-t is a compact version designed to run on resource-limited devices, ideal for web applications.
- **High accuracy**: Despite its reduced size, the model achieves an optimal balance between speed and accuracy for license plate detection.
- **Spatial representation**: The model divides the image into a grid and predicts multiple bounding boxes and confidence scores per cell.

The model used in this project has been specifically trained and optimized to detect vehicle license plates under various lighting conditions and angles.

### License Plate OCR

- **Model**: european_mobile_vit_v2_ocr.onnx ([open-image-models](https://github.com/ankandrew/open-image-models))
- **Format**: ONNX
- **Input Resolution**: 140x70 pixels
- **Alphabet**: Alphanumeric characters (0-9, A-Z), hyphen, and underscore (padding)
- **Max plate slots**: 9

#### ConvNet (CNN) Architecture

The OCR model's architecture is simple yet effective, consisting of multiple CNN layers with multiple output heads. Each head represents the prediction of a single license plate character.

If the license plate contains a maximum of 9 characters (`max_plate_slots=9`), the model will have 9 output heads. Each head generates a probability distribution over the vocabulary specified during training. Therefore, the output prediction for a single license plate will have a shape of `(max_plate_slots, vocabulary_size)`.
![OCR heads model](https://raw.githubusercontent.com/ankandrew/fast-plate-ocr/4a7dd34c9803caada0dc50a33b59487b63dd4754/extra/FCN.png)

#### OCR Model Metrics

During training, the model utilizes the following metrics:

- **plate_acc**: Calculates the number of **plates** that were **fully classified** correctly. For an individual plate, if the ground truth is `ABC123` and the prediction is also `ABC123`, it would score 1. However, if the prediction were `ABD123`, it would score 0, as **not all characters** were correctly classified.

- **cat_acc**: Calculates the accuracy of **individual characters** within the plates. For example, if the correct label is `ABC123` and the prediction is `ABC133`, it would yield an accuracy of 83.3% (5 out of 6 characters correctly classified), instead of 0% as in plate_acc.

- **top_3_k**: Calculates how often the true character is included in the **top 3 predictions** (the three predictions with the highest probability).

In this web implementation, the model has been converted to ONNX format to optimize its performance in the browser, maintaining a balance between accuracy and processing speed.

## Tech Stack

- **Vue 3** with Composition API (`<script setup>`)
- **TypeScript** for core logic (composables, stores, types, utils)
- **Pinia** for state management
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **Vite** with `vue-tsc` for type-checked builds
- **Vitest** + `@vue/test-utils` for testing (92%+ coverage)
- **ESLint** + **Prettier** + **Husky** for code quality
- **ONNX Runtime Web** for in-browser AI inference

## Advanced Configuration

### Modifying Detection Thresholds

Confidence thresholds for detection and OCR can be adjusted in the following files:

- `src/workers/detector/detector/detectionProcessor.js` - Detection confidence threshold and NMS IoU threshold
- `src/composables/useDetection.ts` - Plate quality validation criteria

```javascript
// Detection confidence threshold (detectionProcessor.js)
const confThresh = 0.6

// NMS IoU threshold (boundingBoxUtils.js)
const iouThreshold = 0.7
```

### Plate Grouping Similarity Threshold

The Levenshtein similarity threshold for grouping similar plates can be adjusted in:

- `src/stores/plateStore.ts` - Similarity threshold (default: 0.8)

### Interface Customization

The project uses Tailwind CSS v4, which can be customized via `src/assets/main.css` or by adding utility classes directly in components.

## Deployment

Deploy to [Surge.sh](https://surge.sh):

```bash
chmod +x scripts/deploy-surge.sh
./scripts/deploy-surge.sh                      # → alpr-vue.surge.sh
./scripts/deploy-surge.sh my-domain.surge.sh  # → custom domain
```

The script builds the project (`pnpm build`) then publishes `dist/` via `surge`. Requires a Surge account (`surge login`). The script falls back to `npx surge` or `pnpm dlx surge` when the CLI is not installed globally.

## Limitations

- Performance depends on the device's processing capability
- Models are optimized for European license plates
- Does not work on older browsers without WebAssembly and OffscreenCanvas support
- Requires a secure context (HTTPS or localhost) for camera access

## Acknowledgements

- [fast-alpr](https://github.com/ankandrew/fast-alpr) - Original project this was based on
  - [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) - Default **OCR** models
  - [open-image-models](https://github.com/ankandrew/open-image-models) - Default plate **detection** models

## Use of Artificial Intelligence

This project has extensively used artificial intelligence for:

- Python to JavaScript/TypeScript conversions
- Vue 3 Composition API migration and component development
- Composable and store design patterns

The AI tools used include:

- [Claude](https://claude.ai)
- [ChatGPT](https://chat.openai.com)
- [Google Gemini](https://gemini.google.com)
