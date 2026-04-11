import type { DetectionBox, PlateRecord, PlateTextResult } from '@/types/detection'

/**
 * Creates a minimal `PlateTextResult` suitable for use in tests.
 * Default: 6-character plate with 0.9 confidence per character.
 */
export function createMockPlateText(overrides?: Partial<PlateTextResult>): PlateTextResult {
  return {
    text: 'AB1234',
    confidence: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
    ...overrides,
  }
}

/**
 * Creates a mock `ImageBitmap`-shaped object for use in tests.
 * jsdom does not implement ImageBitmap; this returns a plain object with
 * the relevant properties typed as `ImageBitmap`.
 */
export function createMockBitmap(overrides?: Partial<ImageBitmap>): ImageBitmap {
  return {
    width: 100,
    height: 50,
    close: () => {},
    ...overrides,
  } as ImageBitmap
}

/**
 * Creates a `DetectionBox` with sensible defaults.
 * Override any field to target specific code paths.
 */
export function createMockDetectionBox(overrides?: Partial<DetectionBox>): DetectionBox {
  return {
    x1: 10,
    y1: 20,
    x2: 110,
    y2: 70,
    confidence: 0.9,
    area: 5000,
    plateText: createMockPlateText(),
    croppedImage: createMockBitmap(),
    ...overrides,
  }
}

/**
 * Creates a `PlateRecord` with sensible defaults.
 * Override any field to target specific code paths.
 */
export function createMockPlateRecord(overrides?: Partial<PlateRecord>): PlateRecord {
  return {
    id: `plate_test_${Math.random().toString(36).slice(2, 9)}`,
    text: 'AB1234',
    confidence: 0.9,
    croppedImage: null,
    boundingBox: { x1: 10, y1: 20, x2: 110, y2: 70 },
    plateText: createMockPlateText(),
    timestamp: new Date('2025-01-01T12:00:00'),
    ...overrides,
  }
}

/**
 * Creates a mock `CanvasRenderingContext2D` with all drawing methods stubbed as no-ops.
 * The returned object is typed as the real interface to catch API drift.
 */
export function createMockCanvas2DContext(
  overrides?: Partial<CanvasRenderingContext2D>,
): CanvasRenderingContext2D {
  return {
    clearRect: () => {},
    strokeRect: () => {},
    fillRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 100 }) as TextMetrics,
    drawImage: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(0) }) as ImageData,
    strokeStyle: '#000',
    fillStyle: '#000',
    lineWidth: 1,
    font: '16px sans-serif',
    ...overrides,
  } as unknown as CanvasRenderingContext2D
}
