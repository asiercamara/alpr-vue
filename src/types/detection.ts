export interface PlateTextResult {
  text: string
  confidence: number[]
}

export interface DetectionBox {
  x1: number
  y1: number
  x2: number
  y2: number
  plateText: PlateTextResult
  croppedImage: ImageBitmap
  confidence: number
  area: number
}

export interface PlateRecord {
  id: string
  text: string
  confidence: number
  croppedImage: ImageBitmap | null
  boundingBox: { x1: number; y1: number; x2: number; y2: number } | null
  plateText: PlateTextResult
  timestamp: Date
  occurrences?: number
  originalBoundingBox?: { x1: number; y1: number; x2: number; y2: number } | null
}

export type WorkerResponse =
  | { status: 'model_ready' }
  | { status: 'model_failed' }
  | { error: string }
  | DetectionBox[]