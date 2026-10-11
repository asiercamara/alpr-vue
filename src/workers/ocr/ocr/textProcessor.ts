/**
 * @fileoverview Utilidades para procesar la salida del modelo OCR.
 * Transforma la salida bruta del modelo en texto legible de matrículas.
 */

/** Configuración del modelo OCR leída del JSON de configuración. */
interface OcrConfig {
  max_plate_slots: number
  alphabet: string
  pad_char?: string
  img_width: number
  img_height: number
}

/** Resultado del OCR con texto y confianzas por carácter. */
interface OcrResult {
  text: string
  confidence: number[]
  /** País o región reconocidos, si el modelo los predice. */
  region?: string
}

/**
 * Postprocesa la salida del modelo OCR para obtener el texto de la matrícula.
 *
 * @param modelOutput - Salida del modelo OCR en formato plano.
 * @param config - Configuración del modelo OCR.
 * @param returnConfidence - Si se debe devolver la confianza por carácter.
 * @returns Texto de la matrícula o objeto con texto y confianzas.
 */
export function postprocessOutput(
  modelOutput: Float32Array,
  config: OcrConfig,
  returnConfidence = false,
): string | OcrResult {
  const { max_plate_slots: maxPlateSlots, alphabet, pad_char: padChar = '-' } = config
  const alphabetLength = alphabet.length

  const predictions = reshapeOutput(modelOutput, maxPlateSlots, alphabetLength)
  const predictionIndices = getMaxIndices(predictions, maxPlateSlots)
  const plateChars = mapIndicesToChars(predictionIndices, alphabet)
  const plateText = plateChars.join('')
  const cleanedPlateText = fixSpanishPlateDigits(cleanPlateText(plateText, padChar))

  if (returnConfidence) {
    const confidenceValues = getMaxValues(predictions, maxPlateSlots)
    return {
      text: cleanedPlateText,
      confidence: confidenceValues.slice(0, cleanedPlateText.length),
    }
  }

  return cleanedPlateText
}

/**
 * Reshape del output del modelo de [maxPlateSlots * alphabetLength] a [maxPlateSlots][alphabetLength].
 */
function reshapeOutput(
  output: Float32Array,
  maxPlateSlots: number,
  alphabetLength: number,
): number[][] {
  const totalElements = maxPlateSlots * alphabetLength
  if (output.length !== totalElements) {
    throw new Error(
      `Tamaño de salida incorrecto. Esperado: ${totalElements}, Recibido: ${output.length}`,
    )
  }
  const reshaped: number[][] = []
  for (let i = 0; i < maxPlateSlots; i++) {
    const start = i * alphabetLength
    reshaped.push(Array.from(output.slice(start, start + alphabetLength)))
  }
  return reshaped
}

/**
 * Decodifica la cabeza de región del modelo OCR.
 *
 * @param regionOutput - Probabilidades por región en formato plano.
 * @param regions - Nombres de región en el orden de salida del modelo.
 * @returns Nombre de la región con mayor probabilidad.
 */
export function decodeRegion(regionOutput: Float32Array, regions: string[]): string {
  if (regionOutput.length !== regions.length) {
    throw new Error(
      `Tamaño de región incorrecto. Esperado: ${regions.length}, Recibido: ${regionOutput.length}`,
    )
  }
  let maxIndex = 0
  for (let i = 1; i < regionOutput.length; i++) {
    if (regionOutput[i] > regionOutput[maxIndex]) maxIndex = i
  }
  return regions[maxIndex]
}

/** Obtiene el índice del valor máximo por cada slot de carácter. */
function getMaxIndices(predictions: number[][], maxPlateSlots: number): number[] {
  const indices: number[] = []
  for (let i = 0; i < maxPlateSlots; i++) {
    const slotPredictions = predictions[i]
    let maxIndex = 0
    let maxValue = slotPredictions[0]
    for (let j = 1; j < slotPredictions.length; j++) {
      if (slotPredictions[j] > maxValue) {
        maxValue = slotPredictions[j]
        maxIndex = j
      }
    }
    indices.push(maxIndex)
  }
  return indices
}

/** Obtiene el valor máximo (confianza) por cada slot de carácter. */
function getMaxValues(predictions: number[][], maxPlateSlots: number): number[] {
  const values: number[] = []
  for (let i = 0; i < maxPlateSlots; i++) {
    const slotPredictions = predictions[i]
    let maxValue = slotPredictions[0]
    for (let j = 1; j < slotPredictions.length; j++) {
      if (slotPredictions[j] > maxValue) maxValue = slotPredictions[j]
    }
    values.push(maxValue)
  }
  return values
}

/** Mapea índices numéricos a caracteres del alfabeto. */
function mapIndicesToChars(indices: number[], alphabet: string): string[] {
  return indices.map((index) => alphabet[index])
}

/**
 * Limpia el texto de la matrícula eliminando caracteres de relleno al final.
 *
 * @param plateText - Texto con posibles caracteres de relleno.
 * @param padChar - Carácter de relleno a eliminar.
 * @returns Texto limpio sin caracteres de relleno.
 */
export function cleanPlateText(plateText: string, padChar = '-'): string {
  const escapedPadChar = padChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // padChar se escapa arriba, por lo que no puede inyectar sintaxis de regex
  // eslint-disable-next-line security/detect-non-literal-regexp
  return plateText.replace(new RegExp(`${escapedPadChar}+$`), '')
}

/**
 * Corrige confusiones letra/dígito en matrículas españolas actuales (4 dígitos + 3 consonantes).
 * Las letras de la matrícula nunca son vocales ni Q, así que una O, Q o I en el bloque numérico
 * solo puede ser un 0 o un 1. Cualquier texto con otra forma se devuelve sin cambios.
 *
 * @param plateText - Texto de la matrícula ya limpio.
 * @returns Texto con los dígitos corregidos si encaja con el formato español.
 */
export function fixSpanishPlateDigits(plateText: string): string {
  if (!/^[0-9OQI]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/.test(plateText)) return plateText
  return plateText.slice(0, 4).replace(/[OQ]/g, '0').replace(/I/g, '1') + plateText.slice(4)
}
