import { DIFFICULTIES } from '../content/difficulty'
import { STRUCTURE_LIST } from '../content/structures'
import { FREE_RULES_DIFFICULTY, type RulesConfig } from '../core/machineRules'
import { Simulation } from '../core/simulation'
import { hexKey } from '../math/hex'
import type { AlloyId, HexCell, HexDirection, OreId, ResourceInventory, StructureType } from '../types'
import { ChunkWorld } from '../world/ChunkWorld'
import { createSeedHash, generateCell } from '../world/generation'
import { DEFAULT_CHUNK_DISTANCE } from '../config'

/**
 * A scripted "advanced run" for the credits background. It is the real simulation: the machines below are built
 * one by one, tuned with the same setters the player uses, and then left to produce perfect cycles.
 */
export const CREDITS_SEED = 'CREDITOS-DORSO-DRACONICO'

interface Piece {
  readonly type: StructureType
  readonly q: number
  readonly r: number
  readonly direction: HexDirection
  readonly tier?: 1 | 2 | 3
  readonly batch?: number
  readonly lot?: number
  readonly target?: AlloyId
  readonly power?: number
  readonly rune?: 0 | 1 | 2 | 3
}

const EAST = 0 as HexDirection, NORTH = 2 as HexDirection, SOUTH = 5 as HexDirection

function belts(fromQ: number, toQ: number, r: number, tier: 1 | 2 | 3): Piece[] {
  return Array.from({ length: toQ - fromQ + 1 }, (_, index) => ({ type: 'conveyor', q: fromQ + index, r, direction: EAST, tier }))
}

function column(q: number, fromR: number, toR: number, tier: 1 | 2 | 3): Piece[] {
  return Array.from({ length: toR - fromR + 1 }, (_, index) => ({ type: 'conveyor', q, r: fromR + index, direction: SOUTH, tier }))
}

/** golem (batch n) -> belts -> devouring furnace (lot n) -> belts -> collector, so every cycle ends with remainder 0. */
function line(startQ: number, r: number, lot: number, rune: 0 | 1 | 2 | 3 = 0, tier: 1 | 2 | 3 = 2): Piece[] {
  return [
    { type: 'golem', q: startQ, r, direction: EAST, batch: lot },
    ...belts(startQ + 1, startQ + 4, r, tier),
    { type: 'smelter', q: startQ + 5, r, direction: EAST, lot, rune },
    ...belts(startQ + 6, startQ + 8, r, 3),
    { type: 'gnome', q: startQ + 9, r, direction: EAST },
  ]
}

/** Two golems feed the Altar de Fusão with 3 lots of copper and 2 of coal: Bronze Rúnico, MMC(2, 3) = 6. */
function altar(): Piece[] {
  return [
    { type: 'golem', q: -8, r: 1, direction: EAST, batch: 2 },
    ...belts(-7, 0, 1, 2),
    { type: 'golem', q: 2, r: -6, direction: SOUTH, batch: 3 },
    ...column(2, -5, -1, 2),
    { type: 'furnace', q: 1, r: 0, direction: EAST, target: 'runic-bronze' },
    ...belts(4, 7, 1, 3),
    { type: 'gnome', q: 8, r: 1, direction: EAST },
    { type: 'tower', q: 5, r: -2, direction: NORTH, power: 3 },
  ]
}

export const SCENE_PIECES: readonly Piece[] = [
  ...line(-14, -7, 4),
  ...line(-14, -4, 3, 1),
  ...altar(),
  ...line(-14, 5, 5),
  ...line(2, 5, 6),
  ...line(2, -9, 2, 2, 3),
]

export const SCENE_DEPOSITS: Readonly<Record<string, OreId>> = {
  [hexKey(-14, -7)]: 'rusted-copper',
  [hexKey(-14, -4)]: 'fossil-coal',
  [hexKey(-8, 1)]: 'rusted-copper',
  [hexKey(2, -6)]: 'fossil-coal',
  [hexKey(-14, 5)]: 'bloody-iron',
  [hexKey(2, 5)]: 'whispering-quartz',
  [hexKey(2, -9)]: 'rusted-copper',
}

const TICKS_PER_PIECE = 2

export function creditsRules(): RulesConfig {
  return {
    difficulty: { ...DIFFICULTIES.artisan, ...FREE_RULES_DIFFICULTY },
    mode: 'free', bounds: null, freeMode: true, hasTech: () => true, maxGnomes: 12,
    allowed: new Set(STRUCTURE_LIST.map((entry) => entry.id)),
  }
}

export function creditsWorld(): ChunkWorld {
  const hash = createSeedHash(CREDITS_SEED), overrides = new Map<string, HexCell>()
  for (const [key, ore] of Object.entries(SCENE_DEPOSITS)) {
    const [q, r] = key.split(',').map(Number)
    overrides.set(key, { ...generateCell(hash, q, r), terrain: 'ash', deposit: { ore, purity: 92, richness: 3, quantity: 400 } })
  }
  return new ChunkWorld(CREDITS_SEED, DEFAULT_CHUNK_DISTANCE, overrides)
}

const STARTING_STOCK: ResourceInventory = {
  'rusted-copper': 9999, 'fossil-coal': 9999, 'bloody-iron': 9999, 'whispering-quartz': 9999, 'raw-ether-crystal': 99,
}

/** Builds the factory piece by piece as ticks go by, then lets it run. */
export class CreditsRun {
  readonly simulation = new Simulation()
  private cursor = 0
  private elapsed = 0

  private readonly world: ChunkWorld

  constructor(world: ChunkWorld) { this.world = world; this.restart() }

  get finishedBuilding(): boolean { return this.cursor >= SCENE_PIECES.length }

  restart(): void {
    this.simulation.configure(creditsRules(), this.world)
    this.simulation.reset({ ...STARTING_STOCK })
    this.cursor = 0
    this.elapsed = 0
  }

  step(): void {
    this.elapsed += 1
    if (this.cursor < SCENE_PIECES.length && this.elapsed % TICKS_PER_PIECE === 0) this.place(SCENE_PIECES[this.cursor++])
    this.simulation.step(this.world)
  }

  private place(piece: Piece): void {
    const cell = this.world.getCell(piece.q, piece.r), { simulation } = this
    if (simulation.build(cell, piece.type, piece.direction, piece.tier ? { tier: piece.tier } : {})) return
    const at = { q: piece.q, r: piece.r }
    if (piece.batch) simulation.setGolemBatch(at, piece.batch)
    if (piece.lot) simulation.setSmelterLot(at, piece.lot)
    if (piece.target) simulation.setTarget(at, piece.target)
    if (piece.power) simulation.setTowerPower(at, piece.power)
    if (piece.rune) simulation.engraveRune(at, piece.rune)
  }
}
