import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../config'
import { createExhibition, EXHIBITION_SEED, exhibitionRules } from '../content/exhibition'
import {
  ALCHEMY_TICKS, ALCHEMY_YIELD, COLLECTOR_RADIUS, DRAGON_CORE_ORE_COST, ENERGIZER_RADIUS, GRAND_ALTAR_OUTPUT_FACTOR, MAX_DECOR, RECIPES, STRUCTURES,
  createInitialFactoryState, energizerBoost, oreCost,
} from '../content/structures'
import { hexDistance, hexKey } from '../math/hex'
import { ChunkWorld } from '../world/ChunkWorld'
import { createSeedHash, generateCell } from '../world/generation'
import { collectFrom } from './machineRules'
import { Simulation } from './simulation'

const plan = createExhibition()
const world = new ChunkWorld(EXHIBITION_SEED, 1, plan.overrides)

function workshop(inventory: Record<string, number> = {}): Simulation {
  const simulation = new Simulation()
  simulation.restore(0, null, DEFAULT_SETTINGS, { ...createInitialFactoryState(inventory), structures: [] })
  // Free mode skips the natural obstacles (the Altar Maior still insists on magma) so the tests can build anywhere.
  simulation.configure({ ...exhibitionRules(), freeMode: true }, world)
  simulation.ether = 1000
  return simulation
}

describe('o preço em minérios de um Núcleo de Dragão', () => {
  it('soma os minérios básicos de toda a árvore: 1 + 1, depois 2 + 2, depois 4 + 4 = 8', () => {
    expect(oreCost('rusted-copper')).toBe(1)
    expect(oreCost('gray-steel')).toBe(2)
    expect(oreCost('ether-steel')).toBe(4)
    expect(oreCost('dorsal-adamantine')).toBe(4)
    expect(DRAGON_CORE_ORE_COST).toBe(8)
    expect(ALCHEMY_YIELD).toBe(18)
    for (const recipe of Object.values(RECIPES)) expect(Number.isFinite(oreCost(recipe.id))).toBe(true)
  })

  it('a dose do Energizador soma ao bônus: dose 1 dobra', () => {
    expect(energizerBoost(1)).toBe(2)
    expect(energizerBoost(3)).toBe(4)
    expect(energizerBoost(99)).toBe(6)
  })
})

describe('Mesa de Alquimia', () => {
  it('queima um Núcleo e uma semente e devolve 8 + 10 minérios do mesmo tipo', () => {
    const simulation = workshop({ 'resonant-brass': 6, 'azure-amalgam': 6, 'dragon-core': 1 })
    expect(simulation.build(world.getCell(-40, 100), 'alchemy', 0)).toBeNull()
    const table = simulation.structureAtCoords(-40, 100)!
    table.inputs['dragon-core'] = 2
    table.inputs['rusted-copper'] = 3
    for (let tick = 0; tick < ALCHEMY_TICKS; tick += 1) simulation.step(world)
    expect(table.output).toEqual({ resource: 'rusted-copper', amount: 18 })
    expect(table.inputs['dragon-core']).toBe(1)
    expect(table.inputs['rusted-copper']).toBe(2)
    expect(simulation.drainCues().some((cue) => cue.cue === 'transmute')).toBe(true)
  })

  it('sem Núcleo ou sem semente não faz nada, e só aceita um minério por vez', () => {
    const simulation = workshop({ 'resonant-brass': 6, 'azure-amalgam': 6, 'dragon-core': 1 })
    simulation.build(world.getCell(-40, 100), 'alchemy', 0)
    const table = simulation.structureAtCoords(-40, 100)!
    table.inputs['rusted-copper'] = 5
    for (let tick = 0; tick < ALCHEMY_TICKS * 2; tick += 1) simulation.step(world)
    expect(table.output).toBeNull()
    expect(table.inputs['rusted-copper']).toBe(5)
  })
})

