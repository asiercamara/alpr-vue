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
  const cleanedPlateText = cleanPlateText(plateText, padChar)

  if (returnConfidence) {
    const confidenceValues = getMaxValues(predictions, maxPlateSlots)
    return { text: cleanedPlateText, confidence: confidenceValues }
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
  return plateText.replace(new RegExp(`${escapedPadChar}+$`), '')
}
