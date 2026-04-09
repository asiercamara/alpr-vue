export function playBeep(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
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

export function triggerVibration(): void {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }
  } catch {
    // Vibration not available, silently skip
  }
}

export function notifyDetection(): void {
  playBeep()
  triggerVibration()
}