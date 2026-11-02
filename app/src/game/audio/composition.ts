/**
 * The score, as data. A bar is 16 steps; every layer is a rule over the *global* step number.
 *
 * In the factory theme the bass pulses every 3 steps and the mallets every 4: they only strike
 * together on multiples of 12 = mmc(3, 4), where the bell rings. The music is the lesson.
 */
export type MusicScene = 'menu' | 'factory' | 'credits'
export type MusicVoice = 'pad' | 'bass' | 'pluck' | 'mallet' | 'bell' | 'kick' | 'hat' | 'clang'

export interface MusicNote {
  /** Step inside the bar (0–15). */
  readonly step: number
  /** Absolute step counter, the one the rules are written over. */
  readonly global: number
  readonly voice: MusicVoice
  /** MIDI note; ignored by percussion. */
  readonly midi: number
  /** Length in steps. */
  readonly length: number
  /** 0–1. */
  readonly velocity: number
}

export interface SceneDefinition {
  /** Shown in diagnostics only. */
  readonly name: string
  readonly bpm: number
  /** Bars the progression lasts before repeating. */
  readonly chords: readonly (readonly number[])[]
  /** Scale degrees (semitones from the tonic) used for melodic lines. */
  readonly scale: readonly number[]
  readonly tonic: number
  /** Loudness trim measured on the finished mix: the sparse menu theme needs more gain than the full ones. */
  readonly level: number
}

export const STEPS_PER_BAR = 16

const midi = (name: string): number => {
  const table: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name)
  if (!match) throw new Error(`Nota inválida: ${name}`)
  return 12 * (Number(match[3]) + 1) + table[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0)
}

const triad = (root: string, third: number, fifth = 7, extra?: number): number[] => {
  const base = midi(root)
  return [base, base + third, base + fifth, ...(extra === undefined ? [] : [base + extra])]
}

/**
 * Each scene owns several themes that take turns at random. The factory and credits themes share one
 * pitch collection (the notes of G major / E minor) and the menu themes share another (F major), so
 * two of them can overlap during a cross-fade without a clash.
 */
export const THEMES: Record<MusicScene, readonly SceneDefinition[]> = {
  // Quiet and a little mysterious. Bb and Gm keep it from sounding like a funeral.
  menu: [
    {
      name: 'Ré menor', bpm: 68, level: 2.6, tonic: midi('D3'), scale: [0, 2, 3, 5, 7, 8, 10],
      chords: [triad('D3', 3, 7, 10), triad('Bb2', 4, 7, 11), triad('G2', 3, 7, 10), triad('A2', 4, 7, 10)],
    },
    {
      name: 'Sol dórico', bpm: 64, level: 2.6, tonic: midi('G3'), scale: [0, 2, 3, 5, 7, 9, 10],
      chords: [triad('G2', 3, 7, 10), triad('C3', 4, 7, 10), triad('F2', 4, 7, 11), triad('D3', 3, 7, 10)],
    },
    {
      name: 'Si bemol lídio', bpm: 72, level: 2.6, tonic: midi('Bb3'), scale: [0, 2, 4, 6, 7, 9, 11],
      chords: [triad('Bb2', 4, 7, 11), triad('C3', 4, 7, 10), triad('G2', 3, 7, 10), triad('F2', 4, 7, 11)],
    },
  ],
  // Working music: steady, with room to add layers as the factory grows.
  factory: [
    {
      name: 'Mi eólio', bpm: 92, level: 1, tonic: midi('E3'), scale: [0, 2, 3, 5, 7, 8, 10],
      chords: [triad('E3', 3, 7, 10), triad('C3', 4, 7, 11), triad('G3', 4, 7, 11), triad('D3', 4, 7, 10)],
    },
    {
      name: 'Lá dórico', bpm: 84, level: 1, tonic: midi('A3'), scale: [0, 2, 3, 5, 7, 9, 10],
      chords: [triad('A2', 3, 7, 10), triad('D3', 4, 7, 10), triad('G2', 4, 7, 11), triad('E3', 3, 7, 10)],
    },
    {
      name: 'Ré mixolídio', bpm: 100, level: 1, tonic: midi('D3'), scale: [0, 2, 4, 5, 7, 9, 10],
      chords: [triad('D3', 4, 7, 10), triad('C3', 4, 7, 11), triad('G2', 4, 7, 11), triad('A2', 3, 7, 10)],
    },
    {
      name: 'Si frígio', bpm: 88, level: 1, tonic: midi('B3'), scale: [0, 1, 3, 5, 7, 8, 10],
      chords: [triad('B2', 3, 7, 10), triad('G2', 4, 7, 11), triad('A2', 3, 7, 10), triad('E3', 3, 7, 10)],
    },
  ],
  // Triumphant: C major with a Lydian lift on the fourth chord, then a plain G major.
  credits: [
    {
      name: 'Dó lídio', bpm: 104, level: 1, tonic: midi('C4'), scale: [0, 2, 4, 6, 7, 9, 11],
      chords: [triad('C3', 4, 7, 11), triad('G2', 4, 7, 10), triad('A2', 3, 7, 10), triad('F2', 4, 7, 11)],
    },
    {
      name: 'Sol jônio', bpm: 112, level: 1, tonic: midi('G3'), scale: [0, 2, 4, 5, 7, 9, 11],
      chords: [triad('G2', 4, 7, 11), triad('D3', 4, 7, 10), triad('E3', 3, 7, 10), triad('C3', 4, 7, 11)],
    },
  ],
}

