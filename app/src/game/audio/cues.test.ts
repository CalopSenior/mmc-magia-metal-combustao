import { describe, expect, it } from 'vitest'
import { CreditsRun, creditsWorld } from '../credits/scene'
import { ambientKindOf } from './director'
import type { CueEvent, SoundCue } from './cues'

describe('sinais sonoros da fábrica', () => {
  it('uma fábrica avançada emite os sinais de construir, minerar, fundir, ciclo perfeito e entrega', () => {
    const run = new CreditsRun(creditsWorld())
    const seen = new Map<SoundCue, CueEvent>()
    const kinds = new Set<string>()
    for (let tick = 0; tick < 1800; tick += 1) {
      run.step()
      for (const cue of run.simulation.drainCues()) if (!seen.has(cue.cue)) seen.set(cue.cue, cue)
      for (const structure of run.simulation.structures) {
        const kind = ambientKindOf(structure, run.simulation.monsterCount)
        if (kind) kinds.add(kind)
      }
    }
    for (const cue of ['build', 'dig', 'smelt', 'fuse', 'cycle', 'deliver'] as const) expect(seen.has(cue), cue).toBe(true)
    for (const cue of seen.values()) {
      expect(Number.isFinite(cue.x)).toBe(true)
      expect(Number.isFinite(cue.y)).toBe(true)
    }
    expect(kinds.has('golem')).toBe(true)
    expect(kinds.has('belts')).toBe(true)
    expect(kinds.has('fire')).toBe(true)
  })

  it('a fila de sinais é limitada e esvazia ao ser lida', () => {
    const run = new CreditsRun(creditsWorld())
    for (let tick = 0; tick < 400; tick += 1) run.step()
    expect(run.simulation.drainCues().length).toBeLessThanOrEqual(48)
    expect(run.simulation.drainCues()).toEqual([])
  })
})
