import { describe, expect, it } from 'vitest'
import { DEFAULT_AUDIO_PREFERENCES, normalizeAudioPreferences, perceptual } from './preferences'

describe('preferências de som', () => {
  it('usa os padrões para dados ausentes ou corrompidos', () => {
    expect(normalizeAudioPreferences(null)).toEqual(DEFAULT_AUDIO_PREFERENCES)
    expect(normalizeAudioPreferences({ master: 'alto', music: NaN, muted: 'sim' })).toEqual(DEFAULT_AUDIO_PREFERENCES)
  })

  it('limita os volumes a 0–1 e preserva o que é válido', () => {
    expect(normalizeAudioPreferences({ master: 4, music: -1, effects: 0.3, muted: true })).toEqual({ master: 1, music: 0, effects: 0.3, muted: true })
  })

  it('a curva perceptual vai de 0 a 1 sem salto', () => {
    expect(perceptual(0)).toBe(0)
    expect(perceptual(1)).toBe(1)
    expect(perceptual(0.5)).toBeLessThan(0.5)
  })
})
