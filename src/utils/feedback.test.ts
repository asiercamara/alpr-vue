import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { playBeep, triggerVibration, notifyDetection } from '@/utils/feedback'

describe('feedback', () => {
  let originalVibrate: typeof navigator.vibrate | undefined

  beforeEach(() => {
    originalVibrate = navigator.vibrate
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    navigator.vibrate = originalVibrate
  })

  describe('playBeep', () => {
    it('creates oscillator, configures and plays beep', () => {
      const mockStart = vi.fn()
      const mockStop = vi.fn()
      const mockClose = vi.fn()
      const mockConnect = vi.fn()
      const mockGainConnect = vi.fn()
      const mockSetValueAtTime = vi.fn()
      const mockExponentialRamp = vi.fn()

      const mockOscillator = {
        connect: mockConnect,
        start: mockStart,
        stop: mockStop,
        onended: null as (() => void) | null,
        frequency: { value: 0 },
        type: '',
      }
      const mockGainNode = {
        connect: mockGainConnect,
        gain: {
          setValueAtTime: mockSetValueAtTime,
          exponentialRampToValueAtTime: mockExponentialRamp,
        },
      }

      function MockAudioContext(this: any) {
        this.createOscillator = () => mockOscillator
        this.createGain = () => mockGainNode
        this.destination = {}
        this.currentTime = 0
        this.close = mockClose
      }

      vi.stubGlobal('AudioContext', MockAudioContext)
      vi.stubGlobal('webkitAudioContext', undefined)

      playBeep()

      expect(mockConnect).toHaveBeenCalledWith(mockGainNode)
      expect(mockGainConnect).toHaveBeenCalled()
      expect(mockOscillator.frequency.value).toBe(800)
      expect(mockOscillator.type).toBe('sine')
      expect(mockStart).toHaveBeenCalledWith(0)
      expect(mockStop).toHaveBeenCalledWith(0.2)
      expect(mockSetValueAtTime).toHaveBeenCalledWith(0.3, 0)
      expect(mockExponentialRamp).toHaveBeenCalledWith(0.01, 0.2)

      expect(mockOscillator.onended).not.toBeNull()
      mockOscillator.onended!()
      expect(mockClose).toHaveBeenCalled()
    })

    it('handles missing AudioContext gracefully', () => {
      vi.stubGlobal('AudioContext', undefined)
      vi.stubGlobal('webkitAudioContext', undefined)

      expect(() => playBeep()).not.toThrow()
    })
  })

  describe('triggerVibration', () => {
    it('calls navigator.vibrate with 200ms', () => {
      navigator.vibrate = vi.fn().mockReturnValue(true)

      triggerVibration()

      expect(navigator.vibrate).toHaveBeenCalledWith(200)
    })

    it('handles missing navigator.vibrate gracefully', () => {
      navigator.vibrate = undefined as any

      expect(() => triggerVibration()).not.toThrow()
    })
  })

  describe('notifyDetection', () => {
    it('calls both playBeep and triggerVibration', () => {
      navigator.vibrate = vi.fn().mockReturnValue(true)

      const mockStart = vi.fn()
      function MockAudioContext(this: any) {
        this.createOscillator = () => ({
          connect: vi.fn(),
          start: mockStart,
          stop: vi.fn(),
          onended: null,
          frequency: { value: 0 },
          type: '',
        })
        this.createGain = () => ({
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        })
        this.destination = {}
        this.currentTime = 0
        this.close = vi.fn()
      }

      vi.stubGlobal('AudioContext', MockAudioContext)
      vi.stubGlobal('webkitAudioContext', undefined)

      notifyDetection()

      expect(mockStart).toHaveBeenCalled()
      expect(navigator.vibrate).toHaveBeenCalledWith(200)
    })
  })
})