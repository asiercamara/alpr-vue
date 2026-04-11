/**
 * Audio and haptic feedback utilities triggered on plate confirmation.
 */
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

/**
 * Plays an 800 Hz sine-wave beep for 200 ms using the Web Audio API.
 *
 * Silent no-op when `AudioContext` is unavailable (e.g., SSR or restricted browser).
 */
export function playBeep(): void {
  try {
    const AudioCtx = window.AudioContext ?? window.webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.2)

    oscillator.onended = () => {
      ctx.close()
    }
  } catch {
    // AudioContext not available, silently skip
  }
}

/**
 * Triggers a 200 ms vibration via `navigator.vibrate`.
 *
 * No-op on iOS or desktop browsers that do not implement the Vibration API.
 */
export function triggerVibration(): void {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }
  } catch {
    // Vibration not available, silently skip
  }
}

/**
 * Fires audio and haptic feedback simultaneously.
 *
 * Safe to call when either channel is unavailable — each falls back independently.
 */
export function notifyDetection(): void {
  playBeep()
  triggerVibration()
}