/** How long a theme plays before the next one is drawn, in bars, and how many bars the hand-over overlaps. */
export const PHRASE_BARS: Record<MusicScene, readonly [number, number]> = { menu: [14, 22], factory: [24, 40], credits: [20, 28] }
export const CROSSFADE_BARS = 2

export function themeOf(scene: MusicScene, theme: number): SceneDefinition {
  const list = THEMES[scene]
  return list[((theme % list.length) + list.length) % list.length]
}

/** Any theme of the scene, the one that is playing included: the music never promises not to repeat. */
export function drawTheme(scene: MusicScene, roll: number): number {
  return Math.min(THEMES[scene].length - 1, Math.floor(roll * THEMES[scene].length))
}

export function drawPhraseBars(scene: MusicScene, roll: number): number {
  const [low, high] = PHRASE_BARS[scene]
  return low + Math.floor(roll * (high - low + 1))
}

/** Deterministic noise for the "random" choices, so a bar always sounds the same. */
function rawHash(a: number, b = 0): number {
  let h = (a * 374761393 + b * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function chordAt(scene: MusicScene, bar: number, theme = 0): readonly number[] {
  const { chords } = themeOf(scene, theme)
  return chords[((bar % chords.length) + chords.length) % chords.length]
}

export function secondsPerStep(scene: MusicScene, theme = 0): number {
  return 60 / themeOf(scene, theme).bpm / 4
}

/** How many of the optional layers play. Menu and credits ignore the factory's size. */
export function layersFor(scene: MusicScene, intensity: number) {
  const level = scene === 'credits' ? 1 : scene === 'menu' ? 0.3 : clamp01(intensity)
  return {
    pad: true,
    bass: level >= 0.1,
    mallet: level >= 0.2,
    kick: scene !== 'menu' && level >= 0.3,
    hat: scene !== 'menu' && level >= 0.45,
    clang: scene !== 'menu' && level >= 0.65,
    melody: scene === 'credits' || (scene === 'factory' && level >= 0.55) || scene === 'menu',
  }
}

/** `variation` re-rolls the "random" choices, so the same theme does not repeat note for note when it is drawn again. */
export function composeBar(scene: MusicScene, bar: number, intensity: number, theme = 0, variation = 0): MusicNote[] {
  const chord = chordAt(scene, bar, theme)
  const definition = themeOf(scene, theme)
  const hash = (a: number, b = 0) => rawHash(a, b + variation * 7919)
  const layers = layersFor(scene, intensity)
  const start = bar * STEPS_PER_BAR
  const notes: MusicNote[] = []
  const add = (step: number, voice: MusicVoice, pitch: number, length: number, velocity: number) =>
    notes.push({ step, global: start + step, voice, midi: pitch, length, velocity })

  // Pad: the whole chord, held for the bar (an octave up so it stays out of the bass).
  chord.slice(0, 3).forEach((pitch, index) => add(0, 'pad', pitch + 12, STEPS_PER_BAR, 0.5 - index * 0.04))

  if (scene === 'menu') {
    // Slow arpeggio with gaps, a low drone, and a far-away anvil on the first bar of each phrase.
    add(0, 'bass', chord[0] - 12, 12, 0.7)
    for (let step = 0; step < STEPS_PER_BAR; step += 2) {
      if (hash(start + step, 1) < 0.34) continue
      const pick = chord[Math.floor(hash(start + step, 2) * 3)] + 12 * (1 + Math.floor(hash(start + step, 3) * 2))
      add(step, 'pluck', pick, 3, 0.4 + hash(start + step, 4) * 0.2)
    }
    if (bar % 4 === 0) add(0, 'clang', 0, 8, 0.35)
    if (layers.melody && bar % 2 === 1) {
      const degree = definition.scale[Math.floor(hash(bar, 5) * 5) + 2]
      add(6, 'bell', definition.tonic + 24 + degree, 6, 0.45)
    }
    return notes
  }

  if (scene === 'factory') {
    for (let step = 0; step < STEPS_PER_BAR; step += 1) {
      const global = start + step
      if (layers.bass && global % 3 === 0) add(step, 'bass', chord[0] - 12 + (global % 12 === 0 ? 0 : global % 6 === 0 ? 7 : 0), 2, global % 12 === 0 ? 0.85 : 0.6)
      if (layers.mallet && global % 4 === 0) add(step, 'mallet', chord[(global / 4) % 3] + 12 * (1 + ((global / 4) % 5 === 4 ? 1 : 0)), 3, global % 12 === 0 ? 0.35 : 0.55)
      // The two rhythms meet: mmc(3, 4) = 12. A bell marks the exact step.
      if (layers.mallet && global % 12 === 0) add(step, 'bell', chord[2] + 24, 8, 0.7)
      if (layers.kick && (step === 0 || step === 8 || (level(intensity) > 0.55 && step === 12))) add(step, 'kick', 0, 1, step === 0 ? 0.9 : 0.7)
      if (layers.hat && step % 4 === 2) add(step, 'hat', 0, 1, 0.45)
      if (layers.clang && (step === 4 || step === 12)) add(step, 'clang', 0, 3, 0.5)
    }
    if (layers.melody && bar % 2 === 0) {
      for (const step of [2, 7, 10]) {
        if (hash(start + step, 9) < 0.35) continue
        const degree = definition.scale[[0, 2, 4, 3, 5, 6][Math.floor(hash(start + step, 10) * 6)]]
        add(step, 'bell', definition.tonic + 24 + degree, 4, 0.4)
      }
    }
    return notes
  }

  // Credits: a march with bells on the melody, every layer on.
  for (let step = 0; step < STEPS_PER_BAR; step += 1) {
    const global = start + step
    if (global % 3 === 0) add(step, 'bass', chord[0] - 12, 2, 0.65)
    if (global % 4 === 0) add(step, 'mallet', chord[(global / 4) % 3] + 12 + (global % 16 === 0 ? 12 : 0), 3, 0.5)
    if (global % 12 === 0) add(step, 'bell', chord[2] + 24, 8, 0.65)
    if (step === 0 || step === 8) add(step, 'kick', 0, 1, step === 0 ? 0.9 : 0.7)
    if (step % 4 === 2) add(step, 'hat', 0, 1, 0.4)
    if (step === 4 || step === 12) add(step, 'clang', 0, 3, 0.4)
  }
  const shape = [[0, 2, 4], [4, 2, 0], [2, 4, 5], [4, 5, 4]][bar % 4]
  ;[0, 4, 8].forEach((step, index) => add(step + (index === 2 ? 2 : 0), 'bell', definition.tonic + 24 + definition.scale[shape[index]], index === 2 ? 6 : 4, 0.55))
  return notes
}

function level(intensity: number): number { return clamp01(intensity) }

export function frequencyOf(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12)
}
