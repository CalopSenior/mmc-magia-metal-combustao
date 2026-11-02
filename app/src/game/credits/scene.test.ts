import { describe, expect, it } from 'vitest'
import { CreditsRun, SCENE_PIECES, creditsWorld } from './scene'

describe('cena de gameplay dos créditos', () => {
  it('constrói todas as peças e produz só ciclos perfeitos', () => {
    const world = creditsWorld(), run = new CreditsRun(world)
    const errors: string[] = []
    for (const piece of SCENE_PIECES) {
      const cell = world.getCell(piece.q, piece.r)
      if (piece.type === 'golem' && !cell.deposit) errors.push(`sem jazida em ${piece.q},${piece.r}`)
    }
    for (let tick = 0; tick < 1800; tick += 1) run.step()
    const { simulation } = run
    expect(errors).toEqual([])
    expect(run.finishedBuilding).toBe(true)
    expect(simulation.structureCount).toBe(SCENE_PIECES.length)
    expect(simulation.stats.perfectCycles).toBeGreaterThan(20)
    expect(simulation.stats.hungerEvents).toBe(0)
    expect(simulation.stats.clogEvents).toBe(0)
    expect(simulation.monsterCount).toBe(0)
    expect(simulation.delivered['runic-bronze'] ?? 0).toBeGreaterThan(0)
  })

  it('reinicia do zero', () => {
    const run = new CreditsRun(creditsWorld())
    for (let tick = 0; tick < 200; tick += 1) run.step()
    run.restart()
    expect(run.simulation.structureCount).toBe(0)
    expect(run.finishedBuilding).toBe(false)
  })
})
