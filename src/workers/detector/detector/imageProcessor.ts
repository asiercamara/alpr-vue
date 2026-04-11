/**
 * @fileoverview Módulo para el procesamiento de imágenes utilizado por el sistema ALPR.
 * Contiene funciones para preparar, recortar y redimensionar imágenes para su procesamiento
 * por el modelo de detección yolo-v9.
 */

import { MODEL_SIZE } from '../../modelsLoader.js'

/**
 * Prepara una imagen para ser procesada por la red neuronal del sistema ALPR.
 * Redimensiona la imagen al tamaño del modelo y la convierte a un formato de tensor
 * apropiado (RGB normalizado en formato planar).
 *
 * @param imageBitmap - Imagen de entrada en formato ImageBitmap.
 * @returns Array de valores normalizados en formato planar [R,G,B], o null si hubo error.
 */
export function prepare_input(imageBitmap: ImageBitmap): number[] | null {
  const tempCanvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE)
  const context = tempCanvas.getContext('2d')

  try {
    context!.drawImage(imageBitmap, 0, 0, MODEL_SIZE, MODEL_SIZE)

    const imageData = context!.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE)
    if (!imageData?.data?.length) {
      console.warn('No se pudieron obtener datos de imagen válidos')
      return null
    }

    const data = imageData.data
    const red: number[] = []
    const green: number[] = []
    const blue: number[] = []
    for (let index = 0; index < data.length; index += 4) {
      red.push(data[index] / 255)
      green.push(data[index + 1] / 255)
      blue.push(data[index + 2] / 255)
    }

    return [...red, ...green, ...blue]
  } catch (error) {
    console.error('Error al preparar la entrada:', error)
    return null
  }
}

/**
 * Recorta una porción específica de una imagen.
 *
 * @param imageBitmap - Imagen de origen a recortar.
 * @param x - Coordenada X de la esquina superior izquierda del recorte.
 * @param y - Coordenada Y de la esquina superior izquierda del recorte.
 * @param width - Ancho del área a recortar en píxeles.
 * @param height - Alto del área a recortar en píxeles.
 * @returns Imagen recortada en formato ImageBitmap.
 */
export function cropImage(
  imageBitmap: ImageBitmap,
  x: number,
  y: number,
  width: number,
  height: number,
): ImageBitmap {
  const offscreenCanvas = new OffscreenCanvas(width, height)
  const context = offscreenCanvas.getContext('2d')
  context!.drawImage(imageBitmap, x, y, width, height, 0, 0, width, height)
  return offscreenCanvas.transferToImageBitmap()
}

/**
 * Redimensiona una imagen a un tamaño específico.
 *
 * @param imageBitmap - Imagen original a redimensionar.
 * @param targetWidth - Ancho objetivo en píxeles.
 * @param targetHeight - Alto objetivo en píxeles.
 * @returns Promesa con la imagen redimensionada.
 */
export async function resizeImage(
  imageBitmap: ImageBitmap,
  targetWidth: number,
  targetHeight: number,
): Promise<ImageBitmap> {
  const canvas = new OffscreenCanvas(targetWidth, targetHeight)
  const ctx = canvas.getContext('2d')
  ctx!.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)
  return canvas.transferToImageBitmap()
}