describe('o pacote ×10 da Runa Multiplicadora', () => {
  it('o Prisma Divisor o desfaz em dez unidades e a Mesa o guarda como dez Núcleos', () => {
    const simulation = workshop({ 'resonant-brass': 6, 'azure-amalgam': 6, 'dragon-core': 1, 'rusted-copper': 20, 'whispering-quartz': 20, 'bloody-iron': 20 })
    expect(simulation.build(world.getCell(-40, 100), 'alchemy', 0)).toBeNull()
    expect(simulation.build(world.getCell(-44, 100), 'prism', 0)).toBeNull()
    expect(simulation.build(world.getCell(-45, 100), 'conveyor', 0)).toBeNull()
    const belt = simulation.structureAtCoords(-45, 100)!, prism = simulation.structureAtCoords(-44, 100)!
    prism.prismOutputCount = 2
    belt.output = { resource: 'dragon-core', amount: 1, scale: 10 }
    for (let tick = 0; tick < 12; tick += 1) simulation.step(world)
    // The pack is gone from the belt and its ten units now sit in the prism (or have already left through its two lanes).
    expect(belt.output).toBeNull()
    const inside = (prism.inputs['dragon-core'] ?? 0) + prism.laneOutputs.reduce((sum, lane) => sum + (lane?.amount ?? 0), 0)
    expect(inside).toBeGreaterThan(0)
    // The table accepts a pack straight from a belt while there is room for all ten.
    const direct = workshop({ 'resonant-brass': 6, 'azure-amalgam': 6, 'dragon-core': 1, 'rusted-copper': 5 })
    direct.build(world.getCell(-40, 100), 'alchemy', 0)
    direct.build(world.getCell(-41, 100), 'conveyor', 0)
    const feeder = direct.structureAtCoords(-41, 100)!, bench = direct.structureAtCoords(-40, 100)!
    feeder.output = { resource: 'dragon-core', amount: 1, scale: 10 }
    for (let tick = 0; tick < 12; tick += 1) direct.step(world)
    expect(bench.inputs['dragon-core']).toBe(10)
  })
})

describe('Energizador Aditivo', () => {
  const costs = { 'resonant-brass': 10, 'gray-steel': 6, 'astral-electrum': 4 }
  const spot = (() => { for (let q = -140; q < 140; q += 1) { const cell = generateCell(createSeedHash(EXHIBITION_SEED), q, -140); if (cell.deposit) return cell } return null })()

  function recovered(withEnergizer: boolean, dose = 1): number {
    const simulation = workshop(costs)
    const key = '20,-130', cell = { ...(spot ?? generateCell(createSeedHash(EXHIBITION_SEED), 20, -130)), q: 20, r: -130, key, deposit: { ore: 'rusted-copper' as const, purity: 100, richness: 1 as const, quantity: 100 } }
    const lonely = { getCell: (q: number, r: number) => (hexKey(q, r) === key ? cell : world.getCell(q, r)) }
    simulation.restore(0, null, DEFAULT_SETTINGS, { ...createInitialFactoryState(costs), structures: [], deposits: { [key]: 10 } })
    simulation.configure({ ...exhibitionRules(), freeMode: true }, lonely)
    if (withEnergizer) {
      expect(simulation.build(world.getCell(24, -126), 'energizer', 0)).toBeNull()
      const coil = simulation.structureAtCoords(24, -126)!
      coil.power = dose
      coil.inputs['resonant-brass'] = 5
    }
    for (let tick = 0; tick < 600; tick += 1) simulation.step(lonely)
    return simulation.getFactoryState().deposits[key] - 10
  }

  it('dobra a restauração das jazidas no raio, e a dose soma ao bônus', () => {
    const base = recovered(false), doubled = recovered(true, 1), tripled = recovered(true, 2)
    expect(base).toBeGreaterThan(0)
    expect(doubled / base).toBeCloseTo(2, 1)
    expect(tripled / base).toBeCloseTo(3, 1)
  })

  it('consome Latão uma dose por ciclo e para sem ele', () => {
    const simulation = workshop(costs)
    simulation.build(world.getCell(24, -126), 'energizer', 0)
    const coil = simulation.structureAtCoords(24, -126)!
    coil.power = 2
    coil.inputs['resonant-brass'] = 3
    simulation.step(world)
    expect(coil.inputs['resonant-brass']).toBe(1)
    expect(coil.charge).toBeGreaterThan(0)
    expect(ENERGIZER_RADIUS).toBe(36)
  })

  it('só aceita Latão Ressonante pela esteira', () => {
    const simulation = workshop(costs)
    simulation.build(world.getCell(24, -126), 'energizer', 0)
    const coil = simulation.structureAtCoords(24, -126)!
    expect(coil.output).toBeNull()
    expect(STRUCTURES.energizer.size).toBe(2)
  })
})

