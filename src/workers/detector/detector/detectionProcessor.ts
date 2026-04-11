/**
 * @fileoverview Módulo para procesar las detecciones del modelo YOLO.
 * Ejecuta el modelo, procesa su salida y extrae las regiones de imagen con matrículas.
 */

import * as ort from 'onnxruntime-web'
import { modelYolov9, modelInputShape, yolo_classes } from '../../modelsLoader.js'
import { nonMaxSuppression } from './boundingBoxUtils.js'
import { cropImage } from './imageProcessor.js'

/** Caja de detección tras el filtrado y escalado de coordenadas. */
interface RawBox {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  confidence: number
  area: number
}

/** Caja de detección con imagen recortada de la región detectada. */
export interface CroppedBox extends RawBox {
  croppedImage: ImageBitmap
}

/** Resultado interno del procesamiento de la salida del modelo. */
interface DetectionResult {
  label: string
  confidence: number
  bounding_box: { x1: number; y1: number; x2: number; y2: number }
}

/**
 * Ejecuta el modelo de detección YOLO en los datos de entrada proporcionados.
 *
 * @param input - Datos de imagen preprocesados en formato planar.
 * @returns Tensor con las predicciones del modelo.
 */
export async function run_model(input: number[]): Promise<ort.Tensor> {
  const tensorInput = new ort.Tensor(Float32Array.from(input), modelInputShape)
  const outputs = await modelYolov9!.run({ images: tensorInput })
  const outputName = modelYolov9!.outputNames[0]
  return outputs[outputName]
}

/**
 * Procesa las predicciones del modelo y extrae los bounding boxes de las matrículas detectadas.
 * Aplica escalado de coordenadas, filtrado por confianza y tamaño, y non-max suppression.
 *
 * @param predictions - Tensor con las predicciones del modelo YOLO.
 * @param imageBitmap - Imagen original sobre la que se realizó la detección.
 * @returns Array de objetos con la información de cada matrícula detectada e imagen recortada.
 */
export function process_output_boxes(
  predictions: ort.Tensor,
  imageBitmap: ImageBitmap,
): CroppedBox[] {
  const imgWidth = imageBitmap.width
  const imgHeight = imageBitmap.height
  const modelSize = modelInputShape[2]

  const detectionResults = processModelOutput(predictions)
  const confThresh = 0.6
  const dimThresh = 5 * 5

  const boxes: RawBox[] = detectionResults
    .filter((r) => r.confidence > confThresh)
    .map((r) => {
      const { x1, y1, x2, y2 } = r.bounding_box
      const scaleX = imgWidth / modelSize
      const scaleY = imgHeight / modelSize

      const validX1 = Math.max(0, Math.min(imgWidth, x1 * scaleX))
      const validY1 = Math.max(0, Math.min(imgHeight, y1 * scaleY))
      const validX2 = Math.max(0, Math.min(imgWidth, x2 * scaleX))
      const validY2 = Math.max(0, Math.min(imgHeight, y2 * scaleY))

      return {
        x1: validX1,
        y1: validY1,
        x2: validX2,
        y2: validY2,
        label: r.label,
        confidence: r.confidence,
        area: (validX2 - validX1) * (validY2 - validY1),
      }
    })
    .filter((box) => box.x2 > box.x1 && box.y2 > box.y1 && box.area > dimThresh)
    .sort((a, b) => b.confidence - a.confidence)

  const finalBoxes = nonMaxSuppression(boxes)

  return finalBoxes.map((box) => {
    const x = Math.round(box.x1)
    const y = Math.round(box.y1)
    const width = Math.round(box.x2 - box.x1)
    const height = Math.round(box.y2 - box.y1)
    return { ...box, croppedImage: cropImage(imageBitmap, x, y, width, height) }
  })
}

/**
 * Procesa la salida del modelo YOLO y la convierte en un formato estructurado.
 *
 * @param modelOutput - Tensor de salida del modelo YOLO.
 * @returns Array de resultados de detección con label, confidence y bounding_box.
 */
export function processModelOutput(modelOutput: ort.Tensor): DetectionResult[] {
  const data = modelOutput.data as Float32Array
  const dimensions = modelOutput.dims as number[]

  const numDetections = dimensions[0]
  const valuesPerDetection = dimensions[1]

  const detectionResults: DetectionResult[] = []
  for (let i = 0; i < numDetections; i++) {
    const startIdx = i * valuesPerDetection
    const classId = Math.round(data[startIdx])
    detectionResults.push({
      label: yolo_classes[classId],
      confidence: data[startIdx + 6],
      bounding_box: {
        x1: data[startIdx + 1],
        y1: data[startIdx + 2],
        x2: data[startIdx + 3],
        y2: data[startIdx + 4],
      },
    })
  }

  return detectionResults
}
