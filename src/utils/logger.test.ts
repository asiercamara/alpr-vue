import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('error calls console.error in dev mode', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { logger } = await import('@/utils/logger')
    logger.error('test error', 42)
    expect(spy).toHaveBeenCalledWith('test error', 42)
  })

  it('warn calls console.warn in dev mode', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { logger } = await import('@/utils/logger')
    logger.warn('test warning', { detail: true })
    expect(spy).toHaveBeenCalledWith('test warning', { detail: true })
  })

  it('error is silent when DEV is false', async () => {
    vi.stubEnv('DEV', false)
    const { logger } = await import('@/utils/logger')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('should be silent')
    expect(spy).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('warn is silent when DEV is false', async () => {
    vi.stubEnv('DEV', false)
    const { logger } = await import('@/utils/logger')
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('should be silent')
    expect(spy).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
