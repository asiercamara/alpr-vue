/**
 * @fileoverview Utilidades para el procesamiento de imágenes de matrículas para OCR.
 * Contiene funciones para preparar imágenes para ser procesadas por el modelo OCR,
 * incluyendo redimensionamiento y conversión a escala de grises.
 */

/**
 * Preprocesa una imagen de matrícula para el reconocimiento OCR.
 * Redimensiona la imagen al tamaño esperado por el modelo y la convierte a escala de grises.
 *
 * @param imageBitmap - Imagen de la matrícula a procesar.
 * @param targetHeight - Altura objetivo para redimensionar (píxeles).
 * @param targetWidth - Anchura objetivo para redimensionar (píxeles).
 * @returns Tensor de entrada para el modelo OCR en formato [batch, height, width, channels].
 */
export function preprocessImage(
  imageBitmap: ImageBitmap,
  targetHeight: number,
  targetWidth: number,
): Uint8Array {
  const canvas = new OffscreenCanvas(targetWidth, targetHeight)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  ctx!.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)
  const imageData = ctx!.getImageData(0, 0, targetWidth, targetHeight)

  const grayscaleData = convertToGrayscale(imageData.data)

  const inputData = new Uint8Array(targetHeight * targetWidth)
  for (let i = 0; i < grayscaleData.length; i++) {
    inputData[i] = grayscaleData[i]
  }

  return inputData
}

/**
 * Convierte los datos de imagen RGB a escala de grises.
 * Usa la fórmula ponderada estándar: Gray = 0.299*R + 0.587*G + 0.114*B
 *
 * @param imageData - Datos de la imagen en formato RGBA.
 * @returns Datos de la imagen en escala de grises (valores 0-255).
 */
export function convertToGrayscale(imageData: Uint8ClampedArray): Uint8Array {
  const grayscaleData = new Uint8Array(imageData.length / 4)
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i]
    const g = imageData[i + 1]
    const b = imageData[i + 2]
    grayscaleData[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  }
  return grayscaleData
}

/**
 * Crea un descriptor de tensor para ONNX Runtime a partir de los datos de la imagen.
 *
 * @param inputData - Datos preprocesados de la imagen.
 * @param height - Altura de la imagen en píxeles.
 * @param width - Anchura de la imagen en píxeles.
 * @returns Descriptor del tensor con dims, data y type.
 */
export function createInputTensor(
  inputData: Uint8Array,
  height: number,
  width: number,
): { dims: number[]; data: Uint8Array; type: string } {
  return {
    dims: [1, height, width, 1],
    data: inputData,
    type: 'uint8',
  }
}
