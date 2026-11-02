import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyVisualPreferences, DEFAULT_VISUAL_PREFERENCES, nextGrid, normalizeVisualPreferences, readVisualPreferences, VISUAL_PREFERENCES_KEY } from './visualPreferences'

afterEach(() => vi.unstubAllGlobals())

describe('preferências de acessibilidade', () => {
  it('valida valores antigos ou corrompidos sem aceitar strings como booleanos', () => {
    expect(normalizeVisualPreferences(null)).toEqual(DEFAULT_VISUAL_PREFERENCES)
    expect(normalizeVisualPreferences({ font: 'unknown', grid: 123, largeText: 'false', highContrast: {}, reducedMotion: 1 })).toEqual(DEFAULT_VISUAL_PREFERENCES)
    expect(normalizeVisualPreferences({ font: 'readable', grid: 'strong', reducedMotion: true })).toEqual({ ...DEFAULT_VISUAL_PREFERENCES, font: 'readable', grid: 'strong', reducedMotion: true })
  })

  it('começa com as preferências de movimento e contraste do sistema', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    vi.stubGlobal('localStorage', { getItem: () => null })
    expect(readVisualPreferences()).toEqual({ ...DEFAULT_VISUAL_PREFERENCES, highContrast: true, reducedMotion: true })
  })

  it('persiste a escolha explícita do jogador independentemente de saves de mundo', () => {
    let saved = ''
    const dataset: Record<string, string> = {}
    vi.stubGlobal('document', { documentElement: { dataset } })
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    vi.stubGlobal('localStorage', {
      setItem: (key: string, value: string) => { expect(key).toBe(VISUAL_PREFERENCES_KEY); saved = value },
      getItem: () => saved,
    })
    const chosen = { ...DEFAULT_VISUAL_PREFERENCES, font: 'readable' as const, largeText: true, grid: 'strong' as const }
    applyVisualPreferences(chosen)
    expect(readVisualPreferences()).toEqual(chosen)
    expect(dataset.font).toBe('readable')
    expect(dataset.largeText).toBe('true')
  })

  it('continua acessível quando o armazenamento é bloqueado ou inválido', () => {
    const dataset = {}
    vi.stubGlobal('document', { documentElement: { dataset } })
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
    vi.stubGlobal('localStorage', { getItem: () => '{invalid json', setItem: () => { throw new Error('blocked') } })
    expect(readVisualPreferences()).toEqual(DEFAULT_VISUAL_PREFERENCES)
    expect(() => applyVisualPreferences({ ...DEFAULT_VISUAL_PREFERENCES, font: 'readable' })).not.toThrow()
    expect(dataset).toMatchObject({ font: 'readable' })
  })

  it('percorre os três níveis da malha pelo mesmo atalho', () => {
    expect(nextGrid('off')).toBe('subtle')
    expect(nextGrid('subtle')).toBe('strong')
    expect(nextGrid('strong')).toBe('off')
  })
})
