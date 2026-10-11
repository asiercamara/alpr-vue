/**
 * @fileoverview Procesador principal de OCR para reconocimiento de texto en matrículas.
 * Integra el preprocesamiento de imágenes, la ejecución del modelo OCR
 * y el postprocesamiento del texto detectado.
 */

import * as ort from 'onnxruntime-web'
import { ocrModel } from '../../modelsLoader.js'
import { preprocessImage } from './imageProcessor.js'
import { decodeRegion, postprocessOutput } from './textProcessor.js'
import ocrConfig from '../../../models/cct_xs_v2_global_ocr_config.json' with { type: 'json' }

/** Resultado del reconocimiento OCR con texto, confianza por carácter y región. */
interface OcrResult {
  text: string
  confidence: number[]
  region?: string
}

/** Salidas en bruto del modelo OCR. */
interface OcrModelOutput {
  /** Probabilidades por slot y carácter, en formato plano. */
  plate: Float32Array
  /** Probabilidades por región. */
  region: Float32Array
}

/**
 * Reconoce el texto de una placa de matrícula usando OCR.
 *
 * @param plateImage - Imagen de la matrícula recortada.
 * @param returnConfidence - Si se debe devolver la confianza para cada carácter.
 * @returns Texto reconocido o objeto con texto y valores de confianza.
 */
export async function recognizePlateText(
  plateImage: ImageBitmap,
  returnConfidence = false,
): Promise<string | OcrResult> {
  try {
    const inputWidth = ocrConfig.img_width
    const inputHeight = ocrConfig.img_height

    const inputData = preprocessImage(plateImage, inputHeight, inputWidth)
    const { plate, region } = await runOcrModel(inputData, inputHeight, inputWidth)

    const result = postprocessOutput(plate, ocrConfig, returnConfidence)
    if (typeof result === 'string') return result
    return { ...result, region: decodeRegion(region, ocrConfig.plate_regions) }
  } catch (error) {
    console.error('Error en OCR:', error)
    return returnConfidence ? { text: '', confidence: [] } : ''
  }
}

/**
 * Ejecuta el modelo OCR en los datos de entrada proporcionados.
 *
 * @param input - Datos de imagen RGB preprocesados.
 * @param height - Altura de la imagen en píxeles.
 * @param width - Anchura de la imagen en píxeles.
 * @returns Salidas `plate` y `region` del modelo OCR como Float32Array.
 */
export async function runOcrModel(
  input: Uint8Array,
  height: number,
  width: number,
): Promise<OcrModelOutput> {
  if (!ocrModel) {
    throw new Error('Modelo OCR no inicializado')
  }

  const tensorInput = new ort.Tensor('uint8', input, [1, height, width, 3])
  const outputs = await ocrModel.run({ input: tensorInput })
  return {
    plate: outputs.plate.data as Float32Array,
    region: outputs.region.data as Float32Array,
  }
}
