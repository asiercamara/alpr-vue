/**
 * Centralized logger that suppresses output in production builds.
 *
 * All `console.error` / `console.warn` calls in composables and utils should
 * go through this module so that end users never see internal errors in the
 * browser console, while developers retain full visibility in dev mode.
 *
 * @example
 * ```ts
 * import { logger } from '@/utils/logger'
 * logger.error('Worker error:', err)
 * ```
 */
const isDev = import.meta.env.DEV

export const logger = {
  /**
   * Logs an error message. No-op in production builds.
   *
   * @param args - Values forwarded verbatim to `console.error`.
   */
  error: (...args: unknown[]): void => {
    if (isDev) console.error(...args)
  },
  /**
   * Logs a warning message. No-op in production builds.
   *
   * @param args - Values forwarded verbatim to `console.warn`.
   */
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args)
  },
}