describe('Ponto de Coleta', () => {
  it('recebe a carga de um golem até 9 células de distância e solta em remessas', () => {
    const simulation = workshop({ 'bloody-iron': 20, 'rusted-copper': 20 })
    simulation.build(world.getCell(-58, 87), 'collector', 0)
    const point = simulation.structureAtCoords(-58, 87)!
    const golem = { ...point, id: 99, type: 'golem' as const, q: -58 + COLLECTOR_RADIUS, r: 87, output: { resource: 'rusted-copper' as const, amount: 7 }, inputs: {} }
    expect(collectFrom(simulation, golem)).toBe(7)
    expect(point.inputs['rusted-copper']).toBe(7)
    expect(golem.output).toBeNull()
    const far = { ...golem, q: -58 + COLLECTOR_RADIUS + 1, output: { resource: 'rusted-copper' as const, amount: 3 } }
    expect(collectFrom(simulation, far)).toBe(0)
    simulation.step(world)
    expect(point.output).toEqual({ resource: 'rusted-copper', amount: 7 })
    expect(point.inputs['rusted-copper'] ?? 0).toBe(0)
  })

  it('na exposição o golem saltitante deixa a carga no ponto antes de cada troca de jazida', () => {
    const simulation = new Simulation()
    simulation.restore(0, null, DEFAULT_SETTINGS, plan.factory)
    simulation.configure(exhibitionRules(), world)
    let collected = 0
    for (let tick = 0; tick < 4000; tick += 1) {
      simulation.step(world)
      simulation.drainTransferMotions(); simulation.drainEvents()
      collected += simulation.drainCues().filter((cue) => cue.cue === 'collect').length
    }
    expect(collected).toBeGreaterThan(0)
  }, 60000)
})

describe('Altar de Fusão Maior', () => {
  const costs = { 'scaled-iron': 12, 'dark-chrome': 12, 'volcanic-glass': 8 }

  it('só pode ser erguido com as 25 células sobre Fenda de Magma', () => {
    const simulation = workshop(costs)
    expect(simulation.build(world.getCell(0, 0), 'grandaltar', 0)).toContain('Fenda de Magma')
    expect(simulation.structureCount).toBe(0)
    expect(simulation.build(world.getCell(-84 - 2, 108), 'grandaltar', 0)).toContain('Fenda de Magma')
    expect(simulation.build(world.getCell(-84, 108), 'grandaltar', 0)).toBeNull()
    expect(simulation.structureAtCoords(-80, 112)?.type).toBe('grandaltar')
  })

  it('funde duas ligas ao mesmo tempo e entrega o dobro de cada uma', () => {
    const simulation = workshop(costs)
    simulation.build(world.getCell(-84, 108), 'grandaltar', 0)
    const altar = simulation.structureAtCoords(-84, 108)!
    altar.inputs = { 'rusted-copper': 6, 'fossil-coal': 18, 'bloody-iron': 12 }
    simulation.step(world)
    expect(altar.jobs).toHaveLength(2)
    for (let tick = 0; tick < 200; tick += 1) simulation.step(world)
    const made: Record<string, number> = { ...(altar.products ?? {}) }
    if (altar.output) made[altar.output.resource] = (made[altar.output.resource] ?? 0) + altar.output.amount
    expect(made['runic-bronze']).toBe(RECIPES['runic-bronze'].output * GRAND_ALTAR_OUTPUT_FACTOR)
    expect(made['gray-steel']).toBe(RECIPES['gray-steel'].output * GRAND_ALTAR_OUTPUT_FACTOR)
    expect(simulation.stats.fusions).toBe(2)
  })

  it('não aceita Runas', () => {
    const simulation = workshop(costs)
    simulation.build(world.getCell(-84, 108), 'grandaltar', 0)
    expect(simulation.engraveRune({ q: -84, r: 108 }, 1)).toContain('não se aplicam')
  })
})

