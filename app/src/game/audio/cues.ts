/** What the factory tells the sound engine: plain data, so the simulation never depends on Web Audio. */
export type SoundCue =
  | 'build' | 'demolish' | 'dig' | 'smelt' | 'fuse' | 'cycle' | 'hunger' | 'clog'
  | 'break' | 'repair' | 'deliver' | 'shot' | 'ricochet' | 'spawn' | 'slain' | 'portal'
  | 'collect' | 'transmute' | 'energize'

/** Position in grid cells (fractional for large machines, which sound from their centre). */
export interface CueEvent { readonly cue: SoundCue; readonly x: number; readonly y: number }
