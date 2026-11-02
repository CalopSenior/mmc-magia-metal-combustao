import { describe, expect, it } from 'vitest'
import { createSeedHash, generateCell } from '../world/generation'
import type { HexCell, OreId } from '../types'
import { Simulation } from './simulation'
import { ChunkWorld } from '../world/ChunkWorld'
import { GOLEM_MIGRATION_TICKS_PER_CELL } from '../content/structures'
import { hexKey } from '../math/hex'

const world = new ChunkWorld('FABRICA-TESTE', 1)
const controlledSeedHash = createSeedHash('MIGRACAO-TESTE')

function controlledCell(q: number, r: number, ore: OreId = 'rusted-copper', quantity = 10, purity = 50): HexCell {
  return {
    ...generateCell(controlledSeedHash, q, r),
    deposit: { ore, purity, richness: 1, quantity },
  }
}

function controlledWorld(cells: HexCell[]) {
  const byKey = new Map(cells.map((cell) => [cell.key, cell]))
  return {
    getCell(q: number, r: number): HexCell {
      return byKey.get(hexKey(q, r)) ?? {
        ...generateCell(controlledSeedHash, q, r),
        deposit: null,
      }
    },
  }
}

function findCell(ore?: OreId): HexCell {
  const seedHash = createSeedHash('FABRICA-TESTE')
  for (let r = -30; r <= 30; r += 1) {
    for (let q = -30; q <= 30; q += 1) {
      const cell = generateCell(seedHash, q, r)
      if (ore ? cell.deposit?.ore === ore : !cell.deposit) return cell
    }
  }
  throw new Error('Célula de teste não encontrada')
}

function neighbor(cell: HexCell, distance: number): HexCell {
  return { ...generateCell(createSeedHash('FABRICA-TESTE'), cell.q + distance, cell.r) }
}

describe('oficina mecânica', () => {
  it('valida construção, gira estruturas e devolve custos ao demolir', () => {
    const simulation = new Simulation()
    const empty = findCell()
    expect(simulation.build(empty, 'golem', 0)).toMatch('jazida')
    const before = simulation.inventory['rusted-copper']
    expect(simulation.build(empty, 'conveyor', 0)).toBeNull()
    expect(simulation.inventory['rusted-copper']).toBe((before ?? 0) - 1)
    expect(simulation.build(empty, 'furnace', 0)).toBeNull()
    expect(simulation.structureAt(empty)?.direction).toBe(1)
    expect(simulation.demolish(empty)).toBeNull()
    expect(simulation.inventory['rusted-copper']).toBe(before)
  })

  it('extrai de uma jazida e entrega ao inventário por uma cadeia de esteiras', () => {
    const simulation = new Simulation()
    const cell = findCell('rusted-copper')
    expect(simulation.build(cell, 'golem', 0)).toBeNull()
    expect(simulation.build(neighbor(cell, 1), 'conveyor', 0)).toBeNull()
    expect(simulation.build(neighbor(cell, 2), 'conveyor', 0)).toBeNull()
    expect(simulation.build(neighbor(cell, 3), 'gnome', 0)).toBeNull()
    const before = simulation.inventory['rusted-copper'] ?? 0
    const total = cell.deposit!.quantity * cell.deposit!.richness
    for (let tick = 0; tick < 160; tick += 1) simulation.step(world)
    expect(simulation.inventory['rusted-copper'] ?? 0).toBeGreaterThan(before)
    expect(simulation.getDepositRemaining(cell)).toBeLessThan(total)
  })

  it('não deixa um item atravessar duas esteiras na mesma transferência', () => {
    const simulation = new Simulation()
    const cell = findCell()
    simulation.build(cell, 'conveyor', 0)
    simulation.build(neighbor(cell, 1), 'conveyor', 0)
    simulation.build(neighbor(cell, 2), 'gnome', 0)
    const factory = simulation.getFactoryState()
    factory.structures[0].output = { resource: 'rusted-copper', amount: 1 }
    simulation.restore(5, null, simulation.currentSettings, factory)
    simulation.step(world)
    const structures = simulation.getFactoryState().structures
    expect(structures[0].output).toBeNull()
    expect(structures[1].output).toEqual({ resource: 'rusted-copper', amount: 1 })
  })

  it('emite um deslocamento contínuo para cada transferência logística', () => {
    const simulation = new Simulation()
    const cell = findCell()
    simulation.build(cell, 'conveyor', 0)
    simulation.build(neighbor(cell, 1), 'gnome', 0)
    const factory = simulation.getFactoryState()
    factory.structures[0].output = { resource: 'rusted-copper', amount: 1 }
    simulation.restore(5, null, simulation.currentSettings, factory)
    simulation.step(world)
    const motions = simulation.drainTransferMotions()
    expect(motions).toHaveLength(1)
    expect(motions[0].from).toEqual({ q: cell.q, r: cell.r })
    expect(motions[0].to).toEqual({ q: cell.q + 1, r: cell.r })
    expect(motions[0].durationMs).toBe(300)
    expect(simulation.hasPendingTransferMotions).toBe(false)
  })

  it('consome insumos e produz Aço Dracônico na Fornalha', () => {
    const simulation = new Simulation()
    const cell = findCell()
    simulation.build(cell, 'furnace', 0)
    const factory = simulation.getFactoryState()
    factory.structures[0].inputs = { 'bloody-iron': 2, 'fossil-coal': 1 }
    simulation.restore(0, null, simulation.currentSettings, factory)
    for (let tick = 0; tick < 40; tick += 1) simulation.step(world)
    const furnace = simulation.getFactoryState().structures[0]
    expect(furnace.output).toEqual({ resource: 'draconic-steel', amount: 1 })
    expect(furnace.recipe).toBeNull()
    expect(furnace.inputs['bloody-iron']).toBe(0)
    expect(furnace.inputs['fossil-coal']).toBe(0)
  })
})