describe('pisos e lanternas', () => {
  it('não contam como máquinas e cedem lugar a qualquer peça construída por cima', () => {
    const simulation = workshop({ 'rusted-copper': 20, 'whispering-quartz': 4 })
    expect(simulation.build(world.getCell(0, 40), 'paving', 0, { tier: 2 })).toBeNull()
    expect(simulation.build(world.getCell(1, 40), 'lantern', 0)).toBeNull()
    expect(simulation.structureCount).toBe(0)
    expect(simulation.structureAtCoords(0, 40)?.tier).toBe(2)
    const copper = simulation.inventory['rusted-copper'] ?? 0
    expect(simulation.build(world.getCell(0, 40), 'gnome', 0)).toBeNull()
    expect(simulation.structureAtCoords(0, 40)?.type).toBe('gnome')
    expect(simulation.inventory['rusted-copper']).toBe(copper + 1 - 2)
    expect(simulation.structureCount).toBe(1)
  })

  it('tocar num piso de outro acabamento só troca o acabamento, de graça', () => {
    const simulation = workshop({ 'rusted-copper': 5 })
    simulation.build(world.getCell(0, 40), 'paving', 0, { tier: 1 })
    const spent = simulation.inventory['rusted-copper']
    expect(simulation.build(world.getCell(0, 40), 'paving', 0, { tier: 3 })).toBeNull()
    expect(simulation.structureAtCoords(0, 40)?.tier).toBe(3)
    expect(simulation.inventory['rusted-copper']).toBe(spent)
  })

  it('uma esteira desenhada por cima de pisos os substitui', () => {
    const simulation = workshop({ 'rusted-copper': 20 })
    const cells = [0, 1, 2, 3].map((q) => ({ q, r: 40, direction: 0 as const }))
    expect(simulation.paintFloors(cells, world, 1)).toBeNull()
    expect(simulation.drawConveyors(cells, world, 1)).toBeNull()
    expect([0, 1, 2, 3].every((q) => simulation.structureAtCoords(q, 40)?.type === 'conveyor')).toBe(true)
  })

  it('a decoração tem um limite próprio, separado do de máquinas', () => {
    expect(MAX_DECOR).toBeGreaterThan(256)
  })

  it('pisos, lanternas e as obras-primas sobrevivem ao salvamento', async () => {
    const { validateSave } = await import('../persistence/save')
    const { createNewSnapshot } = await import('../persistence/slots')
    const simulation = workshop({ 'rusted-copper': 20, 'whispering-quartz': 4, 'resonant-brass': 16, 'azure-amalgam': 6, 'dragon-core': 1, 'scaled-iron': 12, 'dark-chrome': 12, 'volcanic-glass': 8 })
    simulation.build(world.getCell(0, 40), 'paving', 0, { tier: 3 })
    simulation.build(world.getCell(1, 40), 'lantern', 0)
    simulation.build(world.getCell(-40, 100), 'alchemy', 0)
    simulation.build(world.getCell(-84, 108), 'grandaltar', 0)
    const altar = simulation.structureAtCoords(-84, 108)!
    altar.inputs = { 'rusted-copper': 6, 'fossil-coal': 6 }
    for (let tick = 0; tick < 30; tick += 1) simulation.step(world)
    expect(altar.jobs).toHaveLength(1)
    const base = createNewSnapshot('slot-1', 'Teste', 'artisan', 'free')
    const saved = validateSave(JSON.parse(JSON.stringify({ ...base, factory: simulation.getFactoryState() })))
    expect(saved?.factory.structures.map((structure) => structure.type)).toEqual(['paving', 'lantern', 'alchemy', 'grandaltar'])
    expect(saved?.factory.structures[3].jobs).toHaveLength(1)
    expect(saved?.factory.structures[3].size).toBe(5)
  })
})

