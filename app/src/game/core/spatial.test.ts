import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../config'
import { createExhibition } from '../content/exhibition'
import { footprintCells } from './structureGeometry'
import { Simulation } from './simulation'

describe('índice espacial das estruturas', () => {
  const plan = createExhibition(), sim = new Simulation()
  sim.restore(0, null, DEFAULT_SETTINGS, plan.factory)
  it('devolve toda estrutura que toca o retângulo, em ordem de id, e nenhuma muito distante', () => {
    for (const [minQ, minR, maxQ, maxR] of [[-20, -20, 20, 20], [100, 60, 140, 110], [-150, -150, -120, -120]]) {
      const found = sim.visibleStructures(minQ, minR, maxQ, maxR)
      const ids = found.map((s) => s.id)
      expect(ids).toEqual([...ids].sort((a, b) => a - b))
      for (const s of sim.structureList) {
        if (s.type === 'golem') continue
        const touches = footprintCells(s, s.size ?? 1).some((c) => c.q >= minQ && c.q <= maxQ && c.r >= minR && c.r <= maxR)
        if (touches) expect(ids, `${s.type} ${s.q},${s.r}`).toContain(s.id)
      }
      // 16-cell buckets: nothing farther than one bucket away from the rectangle may appear (golems are always returned).
      for (const s of found) if (s.type !== 'golem') expect(s.q).toBeGreaterThanOrEqual(minQ - 20)
    }
  })
  it('a lista viva não tem pisos nem lanternas e continua com as máquinas', () => {
    const live = sim.liveStructures
    expect(live.some((s) => s.type === 'paving' || s.type === 'lantern')).toBe(false)
    expect(live.length).toBeLessThan(sim.structureList.length)
    expect(live.some((s) => s.type === 'alchemy')).toBe(true)
  })
})
