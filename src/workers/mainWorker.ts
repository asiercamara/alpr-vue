/**
 * @fileoverview Web Worker para el procesamiento de reconocimiento automático de matrículas (ALPR).
 * Maneja la carga de modelos, la detección de matrículas y el reconocimiento OCR.
 */

import { initializeModels } from './modelsLoader.js'
import { prepare_input } from './detector/detector/imageProcessor.js'
import { run_model, process_output_boxes } from './detector/detector/detectionProcessor.js'
import { recognizePlateText } from './ocr/ocr/ocrProcessor.js'
import type { CroppedBox } from './detector/detector/detectionProcessor.js'

/** Resultado del OCR con texto y confianza por carácter. */
interface OcrResult {
  text: string
  confidence: number[]
}

/** Caja con texto OCR añadido, listo para enviar al hilo principal. */
interface PlateBox extends CroppedBox {
  plateText: string | OcrResult
}

/** Inicia la carga y warmup de los modelos inmediatamente al instanciar el Worker. */
const modelsReady = initializeModels()

modelsReady.then((success) => {
  if (success) {
    self.postMessage({ status: 'model_ready' })
  } else {
    self.postMessage({ status: 'model_failed' })
  }
})

/**
 * Manejador de mensajes del Web Worker.
 * Recibe frames para procesar y ejecuta el flujo completo de detección + OCR.
 */
self.onmessage = async (event: MessageEvent<{ imageBitmap: ImageBitmap }>) => {
  const { imageBitmap } = event.data

  const input = prepare_input(imageBitmap)

  if (!(await modelsReady)) {
    self.postMessage({ error: 'No se pudo cargar el modelo' })
    return
  }

  if (!input) {
    self.postMessage({ error: 'No se pudo preparar la entrada de imagen' })
    return
  }

  try {
    const predictions = await run_model(input)
    const boxes = process_output_boxes(predictions, imageBitmap) as PlateBox[]

    for (const box of boxes) {
      box.plateText = await recognizePlateText(box.croppedImage, true)
    }

    self.postMessage(boxes)
  } catch (error) {
    self.postMessage({ error: (error as Error).message })
  }
}