describe('migração dos Golens e recuperação das jazidas', () => {
  it('recupera jazidas sem extração proporcionalmente à pureza', () => {
    const pure = controlledCell(0, 0, 'rusted-copper', 10, 100)
    const impure = controlledCell(1, 0, 'rusted-copper', 10, 50)
    const testWorld = controlledWorld([pure, impure])
    const simulation = new Simulation()
    simulation.restore(0, null, simulation.currentSettings, {
      structures: [],
      inventory: {},
      deposits: { [pure.key]: 5, [impure.key]: 5 },
      nextStructureId: 1,
    })

    for (let tick = 0; tick < 20; tick += 1) simulation.step(testWorld)

    expect(simulation.getDepositRemaining(pure)).toBeCloseTo(5.1, 8)
    expect(simulation.getDepositRemaining(impure)).toBeCloseTo(5.05, 8)
  })

  it('não recupera uma jazida enquanto o Golem estiver estacionado nela', () => {
    const source = controlledCell(0, 0)
    const testWorld = controlledWorld([source])
    const simulation = new Simulation()
    expect(simulation.build(source, 'golem', 0)).toBeNull()
    const factory = simulation.getFactoryState()
    factory.deposits[source.key] = 5
    simulation.restore(0, null, simulation.currentSettings, factory)

    simulation.step(testWorld)

    expect(simulation.getDepositRemaining(source)).toBe(5)
  })

  it('caminha até a jazida mais próxima ao esgotar e retoma a extração', () => {
    const source = controlledCell(0, 0, 'rusted-copper', 1)
    const target = controlledCell(1, 0, 'rusted-copper', 8)
    const testWorld = controlledWorld([source, target])
    const simulation = new Simulation()
    expect(simulation.build(source, 'golem', 0)).toBeNull()
    const workTicks = simulation.structureAt(source)!.workTicks

    for (let tick = 0; tick < workTicks; tick += 1) simulation.step(testWorld)
    expect(simulation.getDepositRemaining(source)).toBe(0)
    simulation.step(testWorld)

    let golem = simulation.getFactoryState().structures[0]
    expect(golem.migrationPath).toEqual([{ q: target.q, r: target.r }])
    expect(golem.migrationProgress).toBe(1)
    expect(golem.q).toBe(source.q)
    expect(golem.r).toBe(source.r)

    for (let tick = 1; tick < GOLEM_MIGRATION_TICKS_PER_CELL; tick += 1) simulation.step(testWorld)
    golem = simulation.structureAt(target)!
    expect(golem).not.toBeNull()
    expect(golem.migrationPath).toEqual([])
    expect(simulation.structureAt(source)).toBeNull()
    expect(simulation.getDepositRemaining(source)).toBeGreaterThan(0)

    for (let tick = 0; tick < workTicks; tick += 1) simulation.step(testWorld)
    expect(golem.output).toEqual({ resource: 'rusted-copper', amount: 2 })
    expect(simulation.getDepositRemaining(target)).toBe(7)
  })

  it('migra no limiar percentual configurado sem extrair abaixo dele', () => {
    const source = controlledCell(0, 0, 'rusted-copper', 10)
    const target = controlledCell(1, 0, 'rusted-copper', 8)
    const testWorld = controlledWorld([source, target])
    const simulation = new Simulation()
    simulation.build(source, 'golem', 0)
    expect(simulation.setGolemMigrationThreshold(source, 52)).toBe(true)
    expect(simulation.structureAt(source)?.migrationThreshold).toBe(50)
    const factory = simulation.getFactoryState()
    factory.deposits[source.key] = 5
    simulation.restore(0, null, simulation.currentSettings, factory)

    simulation.step(testWorld)

    expect(simulation.getDepositRemaining(source)).toBeCloseTo(5.0025, 8)
    expect(simulation.structureAt(source)?.migrationPath).toEqual([{ q: target.q, r: target.r }])
  })

  it('ignora uma jazida mais próxima de outro minério', () => {
    const source = controlledCell(0, 0, 'rusted-copper', 1)
    const otherOre = controlledCell(1, 0, 'fossil-coal', 8)
    const target = controlledCell(2, 0, 'rusted-copper', 8)
    const testWorld = controlledWorld([source, otherOre, target])
    const simulation = new Simulation()
    simulation.build(source, 'golem', 0)
    const workTicks = simulation.structureAt(source)!.workTicks

    for (let tick = 0; tick <= workTicks; tick += 1) simulation.step(testWorld)

    const golem = simulation.structureAt(source)!
    expect(golem.migrationPath).toHaveLength(2)
    expect(golem.migrationPath.at(-1)).toEqual({ q: target.q, r: target.r })
    expect(golem.sourceResource).toBe('rusted-copper')
  })

  it('contorna estruturas e reserva as células da rota', () => {
    const source = controlledCell(0, 0, 'rusted-copper', 1)
    const obstacle = { ...controlledCell(1, 0), deposit: null }
    const target = controlledCell(2, 0, 'rusted-copper', 8)
    const testWorld = controlledWorld([source, obstacle, target])
    const simulation = new Simulation()
    simulation.build(source, 'golem', 0)
    simulation.build(obstacle, 'conveyor', 0)
    const workTicks = simulation.structureAt(source)!.workTicks

    for (let tick = 0; tick <= workTicks; tick += 1) simulation.step(testWorld)

    const golem = simulation.structureAt(source)!
    expect(golem.migrationPath).toHaveLength(3)
    expect(golem.migrationPath).not.toContainEqual({ q: obstacle.q, r: obstacle.r })
    expect(golem.migrationPath.at(-1)).toEqual({ q: target.q, r: target.r })
    expect(simulation.build(testWorld.getCell(golem.migrationPath[0].q, golem.migrationPath[0].r), 'conveyor', 0)).toMatch('reservada')
  })

  it('restaura um save no meio do deslocamento sem teleportar o Golem', () => {
    const source = controlledCell(0, 0, 'rusted-copper', 1)
    const target = controlledCell(1, 0, 'rusted-copper', 8)
    const testWorld = controlledWorld([source, target])
    const original = new Simulation()
    original.build(source, 'golem', 0)
    const workTicks = original.structureAt(source)!.workTicks
    for (let tick = 0; tick <= workTicks; tick += 1) original.step(testWorld)
    const midway = original.getFactoryState()
    expect(midway.structures[0].migrationProgress).toBe(1)

    const restored = new Simulation()
    restored.restore(original.tick, null, original.currentSettings, midway)
    for (let tick = 1; tick < GOLEM_MIGRATION_TICKS_PER_CELL; tick += 1) restored.step(testWorld)

    expect(restored.structureAt(source)).toBeNull()
    expect(restored.structureAt(target)?.migrationPath).toEqual([])
    expect(restored.structureAt(target)?.migrationProgress).toBe(0)
  })
})


