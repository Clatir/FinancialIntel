/**
 * Sounds of the events (spec, „Dźwięki”): synthesized with WebAudio – no files, no licences – one switch per event and
 * one volume, per computer (config.json).
 */
import type { SoundKind } from '@shared/machine'
import { useMachine } from '../store/machine'

/** Notes of each sound: [frequency Hz, start s, length s, wave]. */
const NOTES: Record<SoundKind, Array<[number, number, number, OscillatorType]>> = {
  // A short soft blip: the entry is in.
  entry: [
    [880, 0, 0.07, 'sine'],
    [1320, 0.06, 0.09, 'sine']
  ],
  // Rising: the delivery docked.
  docking: [
    [523.25, 0, 0.12, 'triangle'],
    [659.25, 0.1, 0.12, 'triangle'],
    [783.99, 0.2, 0.2, 'triangle']
  ],
  // Two low beeps.
  alarm: [
    [440, 0, 0.12, 'square'],
    [330, 0.18, 0.16, 'square']
  ],
  promotion: [
    [523.25, 0, 0.14, 'triangle'],
    [659.25, 0.12, 0.14, 'triangle'],
    [783.99, 0.24, 0.14, 'triangle'],
    [1046.5, 0.36, 0.34, 'triangle']
  ],
  // „Miesiąc zamknięty na plus”: a calm rising chord.
  plus: [
    [392, 0, 0.5, 'sine'],
    [523.25, 0.12, 0.5, 'sine'],
    [659.25, 0.24, 0.6, 'sine']
  ]
}

let ctx: AudioContext | null = null

/** Play an event's sound when this computer has it on; `force` = the settings' „Odsłuchaj”. */
export function playSound(kind: SoundKind, force = false): void {
  const s = useMachine.getState().prefs.sounds
  if (!force && (!s.enabled || !s.events[kind])) return
  if (s.volume <= 0) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime + 0.01
    const master = ctx.createGain()
    // Square waves are loud: a quarter of the volume.
    master.gain.value = s.volume * 0.35
    master.connect(ctx.destination)
    for (const [freq, start, len, wave] of NOTES[kind]) {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = wave
      osc.frequency.value = freq
      const peak = wave === 'square' ? 0.25 : 1
      env.gain.setValueAtTime(0.0001, t0 + start)
      env.gain.exponentialRampToValueAtTime(peak, t0 + start + 0.012)
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + start + len)
      osc.connect(env).connect(master)
      osc.start(t0 + start)
      osc.stop(t0 + start + len + 0.02)
    }
  } catch {
    /* no audio device: silence */
  }
}