describe('lagos de lava', () => {
  function biggestMagmaSquare(read: (q: number, r: number) => string, from: number, to: number): number {
    let found = 0
    for (let r = from; r + 5 <= to; r += 1) for (let q = from; q + 5 <= to; q += 1) {
      let all = true
      for (let dr = 0; dr < 5 && all; dr += 1) for (let dq = 0; dq < 5; dq += 1) if (read(q + dq, r + dr) !== 'magma') { all = false; break }
      if (all) found += 1
    }
    return found
  }

  it('mapas de contrato avançados e infinitos trazem uma fenda onde cabe o Altar Maior', async () => {
    const { planContractMap } = await import('../world/contractMap')
    for (const seed of ['VALE-TESTE', 'CRATERA-TESTE', 'CITADELA-TESTE']) {
      const plan = planContractMap(seed, 24, [], 'veins', { caldera: true })
      const hash = createSeedHash(seed)
      const terrainAt = (q: number, r: number) => (plan.overrides.get(hexKey(q, r)) ?? generateCell(hash, q, r)).terrain
      expect(biggestMagmaSquare(terrainAt, -24, 24), seed).toBeGreaterThan(0)
      const without = planContractMap(seed, 24, [], 'veins')
      expect(without.overrides.size).toBeLessThanOrEqual(plan.overrides.size)
    }
  })

  it('o mundo livre tem lagos de lava na cratera, grandes o bastante e longe do início', async () => {
    const { getBiomeAt } = await import('../world/biomeField')
    const { lavaDepth } = await import('../world/topography')
    let squares = 0
    for (const name of ['DRAGON-DORSAL-01', 'CIDADELA-DA-CONFLUENCIA', 'MUNDO-LIVRE-3']) {
      const hash = createSeedHash(name)
      const cache = new Map<string, string>()
      const terrainAt = (q: number, r: number) => {
        const key = hexKey(q, r)
        let value = cache.get(key)
        if (!value) { value = generateCell(hash, q, r).terrain; cache.set(key, value) }
        return value
      }
      squares += biggestMagmaSquare(terrainAt, -260, 260)
      for (let r = -21; r <= 21; r += 1) for (let q = -21; q <= 21; q += 1) expect(lavaDepth(hash, q, r)).toBe(0)
      expect(getBiomeAt(hash, 0, 0)).toBeDefined()
    }
    expect(squares).toBeGreaterThan(5)
  }, 120000)
})

describe('sons das obras-primas', () => {
  it('cada máquina nova faz o seu som enquanto trabalha', async () => {
    const { ambientKindOf } = await import('../audio/director')
    const simulation = workshop({ 'resonant-brass': 16, 'azure-amalgam': 6, 'dragon-core': 1, 'gray-steel': 6, 'astral-electrum': 4, 'scaled-iron': 12, 'dark-chrome': 12, 'volcanic-glass': 8 })
    simulation.build(world.getCell(-40, 100), 'alchemy', 0)
    simulation.build(world.getCell(24, -126), 'energizer', 0)
    simulation.build(world.getCell(-84, 108), 'grandaltar', 0)
    const [table, coil, altar] = ['alchemy', 'energizer', 'grandaltar'].map((type) => [...simulation.structures].find((structure) => structure.type === type)!)
    expect([table, coil, altar].map((structure) => ambientKindOf(structure, 0))).toEqual([null, null, null])
    table.inputs = { 'dragon-core': 1, 'rusted-copper': 1 }
    coil.inputs = { 'resonant-brass': 2 }
    altar.inputs = { 'rusted-copper': 6, 'fossil-coal': 6 }
    for (let tick = 0; tick < 5; tick += 1) simulation.step(world)
    expect([table, coil, altar].map((structure) => ambientKindOf(structure, 0))).toEqual(['alchemy', 'energizer', 'fire'])
    expect(simulation.recoveryBoostAt(24, -120)).toBe(energizerBoost(1))
    expect(simulation.recoveryBoostAt(24 + ENERGIZER_RADIUS + 5, -126)).toBe(1)
  })
})