describe('logística rúnica', () => {
  const logisticsWorld = controlledWorld([])

  function advance(simulation: Simulation, ticks = 6): void {
    for (let tick = 0; tick < ticks; tick += 1) simulation.step(logisticsWorld)
  }

  it.each([2, 3, 4, 5] as const)('divide um lote exato entre %i saídas e retém o resto', (count) => {
    const simulation = new Simulation()
    const cell = logisticsWorld.getCell(0, 0)
    expect(simulation.build(cell, 'prism', 0)).toBeNull()
    expect(simulation.setPrismOutputCount(cell, count)).toBe(true)
    const factory = simulation.getFactoryState()
    factory.structures[0].inputs = { 'rusted-copper': count * 3 + 1 }
    simulation.restore(0, null, simulation.currentSettings, factory)

    advance(simulation)

    const prism = simulation.structureAt(cell)!
    expect(prism.laneOutputs).toEqual(Array.from({ length: count }, () => ({
      resource: 'rusted-copper',
      amount: 3,
    })))
    expect(prism.inputs['rusted-copper']).toBe(1)
  })

  it('aceita o Prisma somente pela retaguarda', () => {
    const valid = new Simulation()
    const prismCell = logisticsWorld.getCell(0, 0)
    const rearCell = logisticsWorld.getCell(-1, 0)
    valid.build(prismCell, 'prism', 0)
    valid.build(rearCell, 'conveyor', 0)
    const validFactory = valid.getFactoryState()
    validFactory.structures.find((structure) => structure.type === 'conveyor')!.output = {
      resource: 'rusted-copper',
      amount: 1,
    }
    valid.restore(0, null, valid.currentSettings, validFactory)
    advance(valid)
    expect(valid.structureAt(prismCell)?.inputs['rusted-copper']).toBe(1)
    expect(valid.structureAt(rearCell)?.output).toBeNull()

    const invalid = new Simulation()
    const sideCell = logisticsWorld.getCell(1, -1)
    invalid.build(prismCell, 'prism', 0)
    invalid.build(sideCell, 'conveyor', 4)
    const invalidFactory = invalid.getFactoryState()
    invalidFactory.structures.find((structure) => structure.type === 'conveyor')!.output = {
      resource: 'rusted-copper',
      amount: 1,
    }
    invalid.restore(0, null, invalid.currentSettings, invalidFactory)
    advance(invalid)
    expect(invalid.structureAt(prismCell)?.inputs['rusted-copper']).toBeUndefined()
    expect(invalid.structureAt(sideCell)?.output).toEqual({
      resource: 'rusted-copper',
      amount: 1,
    })
  })

  it('devolve as pistas removidas do Prisma aos insumos e ao demolir', () => {
    const simulation = new Simulation()
    const cell = logisticsWorld.getCell(0, 0)
    simulation.build(cell, 'prism', 0)
    simulation.setPrismOutputCount(cell, 5)
    const factory = simulation.getFactoryState()
    factory.structures[0].laneOutputs = Array.from({ length: 5 }, (_, lane) => ({
      resource: 'rusted-copper' as const,
      amount: lane + 1,
    }))
    simulation.restore(0, null, simulation.currentSettings, factory)

    expect(simulation.setPrismOutputCount(cell, 2)).toBe(true)
    const prism = simulation.structureAt(cell)!
    expect(prism.laneOutputs.map((output) => output?.amount)).toEqual([1, 2])
    expect(prism.inputs['rusted-copper']).toBe(12)

    const before = simulation.inventory['rusted-copper'] ?? 0
    expect(simulation.demolish(cell)).toBeNull()
    expect(simulation.inventory['rusted-copper']).toBe(before + 17)
  })

  it('soma duas entradas traseiras simultâneas na Confluência', () => {
    const simulation = new Simulation()
    const confluenceCell = logisticsWorld.getCell(0, 0)
    const firstInput = logisticsWorld.getCell(0, -1)
    const secondInput = logisticsWorld.getCell(-1, 1)
    simulation.build(confluenceCell, 'confluence', 0)
    simulation.build(firstInput, 'conveyor', 5)
    simulation.build(secondInput, 'conveyor', 1)
    const factory = simulation.getFactoryState()
    for (const structure of factory.structures) {
      if (structure.type === 'conveyor') {
        structure.output = { resource: 'rusted-copper', amount: 1 }
      }
    }
    simulation.restore(0, null, simulation.currentSettings, factory)

    advance(simulation)

    expect(simulation.structureAt(confluenceCell)?.output).toEqual({
      resource: 'rusted-copper',
      amount: 2,
    })
    expect(simulation.structureAt(firstInput)?.output).toBeNull()
    expect(simulation.structureAt(secondInput)?.output).toBeNull()
  })

  it('bloqueia entrada lateral e recursos incompatíveis na Confluência', () => {
    const simulation = new Simulation()
    const confluenceCell = logisticsWorld.getCell(0, 0)
    const sideCell = logisticsWorld.getCell(-1, 0)
    simulation.build(confluenceCell, 'confluence', 0)
    simulation.build(sideCell, 'conveyor', 0)
    const factory = simulation.getFactoryState()
    factory.structures.find((structure) => structure.type === 'confluence')!.output = {
      resource: 'rusted-copper',
      amount: 2,
    }
    factory.structures.find((structure) => structure.type === 'conveyor')!.output = {
      resource: 'fossil-coal',
      amount: 1,
    }
    simulation.restore(0, null, simulation.currentSettings, factory)

    advance(simulation)

    expect(simulation.structureAt(confluenceCell)?.output).toEqual({
      resource: 'rusted-copper',
      amount: 2,
    })
    expect(simulation.structureAt(sideCell)?.output).toEqual({
      resource: 'fossil-coal',
      amount: 1,
    })
  })

  it('só libera múltiplos completos do lote configurado no Silo', () => {
    const simulation = new Simulation()
    const cell = logisticsWorld.getCell(0, 0)
    simulation.build(cell, 'silo', 0)
    expect(simulation.setSiloReleaseMultiple(cell, 3)).toBe(true)
    const below = simulation.getFactoryState()
    below.structures[0].inputs = { 'rusted-copper': 2 }
    simulation.restore(0, null, simulation.currentSettings, below)
    advance(simulation)
    expect(simulation.structureAt(cell)?.output).toBeNull()
    expect(simulation.structureAt(cell)?.inputs['rusted-copper']).toBe(2)

    const complete = simulation.getFactoryState()
    complete.structures[0].inputs = { 'rusted-copper': 7 }
    simulation.restore(0, null, simulation.currentSettings, complete)
    advance(simulation)
    expect(simulation.structureAt(cell)?.output).toEqual({
      resource: 'rusted-copper',
      amount: 6,
    })
    expect(simulation.structureAt(cell)?.inputs['rusted-copper']).toBe(1)

    expect(simulation.setSiloReleaseMultiple(cell, 1)).toBe(true)
    expect(simulation.structureAt(cell)?.siloReleaseMultiple).toBe(2)
    expect(simulation.setSiloReleaseMultiple(cell, 99)).toBe(true)
    expect(simulation.structureAt(cell)?.siloReleaseMultiple).toBe(13)
  })

  it('cruza recursos diferentes em duas pistas independentes da Ponte', () => {
    const simulation = new Simulation()
    const bridgeCell = logisticsWorld.getCell(0, 0)
    const firstInput = logisticsWorld.getCell(-1, 0)
    const secondInput = logisticsWorld.getCell(-1, 1)
    const firstOutput = logisticsWorld.getCell(1, 0)
    const secondOutput = logisticsWorld.getCell(1, -1)
    simulation.build(bridgeCell, 'bridge', 0)
    simulation.build(firstInput, 'conveyor', 0)
    simulation.build(secondInput, 'conveyor', 1)
    simulation.build(firstOutput, 'conveyor', 0)
    simulation.build(secondOutput, 'conveyor', 1)
    const factory = simulation.getFactoryState()
    const conveyors = factory.structures.filter((structure) => structure.type === 'conveyor')
    conveyors.find((structure) => structure.q === -1 && structure.r === 0)!.output = {
      resource: 'rusted-copper',
      amount: 1,
    }
    conveyors.find((structure) => structure.q === -1 && structure.r === 1)!.output = {
      resource: 'fossil-coal',
      amount: 1,
    }
    simulation.restore(0, null, simulation.currentSettings, factory)

    advance(simulation)
    expect(simulation.structureAt(bridgeCell)?.laneOutputs).toEqual([
      { resource: 'rusted-copper', amount: 1 },
      { resource: 'fossil-coal', amount: 1 },
    ])

    advance(simulation)
    expect(simulation.structureAt(bridgeCell)?.laneOutputs).toEqual([null, null])
    expect(simulation.structureAt(firstOutput)?.output).toEqual({
      resource: 'rusted-copper',
      amount: 1,
    })
    expect(simulation.structureAt(secondOutput)?.output).toEqual({
      resource: 'fossil-coal',
      amount: 1,
    })
  })
})
