/**
 * @fileoverview Procesador principal de OCR para reconocimiento de texto en matrículas.
 * Integra el preprocesamiento de imágenes, la ejecución del modelo OCR
 * y el postprocesamiento del texto detectado.
 */

import * as ort from 'onnxruntime-web'
import { ocrModel } from '../../modelsLoader.js'
import { preprocessImage } from './imageProcessor.js'
import { postprocessOutput } from './textProcessor.js'
import ocrConfig from '../../../models/european_mobile_vit_v2_ocr_config.json' with { type: 'json' }

/** Resultado del reconocimiento OCR con texto y confianza por carácter. */
interface OcrResult {
  text: string
  confidence: number[]
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
    const output = await runOcrModel(inputData, inputHeight, inputWidth)

    return postprocessOutput(output, ocrConfig, returnConfidence)
  } catch (error) {
    console.error('Error en OCR:', error)
    return returnConfidence ? { text: '', confidence: [] } : ''
  }
}

/**
 * Ejecuta el modelo OCR en los datos de entrada proporcionados.
 *
 * @param input - Datos de imagen preprocesados en escala de grises.
 * @param height - Altura de la imagen en píxeles.
 * @param width - Anchura de la imagen en píxeles.
 * @returns Salida del modelo OCR como Float32Array.
 */
export async function runOcrModel(
  input: Uint8Array,
  height: number,
  width: number,
): Promise<Float32Array> {
  if (!ocrModel) {
    throw new Error('Modelo OCR no inicializado')
  }

  const tensorInput = new ort.Tensor('uint8', input, [1, height, width, 1])
  const outputs = await ocrModel.run({ input: tensorInput })
  const outputName = Object.keys(outputs)[0]
  return outputs[outputName].data as Float32Array
}
