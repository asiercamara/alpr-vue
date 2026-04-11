import type { WorkerResponse } from './detection'

/** Message sent from the main thread to the detection Worker. */
export interface WorkerInput {
  /** Video frame to process. Ownership is transferred to the Worker via Transferable. */
  imageBitmap: ImageBitmap
}

/** Typed Worker that accepts `WorkerInput` and responds with `WorkerResponse`. */
export type DetectionWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage(message: WorkerInput, transfer: Transferable[]): void
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null
}
