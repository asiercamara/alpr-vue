/**
 * @fileoverview Utilidades para el procesamiento de cajas delimitadoras (bounding boxes).
 * Incluye funciones para calcular la intersección, unión, y aplicar el algoritmo de
 * supresión de no máximos (NMS) para eliminar detecciones redundantes.
 */

/** Caja delimitadora con coordenadas, etiqueta de clase y área. */
interface BoundingBox {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  area: number
  confidence: number
}

/**
 * Algoritmo de Supresión de No Máximos (NMS).
 * Elimina las cajas delimitadoras redundantes basándose en su superposición (IoU)
 * y dejando solo las detecciones más confiables.
 *
 * @param boxes - Array de cajas delimitadoras ordenadas por confianza descendente.
 * @returns Array filtrado con las cajas delimitadoras no suprimidas.
 */
export function nonMaxSuppression(boxes: BoundingBox[]): BoundingBox[] {
  const result: BoundingBox[] = []
  let remaining = [...boxes]
  while (remaining.length > 0) {
    result.push(remaining[0])
    remaining = remaining.filter(
      (box) => iou(remaining[0], box) < 0.7 || remaining[0].label !== box.label,
    )
  }
  return result
}

/**
 * Calcula el índice IoU (Intersection over Union) entre dos cuadros delimitadores.
 *
 * @param box1 - Primer cuadro delimitador.
 * @param box2 - Segundo cuadro delimitador.
 * @returns Valor IoU entre 0 (sin superposición) y 1 (superposición completa).
 */
export function iou(box1: BoundingBox, box2: BoundingBox): number {
  const intersectionArea = intersection(box1, box2)
  const unionArea = union(box1, box2)
  if (unionArea === 0) return 0
  return intersectionArea / unionArea
}

/**
 * Calcula el área de la unión de dos cuadros delimitadores.
 *
 * @param box1 - Primer cuadro delimitador.
 * @param box2 - Segundo cuadro delimitador.
 * @returns Área de la unión en píxeles cuadrados.
 */
export function union(box1: BoundingBox, box2: BoundingBox): number {
  return box1.area + box2.area - intersection(box1, box2)
}

/**
 * Calcula el área de intersección entre dos cuadros delimitadores.
 *
 * @param box1 - Primer cuadro delimitador.
 * @param box2 - Segundo cuadro delimitador.
 * @returns Área de intersección en píxeles cuadrados. 0 si no hay intersección.
 */
export function intersection(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1.x1, box2.x1)
  const y1 = Math.max(box1.y1, box2.y1)
  const x2 = Math.min(box1.x2, box2.x2)
  const y2 = Math.min(box1.y2, box2.y2)

  const width = Math.max(0, x2 - x1)
  const height = Math.max(0, y2 - y1)

  return width * height
}
