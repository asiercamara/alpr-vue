/** OCR output for a single detected license plate. */
export interface PlateTextResult {
  /** Recognized plate string (uppercase, may include hyphens or spaces). */
  text: string
  /** Per-character confidence scores in `[0, 1]`, parallel to each character in `text`. */
  confidence: number[]
}

/** Raw detection result from the Web Worker, containing bounding box coordinates, OCR output, and cropped image. */
export interface DetectionBox {
  /** Pixel coordinate of the left edge of the bounding box in the original frame's resolution. */
  x1: number
  /** Pixel coordinate of the top edge of the bounding box in the original frame's resolution. */
  y1: number
  /** Pixel coordinate of the right edge of the bounding box in the original frame's resolution. */
  x2: number
  /** Pixel coordinate of the bottom edge of the bounding box in the original frame's resolution. */
  y2: number
  /** OCR result for this detected region. */
  plateText: PlateTextResult
  /** Cropped `ImageBitmap` of the plate region. Must be closed after use to free GPU memory. */
  croppedImage: ImageBitmap
  /** YOLO detection confidence in `[0, 1]`. */
  confidence: number
  /** Bounding box area in pixels. Used to filter out noise (min 5×5 px threshold). */
  area: number
}

/** Persisted detection record stored in `plateStore` after passing quality validation. */
export interface PlateRecord {
  /** Unique identifier for this detection record. */
  id: string
  /** Recognized plate text (may be edited by the user after detection). */
  text: string
  /** Mean OCR confidence in `[0, 1]` for this detection. */
  confidence: number
  /** Cropped plate image, or `null` if unavailable. */
  croppedImage: ImageBitmap | null
  /** Bounding box at the time of detection, or `null` if unavailable. */
  boundingBox: { x1: number; y1: number; x2: number; y2: number } | null
  /** Full OCR result including per-character confidence scores. */
  plateText: PlateTextResult
  /** Date and time when this plate was first detected. */
  timestamp: Date
  /** Number of times this plate was observed within its confirmation window. */
  occurrences?: number
  /** Bounding box at the time of first detection, preserved across text edits. */
  originalBoundingBox?: { x1: number; y1: number; x2: number; y2: number } | null
  /** `true` once the plate has passed the time-based confirmation window in camera mode. */
  confirmed?: boolean
}

/** Union of all message shapes the detection Worker can send to the main thread. */
export type WorkerResponse =
  | { status: 'model_ready' }
  | { status: 'model_failed' }
  | { error: string }
  | DetectionBox[]