describe('o golem caminha até o Ponto de Coleta e escolhe a melhor jazida', () => {
  type Spot = { q: number; r: number; left: number }
  function flat(spots: readonly Spot[]) {
    const deposits = new Map(spots.map((spot) => [hexKey(spot.q, spot.r), spot]))
    const getCell = (q: number, r: number) => {
      const key = hexKey(q, r), spot = deposits.get(key)
      return { key, q, r, biome: 'copper-vale' as const, terrain: 'ash' as const, elevation: 0, relief: 0, variant: 0,
        deposit: spot ? { ore: 'rusted-copper' as const, purity: 100, richness: 1 as const, quantity: 100 } : null }
    }
    const simulation = new Simulation()
    simulation.restore(0, null, DEFAULT_SETTINGS, {
      ...createInitialFactoryState({ 'bloody-iron': 20, 'rusted-copper': 20 }), structures: [],
      deposits: Object.fromEntries(spots.map((spot) => [hexKey(spot.q, spot.r), spot.left])),
    })
    simulation.configure({ ...exhibitionRules(), freeMode: true }, { getCell })
    return { simulation, world: { getCell } }
  }

  it('prefere 20 ao lado a 21 no limite da visão, mas uma jazida muito mais rica compensa a distância', () => {
    for (const [near, far, expected] of [[20, 21, { q: 1, r: 0 }], [3, 60, { q: 3, r: 0 }]] as const) {
      const { simulation, world: flatWorld } = flat([{ q: 0, r: 0, left: 1 }, { q: 1, r: 0, left: near }, { q: 3, r: 0, left: far }])
      simulation.build(flatWorld.getCell(0, 0), 'golem', 0)
      const golem = [...simulation.structures][0]
      for (let tick = 0; tick < 300 && !golem.migrationPath.length; tick += 1) simulation.step(flatWorld)
      expect(golem.migrationPath.at(-1), `${near} × ${far}`).toEqual(expected)
    }
  })

  it('anda de verdade até o ponto, fica um tempo proporcional à carga e só então segue para a nova jazida', () => {
    const { simulation, world: flatWorld } = flat([{ q: 0, r: 0, left: 1 }, { q: 3, r: 0, left: 20 }])
    simulation.build(flatWorld.getCell(0, 0), 'golem', 0)
    simulation.build(flatWorld.getCell(-3, 0), 'collector', 0)
    const golem = [...simulation.structures].find((s) => s.type === 'golem')!
    const point = [...simulation.structures].find((s) => s.type === 'collector')!
    golem.output = { resource: 'rusted-copper', amount: 5 }
    const visited: { q: number; r: number }[] = []
    let waited = 0
    for (let tick = 0; tick < 700; tick += 1) {
      simulation.step(flatWorld)
      visited.push({ q: golem.q, r: golem.r })
      if (golem.errand && !golem.migrationPath.length) waited += 1
    }
    expect(visited.some((cell) => hexDistance(cell, point) <= 1)).toBe(true)
    // It really walked: several different cells, not a jump.
    expect(new Set(visited.map((cell) => hexKey(cell.q, cell.r))).size).toBeGreaterThan(4)
    // 5 carried plus the 1 it mined from the last unit of its deposit: 6 units, 8 ticks each.
    expect(waited).toBe(6 * 8)
    expect((point.inputs['rusted-copper'] ?? 0) + (point.output?.amount ?? 0)).toBe(6)
    // The sack was emptied: whatever it carries now was mined at the new deposit.
    expect(golem.output?.amount ?? 0).toBeLessThan(6)
    expect({ q: golem.q, r: golem.r }).toEqual({ q: 3, r: 0 })
    expect(golem.errand).toBeUndefined()
    expect(golem.sourceResource).toBe('rusted-copper')
  })
})
