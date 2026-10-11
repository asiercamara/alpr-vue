/**
 * @fileoverview Utilidades para el procesamiento de imágenes de matrículas para OCR.
 * Contiene funciones para preparar imágenes para ser procesadas por el modelo OCR,
 * incluyendo redimensionamiento y extracción de los canales RGB.
 */

/**
 * Preprocesa una imagen de matrícula para el reconocimiento OCR.
 * Redimensiona la imagen al tamaño esperado por el modelo y descarta el canal alfa.
 *
 * @param imageBitmap - Imagen de la matrícula a procesar.
 * @param targetHeight - Altura objetivo para redimensionar (píxeles).
 * @param targetWidth - Anchura objetivo para redimensionar (píxeles).
 * @returns Píxeles RGB intercalados (0-255) en orden [height, width, 3].
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

  return extractRgb(imageData.data)
}

/**
 * Convierte datos RGBA en RGB descartando el canal alfa.
 *
 * @param imageData - Datos de la imagen en formato RGBA.
 * @returns Datos de la imagen en formato RGB (valores 0-255).
 */
export function extractRgb(imageData: Uint8ClampedArray): Uint8Array {
  const rgbData = new Uint8Array((imageData.length / 4) * 3)
  for (let i = 0, j = 0; i < imageData.length; i += 4, j += 3) {
    rgbData[j] = imageData[i]
    rgbData[j + 1] = imageData[i + 1]
    rgbData[j + 2] = imageData[i + 2]
  }
  return rgbData
}

/**
 * Crea un descriptor de tensor para ONNX Runtime a partir de los datos de la imagen.
 *
 * @param inputData - Datos RGB preprocesados de la imagen.
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
    dims: [1, height, width, 3],
    data: inputData,
    type: 'uint8',
  }
}
