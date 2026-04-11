/**
 * @fileoverview Módulo encargado de la carga e inicialización de los modelos de IA
 * utilizados para la detección de matrículas y reconocimiento de texto (OCR).
 */

import * as ort from 'onnxruntime-web'
import yoloModelUrl from '/models/yolo-v9-t-384-license-plates-end2end.onnx?url'
import ocrModelUrl from '/models/european_mobile_vit_v2_ocr.onnx?url'
import ocrConfig from '../models/european_mobile_vit_v2_ocr_config.json' with { type: 'json' }

/** Tamaño de entrada del modelo (ancho y alto en píxeles). */
export const MODEL_SIZE = 384
/** Forma del tensor de entrada: [batch, channels, height, width]. */
export const modelInputShape = [1, 3, MODEL_SIZE, MODEL_SIZE]
/** Clases detectables por el modelo YOLOv9. */
export const yolo_classes = ['license_plate']

/** Instancia del modelo YOLOv9, `null` hasta que `initializeModels` complete. */
export let modelYolov9: ort.InferenceSession | null = null
/** Instancia del modelo OCR, `null` hasta que `initializeModels` complete. */
export let ocrModel: ort.InferenceSession | null = null

/**
 * Inicializa ambos modelos (YOLOv9 y OCR) y verifica que estén correctamente cargados.
 *
 * @returns `true` si ambos modelos se cargaron correctamente, `false` en caso contrario.
 */
export async function initializeModels(): Promise<boolean> {
  const yolov9Ready = await initializeModelYolov9()
  if (!yolov9Ready) {
    console.error('Error al cargar el modelo YOLOv9')
    return false
  }

  const ocrReady = await initializeModelOCR()
  if (!ocrReady) {
    console.error('Error al cargar el modelo OCR')
    return false
  }

  return true
}

/**
 * Inicializa el modelo YOLOv9 y realiza un warmup para asegurar rendimiento óptimo.
 *
 * @returns `true` si el modelo se cargó y realizó warmup correctamente.
 */
async function initializeModelYolov9(): Promise<boolean> {
  try {
    console.log('Iniciando carga del modelo...')
    modelYolov9 = await ort.InferenceSession.create(yoloModelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })

    console.log('Modelo cargado. Realizando warmup...')
    const dummyInput = new Float32Array(modelInputShape.reduce((a, b) => a * b))
    for (let i = 0; i < dummyInput.length; i++) {
      dummyInput[i] = Math.random()
    }
    const tensorInput = new ort.Tensor(dummyInput, modelInputShape)
    await modelYolov9.run({ images: tensorInput })

    console.log('Warmup completado. Modelo listo para inferencia.')
    return true
  } catch (error) {
    console.error('Error en la inicialización del modelo:', error)
    return false
  }
}

/**
 * Inicializa el modelo OCR para reconocimiento de texto en matrículas.
 *
 * @returns `true` si el modelo OCR se cargó correctamente.
 */
async function initializeModelOCR(): Promise<boolean> {
  try {
    console.log('Iniciando carga del modelo OCR...', ocrConfig)
    ocrModel = await ort.InferenceSession.create(ocrModelUrl)
    console.log('Modelo OCR cargado correctamente')
    return true
  } catch (error) {
    console.error('Error al cargar el modelo OCR:', error)
    return false
  }
}
