import { getState } from '../store/gameStore'

let audioContext: AudioContext | null = null

export function beep(frequency: number, duration: number, volume: number): void {
  if (!getState().sound) return
  try {
    const AudioContextImpl =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext
    if (!AudioContextImpl) return
    audioContext = audioContext || new AudioContextImpl()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, audioContext.currentTime)
    gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + duration + 0.02)
  } catch {
    // 浏览器不支持或禁止音频时静默降级。
  }
}
