import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR, THEMES, composeBar, drawPhraseBars, drawTheme, frequencyOf, layersFor, secondsPerStep, themeOf, type MusicScene } from './composition'

const scenes: MusicScene[] = ['menu', 'factory', 'credits']
const themes = scenes.flatMap((scene) => THEMES[scene].map((_, index) => [scene, index] as const))

describe('trilha sonora', () => {
  it('é determinística e toda nota fica dentro do compasso e de uma tessitura audível, em todos os temas', () => {
    for (const [scene, theme] of themes) for (let bar = 0; bar < 16; bar += 1) {
      const first = composeBar(scene, bar, 0.7, theme, 3), second = composeBar(scene, bar, 0.7, theme, 3)
      expect(first).toEqual(second)
      expect(first.length).toBeGreaterThan(0)
      for (const note of first) {
        expect(note.step).toBeGreaterThanOrEqual(0)
        expect(note.step).toBeLessThan(STEPS_PER_BAR)
        expect(note.global).toBe(bar * STEPS_PER_BAR + note.step)
        expect(note.velocity).toBeGreaterThan(0)
        expect(note.velocity).toBeLessThanOrEqual(1)
        if (!['kick', 'hat', 'clang'].includes(note.voice)) {
          expect(frequencyOf(note.midi)).toBeGreaterThan(30)
          expect(frequencyOf(note.midi)).toBeLessThan(4200)
        }
      }
    }
  })

  it('em todos os temas da fábrica o baixo (de 3 em 3) e o marimba (de 4 em 4) só coincidem de 12 em 12: o MMC', () => {
    for (let theme = 0; theme < THEMES.factory.length; theme += 1) {
      const together: number[] = []
      for (let bar = 0; bar < 12; bar += 1) {
        const notes = composeBar('factory', bar, 1, theme)
        const bass = new Set(notes.filter((note) => note.voice === 'bass').map((note) => note.global))
        const mallet = new Set(notes.filter((note) => note.voice === 'mallet').map((note) => note.global))
        for (const global of bass) if (mallet.has(global)) together.push(global)
        for (const note of notes.filter((candidate) => candidate.voice === 'bass')) expect(note.global % 3).toBe(0)
        for (const note of notes.filter((candidate) => candidate.voice === 'mallet')) expect(note.global % 4).toBe(0)
        for (const note of notes.filter((candidate) => candidate.voice === 'bell' && candidate.length === 8 && candidate.velocity === 0.7)) expect(note.global % 12).toBe(0)
      }
      expect(together.length).toBeGreaterThan(10)
      expect(together.every((global) => global % 12 === 0)).toBe(true)
    }
  })

  it('a fábrica ganha camadas conforme cresce e o menu nunca tem bateria', () => {
    const count = (intensity: number) => composeBar('factory', 1, intensity).length
    expect(count(0.05)).toBeLessThan(count(0.3))
    expect(count(0.3)).toBeLessThan(count(0.9))
    expect(layersFor('menu', 1).kick).toBe(false)
    expect(layersFor('credits', 0).clang).toBe(true)
    for (const theme of THEMES.menu.keys()) for (let bar = 0; bar < 8; bar += 1) expect(composeBar('menu', bar, 1, theme).some((note) => note.voice === 'kick')).toBe(false)
  })

  it('cada cena tem vários temas, todos com progressão de quatro acordes e andamentos distintos', () => {
    for (const scene of scenes) {
      expect(THEMES[scene].length).toBeGreaterThanOrEqual(2)
      expect(new Set(THEMES[scene].map((theme) => theme.bpm)).size).toBe(THEMES[scene].length)
      for (const theme of THEMES[scene]) expect(theme.chords).toHaveLength(4)
    }
    expect(THEMES.factory.length).toBeGreaterThanOrEqual(4)
    expect(frequencyOf(69)).toBeCloseTo(440)
    expect(frequencyOf(81)).toBeCloseTo(880)
  })

  it('o sorteio alcança todos os temas, inclusive o que já toca, e a variação muda as notas livres', () => {
    for (const scene of scenes) {
      const seen = new Set<number>()
      for (let roll = 0; roll < 1; roll += 0.01) seen.add(drawTheme(scene, roll))
      expect(seen.size).toBe(THEMES[scene].length)
      expect(drawTheme(scene, 0.999999)).toBe(THEMES[scene].length - 1)
      expect(drawPhraseBars(scene, 0)).toBeLessThan(drawPhraseBars(scene, 0.999))
    }
    const differs = Array.from({ length: 8 }, (_, bar) => JSON.stringify(composeBar('menu', bar, 1, 0, 1)) !== JSON.stringify(composeBar('menu', bar, 1, 0, 2)))
    expect(differs.some(Boolean)).toBe(true)
  })

  it('os temas de uma cena compartilham as mesmas notas, para a passagem suave entre eles', () => {
    const collection = (scene: MusicScene, theme: number) => new Set(themeOf(scene, theme).scale.map((degree) => (themeOf(scene, theme).tonic + degree) % 12))
    const union = (scene: MusicScene) => THEMES[scene].reduce((all, _, index) => new Set([...all, ...collection(scene, index)]), new Set<number>())
    // factory: G major collection (7 notes) ; menu: F major collection (7 notes)
    expect(union('factory').size).toBe(7)
    expect(union('menu').size).toBe(7)
    expect(secondsPerStep('factory', 2)).toBeLessThan(secondsPerStep('factory', 1))
  })
})
