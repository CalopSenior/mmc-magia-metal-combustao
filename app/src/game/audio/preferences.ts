/** Sound belongs to the player/device, like the visual preferences: the same in every save. */
export interface AudioPreferences {
  /** 0–1 each. */
  master: number
  music: number
  /** Machines, building and alerts. */
  effects: number
  muted: boolean
}

export const AUDIO_PREFERENCES_KEY = 'mmc-audio-preferences-v1'
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = { master: 0.8, music: 0.6, effects: 0.8, muted: false }

const level = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback

export function normalizeAudioPreferences(value: unknown): AudioPreferences {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    master: level(data.master, DEFAULT_AUDIO_PREFERENCES.master),
    music: level(data.music, DEFAULT_AUDIO_PREFERENCES.music),
    effects: level(data.effects, DEFAULT_AUDIO_PREFERENCES.effects),
    muted: typeof data.muted === 'boolean' ? data.muted : DEFAULT_AUDIO_PREFERENCES.muted,
  }
}

export function readAudioPreferences(): AudioPreferences {
  try { return normalizeAudioPreferences(JSON.parse(localStorage.getItem(AUDIO_PREFERENCES_KEY) ?? 'null')) }
  catch { return { ...DEFAULT_AUDIO_PREFERENCES } }
}

export function writeAudioPreferences(preferences: AudioPreferences): void {
  try { localStorage.setItem(AUDIO_PREFERENCES_KEY, JSON.stringify(preferences)) } catch { /* The session still works without storage. */ }
}

/** Sliders feel natural when the loudness curve is perceptual: 0.5 on the slider is not half the amplitude. */
export function perceptual(value: number): number {
  return value * value
}
