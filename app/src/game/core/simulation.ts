import type { CueEvent, SoundCue } from '../audio/cues'
import { DEFAULT_SETTINGS, SIMULATION_STEP_MS } from '../config'
import { HEX_DIRECTIONS, hexDistance, hexKey } from '../math/hex'
import { emptyStats } from '../stats'
import { ORES } from '../content/ores'
import { assignChannel, DEFAULT_CHANNEL, isChannelSequence, normalizeStructureChannel } from '../content/channels'
import {
  ALCHEMIST_COST_ETHER,
  ALCHEMY_CORE_CAPACITY,
  COLLECTOR_CAPACITY,
  COLLECTOR_MAX_WAIT,
  COLLECTOR_MIN_WAIT,
  COLLECTOR_RADIUS,
  COLLECTOR_TICKS_PER_UNIT,
  COLLECTOR_WALK_LIMIT,
  MIGRATION_DISTANCE_WEIGHT,
  MIGRATION_WALK_LIMIT,
  ENERGIZER_MAX_DOSE,
  ALCHEMY_SEED_CAPACITY,
  ENERGIZER_BRASS_CAPACITY,
  ENERGIZER_RADIUS,
  MAX_DECOR,
  isDecor,
  GOLEM_MIGRATION_RADIUS,
  GOLEM_MIGRATION_TICKS_PER_CELL,
  LEGACY_RECIPE_LIST,
  LOGISTICS_INTERVAL_TICKS,
  MAX_CONFLUENCE_BUFFER,
  MAX_FURNACE_INPUT_PER_RESOURCE,
  MAX_GOLEM_BUFFER,
  MAX_LOGISTICS_BUFFER,
  MAX_PRISM_BUFFER,
  MAX_SILO_RELEASE_MULTIPLE,
  MAX_STACK,
  MAX_STRUCTURES,
  MAX_TOWER_POWER,
  MIN_SILO_RELEASE_MULTIPLE,
  RECIPES,
  RUNE_COSTS,
  STRICT_BELT_PERIODS,
  STRUCTURES,
  createInitialFactoryState,
  depositRecoveryPerSecond,
  maxHpFor,
  recipeForResource,
} from '../content/structures'
import type {
  AlloyId,
  Axial,
  ChannelSequence,
  ChunkDistance,
  FactoryState,
  GameSettings,
  HexCell,
  HexDirection,
  Monster,
  MonsterKind,
  PrismOutputCount,
  ResourceId,
  ResourceInventory,
  ResourceStack,
  RunStats,
  Shipment,
  SimulationSpeed,
  Structure,
  StructureType,
  TransferMotion,
} from '../types'
import type { ChunkWorld } from '../world/ChunkWorld'
import type { BeltStep } from './beltStroke'
import { insideBounds, isLiquid, isObstacle } from '../world/contractMap'
import { connectionForLane, containsCell, footprintCells, outputDirections, structureSize, type Point } from './structureGeometry'
import {
  acceptsResource,
  applyRepair,
  collectFrom,
  energizerMultiplier,
  evaluateBursts,
  isOre,
  updateAlchemy,
  updateCollector,
  updateEnergizer,
  updateGrandAltar,
  hpOf,
  isBroken,
  isFusionMachine,
  isLotMachine,
  portLot,
  pruneShipments,
  recipesFor,
  registerArrival,
  repairCost,
  updateDepot,
  updateFusionMachine,
  updateGnomePost,
  updateMonsters,
  updatePortal,
  updateSmelter,
  updateTower,
  type RuleHost,
  type RulesConfig,
  type SimEvent,
} from './machineRules'

type CellWorld = Pick<ChunkWorld, 'getCell'>

interface TransferPlan {
  readonly path: Point[]
  readonly source: Structure
  readonly target: Structure
  readonly resource: ResourceId
  readonly scale: number
  readonly sourceLane: number
  readonly targetLane: number
}

export interface ShotEffect { from: { x: number; y: number }; to: { x: number; y: number }; good: boolean; until: number }

const CONVEYOR_COSTS: Record<1 | 2 | 3, Partial<Record<ResourceId, number>>> = {
  1: { 'rusted-copper': 1 },
  2: { 'rusted-copper': 2, 'fossil-coal': 1 },
  3: { 'rusted-copper': 2, 'bloody-iron': 2 },
}

function cloneStack(stack: ResourceStack | null): ResourceStack | null {
  return stack ? { ...stack } : null
}

function inventoryTotal(inventory: ResourceInventory): number {
  return Object.values(inventory).reduce((total, amount) => total + (amount ?? 0), 0)
}

function sourceStack(structure: Structure, lane: number): ResourceStack | null {
  if (structure.type === 'prism' || structure.type === 'bridge') return structure.laneOutputs[lane] ?? null
  return lane === 0 ? structure.output : null
}

function cloneStructure(structure: Structure): Structure {
  const result:Structure = {
    ...structure,
    inputs: { ...structure.inputs },
    output: cloneStack(structure.output),
    laneOutputs: structure.laneOutputs.map(cloneStack),
    migrationPath: structure.migrationPath.map((cell) => ({ ...cell })),
    ...(structure.crystals ? { crystals: { ...structure.crystals } } : {}),
    ...(structure.bursts ? { bursts: Object.fromEntries(Object.entries(structure.bursts).map(([key, value]) => [key, { ...value }])) } : {}),
    ...(structure.absorbed ? { absorbed: [...structure.absorbed] } : {}),
    ...(structure.ratio ? { ratio: [...structure.ratio] as [number, number] } : {}),
    ...(structure.worker ? { worker: { ...structure.worker } } : {}),
    ...(structure.errand ? { errand: { ...structure.errand, target: { ...structure.errand.target } } } : {}),
    ...(structure.jobs ? { jobs: structure.jobs.map((job) => ({ ...job })) } : {}),
    ...(structure.products ? { products: { ...structure.products } } : {}),
  }
  normalizeStructureChannel(result)
  return result
}

export class Simulation implements RuleHost {
  private tickCount = 0
  private selectedHex: Axial | null = null
  private settings: GameSettings = { ...DEFAULT_SETTINGS }
  private structuresMap = new Map<string, Structure>()
  private readonly idIndex=new Map<number,Structure>()
  private listCache:Structure[]|null=null
  private readonly occupancy = new Map<string, Structure>()
  private inventoryState: ResourceInventory = {}
  private depositRemaining: Record<string, number> = {}
  private nextStructureId = 1
  private transferMotions: TransferMotion[] = []
  private readonly activeDeposits = new Set<string>()
  private readonly productionScratch: Structure[] = []
  private readonly migrationSearchCooldown = new Map<number, number>()

  // Contract rules ("strict" mode). Without rules the original sandbox behaviour is preserved bit for bit.
  rulesConfig: RulesConfig | null = null
  private worldRef: CellWorld | null = null
  ether = 0
  stats: RunStats = emptyStats()
  monsters: Monster[] = []
  shipments: Shipment[] = []
  private nextMonsterId = 1
  private deliveredState: ResourceInventory = {}
  private eventQueue: SimEvent[] = []
  private cueQueue: CueEvent[] = []
  readonly shots: ShotEffect[] = []
  private readonly flowWindow = new Map<number, { count: number; rate: number; since: number }>()
  private forecastCache: { at: number; warnings: Map<number, string> } = { at: -1, warnings: new Map() }

  constructor() {
    this.resetFactory()
  }

  get rules(): RulesConfig {
    if (!this.rulesConfig) throw new Error('As regras de contrato não estão ativas.')
    return this.rulesConfig
  }

  get strict(): boolean {
    return this.rulesConfig !== null
  }

  get structureList(): Structure[] {
    return this.listCache??(this.listCache=Array.from(this.structuresMap.values()))
  }

  configure(rules: RulesConfig | null, world: CellWorld | null): void {
    this.rulesConfig = rules
    this.worldRef = world
  }

  get bounds(): number | null {
    return this.rulesConfig?.bounds ?? null
  }

  structureById(id: number): Structure | null {
    return this.idIndex.get(id)??null
  }

  emit(event: SimEvent): void {
    if (event.kind === 'shot') {
      this.shots.push({ from: event.from, to: event.to, good: event.good, until: this.tickCount + 8 })
      this.pushCue(event.good ? 'shot' : 'ricochet', event.from.x, event.from.y)
      return
    }
    if (event.kind === 'cue') { this.pushCue(event.cue, event.x, event.y); return }
    if (this.eventQueue.length < 64) this.eventQueue.push(event)
  }

  /** Sounds are bounded: a 4× factory must never pile up work for the audio thread. */
  pushCue(cue: SoundCue, x: number, y: number): void {
    if (this.cueQueue.length < 48) this.cueQueue.push({ cue, x, y })
  }

  private cueAtStructure(cue: SoundCue, structure: Structure): void {
    const offset = (structureSize(structure) - 1) / 2
    this.pushCue(cue, structure.q + offset, structure.r + offset)
  }

  drainCues(): CueEvent[] {
    const pending = this.cueQueue
    this.cueQueue = []
    return pending
  }

  drainEvents(): SimEvent[] {
    const pending = this.eventQueue
    this.eventQueue = []
    return pending
  }

  spendEther(amount: number): boolean {
    if (amount <= 0 || this.rulesConfig?.freeMode) return true
    if (this.ether < amount) return false
    this.ether -= amount
    return true
  }

  gainEther(amount: number): void {
    if (!this.rulesConfig?.freeMode) this.ether += amount
  }

  newMonster(kind: MonsterKind, at: Structure, number: number, hp: number): void {
    if (this.monsters.length >= 12) return
    const size = at.size ?? 1
    const angle = (this.nextMonsterId * 2.399) % (Math.PI * 2)
    const x = at.q + (size - 1) / 2 + Math.cos(angle) * (size / 2 + 0.9)
    const y = at.r + (size - 1) / 2 + Math.sin(angle) * (size / 2 + 0.9)
    this.monsters.push({ id: this.nextMonsterId++, kind, number, hp, maxHp: hp, x, y, fast: kind === 'slag' && number >= 6, cooldown: 30 })
    this.pushCue('spawn', x, y)
  }

  removeMonster(monster: Monster): void {
    this.pushCue('slain', monster.x, monster.y)
    this.monsters = this.monsters.filter((candidate) => candidate.id !== monster.id)
  }

  step(world: CellWorld): void {
    this.tickCount += 1
    this.worldRef = world
    this.updateProduction(world)
    this.recoverDeposits(world)
    if (!this.strict) {
      if (this.tickCount % LOGISTICS_INTERVAL_TICKS === 0) this.transferResources()
      return
    }
    this.transferResources()
    updateMonsters(this)
    pruneShipments(this)
    if (this.shots.length) for (let index = this.shots.length - 1; index >= 0; index -= 1) if (this.shots[index].until < this.tickCount) this.shots.splice(index, 1)
    for (const [id, window] of this.flowWindow) {
      if (this.tickCount - window.since >= 1200) { window.rate = window.count; window.count = 0; window.since = this.tickCount }
      if (!this.structureById(id)) this.flowWindow.delete(id)
    }
  }

  select(hex: Axial | null): void {
    this.selectedHex = hex
  }

  setSpeed(speed: SimulationSpeed): void {
    this.settings = { ...this.settings, speed }
  }

  setShowCoordinates(show: boolean): void {
    this.settings = { ...this.settings, showCoordinates: show }
  }

  setChunkDistance(distance: ChunkDistance): void {
    this.settings = { ...this.settings, chunkDistance: distance }
  }

  /** Why a piece cannot be placed at all (before cost or space). */
  lockReason(type: StructureType): string | null {
    const rules = this.rulesConfig
    if (!rules || rules.allowed.has(type)) return null
    const definition = STRUCTURES[type]
    if (definition.tech && !rules.hasTech(definition.tech)) return `${definition.name} requer uma melhoria do Grande Grimório.`
    return `${definition.name} será liberada em um contrato mais avançado.`
  }

  private terrainError(cell: Axial, type: StructureType): string | null {
    const rules = this.rulesConfig
    if (!rules) return null
    if (!insideBounds(rules.bounds, cell.q, cell.r)) return 'Fora do mapa do contrato: o terreno termina aqui.'
    if (type === 'grandaltar') {
      // The one piece that must stand on the obstacle the others cannot: all 25 cells over magma.
      if (!this.worldRef) return null
      return this.worldRef.getCell(cell.q, cell.r).terrain === 'magma' ? null : 'O Altar de Fusão Maior precisa de uma Fenda de Magma sob as 25 células (5×5).'
    }
    if (rules.freeMode || !this.worldRef) return null
    const terrain = this.worldRef.getCell(cell.q, cell.r)
    if (!isObstacle(terrain)) return null
    if (isLiquid(terrain) && ((type === 'conveyor' && rules.hasTech('levitation')) || (type === 'bridge' && rules.hasTech('mithril-bridges')))) return null
    const names: Record<string, string> = { magma: 'uma fenda de magma', acid: 'um lago ácido', basalt: 'um pilar de basalto', ruin: 'uma ruína antiga' }
    const levitation = isLiquid(terrain) && type === 'conveyor' ? ' As Esteiras de Levitação (Grimório) cruzam líquidos.' : ''
    return `Há ${names[terrain.terrain] ?? 'um obstáculo natural'} aqui.${levitation}`
  }

  build(cell: HexCell, type: StructureType, direction: HexDirection, options: { tier?: 1 | 2 | 3 } = {}): string | null {
    const existing = this.structureAt(cell)
    // A floor gives way to whatever is built over it; on another floor the click only changes the finish.
    if (existing && !(existing.type === 'paving' && type !== 'paving')) {
      if (this.strict && existing.type === 'conveyor' && type === 'conveyor' && options.tier && options.tier !== (existing.tier ?? 1)) {
        return this.upgradeConveyor(existing, options.tier)
      }
      if (existing.type === 'paving' && type === 'paving') {
        existing.tier = options.tier ?? existing.tier ?? 1
        return null
      }
      existing.direction = ((existing.direction + 1) % 6) as HexDirection
      return null
    }
    const locked = this.lockReason(type)
    if (locked) return locked
    const placementError = this.placementError(cell, type)
    if (placementError) return placementError
    if (isDecor(type)) {
      if (this.decorCount >= MAX_DECOR) return `A oficina comporta ${MAX_DECOR} peças de decoração.`
    } else if (this.structuresMap.size - this.decorCount >= MAX_STRUCTURES) return `A oficina desta etapa suporta ${MAX_STRUCTURES} estruturas.`
    if (type === 'golem' && !cell.deposit) return 'O Golem Minerador precisa ser construído sobre uma jazida.'
    if (type === 'golem' && (this.getDepositRemaining(cell) ?? 0) < 1) return 'Esta jazida já está esgotada.'
    const tier = options.tier ?? 1
    const cost = type === 'conveyor' && this.strict ? CONVEYOR_COSTS[tier] : STRUCTURES[type].cost
    for (const [resource, amount] of Object.entries(cost)) {
      if ((this.inventoryState[resource as ResourceId] ?? 0) < (amount ?? 0)) {
        return `Recursos insuficientes para ${STRUCTURES[type].name}.`
      }
    }
    for (const [resource, amount] of Object.entries(cost)) {
      this.addInventory(resource as ResourceId, -(amount ?? 0))
    }
    this.clearFloors(cell, STRUCTURES[type].size, type)
    if (cell.deposit && this.depositRemaining[cell.key] === undefined) {
      this.depositRemaining[cell.key] = cell.deposit.quantity * cell.deposit.richness
    }
    const structure: Structure = {
      id: this.nextStructureId,
      type,
      size: STRUCTURES[type].size,
      q: cell.q,
      r: cell.r,
      direction,
      inputs: {},
      output: null,
      recipe: null,
      progress: 0,
      createdTick: this.tickCount,
      workTicks: type === 'golem' && cell.deposit ? 10 + ORES[cell.deposit.ore].extraction * 4 : 0,
      sourceResource: type === 'golem' && cell.deposit ? cell.deposit.ore : null,
      migrationPath: [],
      migrationProgress: 0,
      migrationThreshold: 0,
      laneOutputs: type === 'prism' || type === 'bridge' ? [null, null] : [],
      prismOutputCount: 2,
      siloReleaseMultiple: 2,
    }
    if (this.strict) {
      structure.hp = maxHpFor(type)
      if (type === 'golem') structure.batch = 1
      if (type === 'smelter') structure.lot = 2
      if (type === 'conveyor') structure.tier = tier
      if (type === 'tower') structure.power = 1
      if (type === 'energizer') structure.power = 1
      if (type === 'depot' || type === 'portal') assignChannel(structure,DEFAULT_CHANNEL)
      if (type === 'depot') structure.crateSize = 10
      if (type === 'furnace' || type === 'chamber' || type === 'grandaltar') structure.target = null
      if (!isDecor(type)) this.stats.machinesBuilt += 1
    }
    if (type === 'paving') structure.tier = tier
    this.nextStructureId += 1
    this.structuresMap.set(cell.key, structure)
    this.idIndex.set(structure.id,structure)
    this.listCache=null
    this.occupy(structure)
    this.stats.peakMachines = Math.max(this.stats.peakMachines, this.structuresMap.size - this.decorCount)
    this.cueAtStructure('build', structure)
    return null
  }

  /** Floors and lanterns are counted apart from the machines. */
  private get decorCount(): number {
    let count = 0
    for (const structure of this.structuresMap.values()) if (isDecor(structure.type)) count += 1
    return count
  }

  /** What a belt or a machine would collide with: a floor is not an obstacle, it is replaced. */
  blockerAt(cell: Axial): Structure | null {
    const structure = this.structureAt(cell)
    return structure && structure.type === 'paving' ? null : structure
  }

  /** Floors under a new piece are removed (their cost goes back to the reserve). */
  private clearFloors(cell: Axial, size: number, type: StructureType): void {
    if (type === 'paving') return
    for (const covered of footprintCells(cell, size)) {
      const floor = this.structureAt(covered)
      if (!floor || floor.type !== 'paving') continue
      for (const [resource, amount] of Object.entries(STRUCTURES.paving.cost)) this.addInventory(resource as ResourceId, amount ?? 0)
      this.vacate(floor)
      this.structuresMap.delete(hexKey(floor.q, floor.r))
      this.idIndex.delete(floor.id)
      this.listCache = null
    }
  }

  private upgradeConveyor(structure: Structure, tier: 1 | 2 | 3): string | null {
    const cost = CONVEYOR_COSTS[tier]
    for (const [resource, amount] of Object.entries(cost)) {
      if ((this.inventoryState[resource as ResourceId] ?? 0) < (amount ?? 0)) return 'Recursos insuficientes para esta esteira.'
    }
    for (const [resource, amount] of Object.entries(cost)) this.addInventory(resource as ResourceId, -(amount ?? 0))
    for (const [resource, amount] of Object.entries(CONVEYOR_COSTS[structure.tier ?? 1])) this.addInventory(resource as ResourceId, amount ?? 0)
    structure.tier = tier
    return null
  }

  /** Validate on an isolated factory before committing: no partial lines, charges or rotated obstacles. */
  drawConveyors(steps: readonly BeltStep[], world: CellWorld, tier: 1 | 2 | 3): string | null {
    if (!steps.length) return null
    if (steps.length > Math.min(512,MAX_STRUCTURES)) return `Desenhe até ${Math.min(512,MAX_STRUCTURES)} células por trecho.`
    const end = this.blockerAt(steps[steps.length-1])
    const firstTerminal = end && end.type !== 'conveyor' ? steps.findIndex((step) => this.blockerAt(step)?.id === end.id) : -1
    if (firstTerminal >= 0 && steps.slice(firstTerminal).some((step) => this.blockerAt(step)?.id !== end!.id)) return 'A esteira atravessaria uma máquina. Termine na borda dela.'
    const start=this.blockerAt(steps[0])
    const firstBelt=start && start.type!=='conveyor'?steps.findIndex(step=>this.blockerAt(step)?.id!==start.id):0
    if(firstBelt<0) return 'Arraste da máquina até uma célula livre para criar a esteira.'
    const commands = steps.slice(firstBelt,firstTerminal >= 0 ? firstTerminal : undefined)
    if(!commands.length) return 'Deixe uma célula livre entre as máquinas para a esteira.'
    const apply = (simulation: Simulation): string | null => {
      const origin=firstBelt>0?simulation.blockerAt(steps[0]):null
      if(origin) origin.direction=steps[firstBelt-1].direction
      for (const step of commands) {
        const existing = simulation.blockerAt(step)
        if (existing) {
          if (existing.type !== 'conveyor') return 'Comece a esteira em uma célula livre ou em outra esteira.'
          existing.direction = step.direction
        } else {
          const error = simulation.build(world.getCell(step.q,step.r),'conveyor',step.direction,{tier})
          if (error) return error
        }
      }
      if(origin && !outputDirections(origin).some((_,lane)=>connectionForLane(origin,lane,(q,r)=>simulation.structureAtCoords(q,r))?.target.id===simulation.structureAt(commands[0])?.id)) return 'Comece no centro do bocal de saída da máquina.'
      if (firstTerminal > 0) {
        const last = commands[commands.length-1], source = simulation.structureAt(last)!
        if (!connectionForLane(source,0,(q,r) => simulation.structureAtCoords(q,r))) return 'Termine a esteira numa entrada compatível da máquina.'
      }
      return null
    }
    const rehearsal = new Simulation()
    rehearsal.restore(this.tickCount,this.selectedHex,this.settings,this.getFactoryState())
    rehearsal.configure(this.rulesConfig,world)
    const error = apply(rehearsal)
    return error ?? apply(this)
  }

  demolish(cell: HexCell): string | null {
    const structure = this.structureAt(cell)
    if (!structure) return 'Não há uma estrutura nesta célula.'
    const cost = structure.type === 'conveyor' && this.strict ? CONVEYOR_COSTS[structure.tier ?? 1] : STRUCTURES[structure.type].cost
    for (const [resource, amount] of Object.entries(cost)) {
      this.addInventory(resource as ResourceId, amount ?? 0)
    }
    for (const [resource, amount] of Object.entries(structure.inputs)) {
      this.addInventory(resource as ResourceId, amount ?? 0)
    }
    for (const [resource, tracker] of Object.entries(structure.bursts ?? {})) this.addInventory(resource as ResourceId, tracker.count)
    if (structure.output && !structure.output.scale) this.addInventory(structure.output.resource, structure.output.amount)
    for (const output of structure.laneOutputs) {
      if (output) this.addInventory(output.resource, output.amount)
    }
    for (const [resource, amount] of Object.entries(structure.products ?? {})) this.addInventory(resource as ResourceId, amount ?? 0)
    this.vacate(structure)
    this.structuresMap.delete(hexKey(structure.q, structure.r))
    this.idIndex.delete(structure.id)
    this.listCache=null
    this.migrationSearchCooldown.delete(structure.id)
    this.flowWindow.delete(structure.id)
    if (this.selectedHex && containsCell(structure, this.selectedHex)) this.selectedHex = null
    this.cueAtStructure('demolish', structure)
    return null
  }

  rotateAt(cell: Axial): boolean {
    const structure = this.structureAt(cell)
    if (!structure) return false
    structure.direction = ((structure.direction + 1) % 6) as HexDirection
    return true
  }

  setGolemMigrationThreshold(cell: Axial, threshold: number): boolean {
    const structure = this.structureAt(cell)
    if (!structure || structure.type !== 'golem') return false
    structure.migrationThreshold = Math.max(0, Math.min(90, Math.round(threshold / 5) * 5))
    this.migrationSearchCooldown.delete(structure.id)
    return true
  }

  setPrismOutputCount(cell: Axial, count: PrismOutputCount): boolean {
    const structure = this.structureAt(cell)
    if (!structure || structure.type !== 'prism') return false
    for (let lane = count; lane < structure.laneOutputs.length; lane += 1) {
      const output = structure.laneOutputs[lane]
      if (output) structure.inputs[output.resource] = (structure.inputs[output.resource] ?? 0) + output.amount
    }
    structure.laneOutputs = Array.from({ length: count }, (_, lane) => cloneStack(structure.laneOutputs[lane] ?? null))
    structure.prismOutputCount = count
    if (count !== 2) delete structure.ratio
    return true
  }

  setSiloReleaseMultiple(cell: Axial, multiple: number): boolean {
    const structure = this.structureAt(cell)
    if (!structure || structure.type !== 'silo') return false
    structure.siloReleaseMultiple = Math.max(MIN_SILO_RELEASE_MULTIPLE, Math.min(MAX_SILO_RELEASE_MULTIPLE, Math.round(multiple)))
    return true
  }

  // Contract-rule configuration -----------------------------------------------

  setGolemBatch(cell: Axial, batch: number): boolean {
    const structure = this.structureAt(cell)
    if (!structure || structure.type !== 'golem') return false
    structure.batch = Math.max(1, Math.min(9, Math.round(batch)))
    return true
  }

  setSmelterLot(cell: Axial, lot: number): boolean {
    const structure = this.structureAt(cell)
    if (!structure || structure.type !== 'smelter') return false
    structure.lot = Math.max(2, Math.min(9, Math.round(lot)))
    structure.inputs = {}
    structure.bursts = {}
    return true
  }

  setTarget(cell: Axial, target: AlloyId | null): string | null {
    const structure = this.structureAt(cell)
    if (!structure || !isFusionMachine(structure.type)) return 'Esta estrutura não funde ligas.'
    if (target !== null && !recipesFor(structure.type).some((recipe) => recipe.id === target)) return 'Esta máquina não conhece essa receita.'
    if (structure.recipe) return 'Aguarde a fusão em andamento terminar.'
    structure.target = target
    return null
  }

  setTowerPower(cell: Axial, power: number): boolean {
    const structure = this.structureAt(cell)
    if (!structure || structure.type !== 'tower') return false
    structure.power = Math.max(1, Math.min(MAX_TOWER_POWER, Math.round(power)))
    return true
  }

  /** Paints a floor along a drag. Machines in the way are left alone; the first real problem stops the stroke. */
  paintFloors(steps: readonly BeltStep[], world: CellWorld, tier: 1 | 2 | 3): string | null {
    let painted = 0, problem: string | null = null
    for (const step of steps) {
      const cell = world.getCell(step.q, step.r)
      const existing = this.structureAt(cell)
      if (existing && (existing.type !== 'paving' || (existing.tier ?? 1) === tier)) continue
      const error = this.build(cell, 'paving', 0, { tier })
      if (error) { problem = error; break }
      painted += 1
    }
    return painted === 0 ? problem : null
  }

  setEnergizerDose(cell: Axial, dose: number): boolean {
    const structure = this.structureAt(cell)
    if (!structure || structure.type !== 'energizer') return false
    structure.power = Math.max(1, Math.min(ENERGIZER_MAX_DOSE, Math.round(dose)))
    return true
  }

  setChannel(cell: Axial, colors: ChannelSequence): boolean {
    const structure = this.structureAt(cell)
    if (!structure || (structure.type !== 'depot' && structure.type !== 'portal')||!isChannelSequence(colors)) return false
    assignChannel(structure,colors)
    return true
  }

  setCrateSize(cell: Axial, size: 10 | 50 | 100): boolean {
    const structure = this.structureAt(cell)
    if (!structure || structure.type !== 'depot') return false
    structure.crateSize = size
    return true
  }

  setPrismRatio(cell: Axial, ratio: [number, number] | null): string | null {
    const structure = this.structureAt(cell)
    if (!structure || structure.type !== 'prism') return 'Não é um Prisma Divisor.'
    if (ratio && !this.rulesConfig?.hasTech('adjustable-prism')) return 'Requer a melhoria Prisma Ajustável.'
    if (ratio && structure.prismOutputCount !== 2) return 'A proporção só vale para um Prisma de duas saídas.'
    if (ratio) structure.ratio = [Math.max(1, Math.min(5, ratio[0])), Math.max(1, Math.min(5, ratio[1]))]
    else delete structure.ratio
    return null
  }

  engraveRune(cell: Axial, level: 0 | 1 | 2 | 3): string | null {
    const structure = this.structureAt(cell)
    if (!structure || !isLotMachine(structure.type)) return 'Runas só se gravam em Fornalhas, Altares e Câmaras.'
    if (structure.type === 'grandaltar') return 'O Altar Maior já dobra a saída; Runas não se aplicam a ele.'
    if (level === 0) { structure.rune = 0; return null }
    if ((structure.rune ?? 0) >= level) { structure.rune = level; return null }
    const rules = this.rulesConfig
    const ceiling = !rules ? 3 : rules.freeMode || rules.hasTech('rune-100') ? 3 : rules.hasTech('rune-10') ? 1 : 0
    if (level > ceiling) return level === 1 ? 'Requer a Runa de Dezena no Grande Grimório.' : 'Requer as Runas de Centena e Milhar no Grande Grimório.'
    if (!this.spendEther(RUNE_COSTS[level])) return `Gravar a runa custa ${RUNE_COSTS[level]} Pontos de Éter.`
    structure.rune = level
    return null
  }

  setTwin(cell: Axial, twin: boolean): string | null {
    const structure = this.structureAt(cell)
    if (!structure || !isLotMachine(structure.type)) return 'Só fornalhas, altares e câmaras podem ser geminados.'
    if (twin && !structure.twin) {
      if (this.rulesConfig && !this.rulesConfig.hasTech('twin-forges')) return 'Requer Forjas Geminadas no Grande Grimório.'
      if (!this.spendEther(6)) return 'Acoplar a segunda fornalha custa 6 Pontos de Éter.'
    }
    structure.twin = twin
    return null
  }

  setAlchemist(cell: Axial, on: boolean): string | null {
    const structure = this.structureAt(cell)
    if (!structure || !isLotMachine(structure.type)) return 'O Alquimista trabalha em Fornalhas, Altares e Câmaras.'
    if (on && !structure.alchemist) {
      if (this.rulesConfig && !this.rulesConfig.hasTech('gnome-guild')) return 'Requer a Guilda dos Gnomos no Grande Grimório.'
      if (!this.spendEther(ALCHEMIST_COST_ETHER)) return `Alocar o Gnomo Alquimista custa ${ALCHEMIST_COST_ETHER} Pontos de Éter.`
    }
    structure.alchemist = on
    return null
  }

  repairAt(cell: Axial): string | null {
    const structure = this.structureAt(cell)
    if (!structure) return 'Não há estrutura aqui.'
    if (repairCost(structure) <= 0) return 'Esta estrutura não precisa de conserto.'
    if (!applyRepair(this, structure)) return `Faltam Pontos de Éter: o conserto custa ${repairCost(structure)}.`
    return null
  }

  insertCrystals(cell: Axial, amount: number): string | null {
    const structure = this.structureAt(cell)
    if (!structure || !isLotMachine(structure.type) || structure.type === 'smelter') return 'Só Altares e Câmaras aceitam Cristais de Éter.'
    const have = this.inventoryState['raw-ether-crystal'] ?? 0
    const move = Math.min(amount, have, 12 - (structure.inputs['raw-ether-crystal'] ?? 0))
    if (move <= 0) return have <= 0 ? 'Não há Cristais de Éter Bruto na reserva.' : 'O compartimento de cristais está cheio.'
    this.addInventory('raw-ether-crystal', -move)
    structure.inputs['raw-ether-crystal'] = (structure.inputs['raw-ether-crystal'] ?? 0) + move
    return null
  }

  restore(tick: number, selected: Axial | null, settings: GameSettings, factory?: FactoryState): void {
    this.tickCount = tick
    this.selectedHex = selected
    this.settings = { ...settings }
    const restored = factory ?? createInitialFactoryState()
    this.structuresMap = new Map(restored.structures.map((structure) => [hexKey(structure.q, structure.r), cloneStructure(structure)]))
    this.idIndex.clear()
    this.listCache=null
    for(const structure of this.structuresMap.values()) this.idIndex.set(structure.id,structure)
    this.occupancy.clear()
    for (const structure of this.structuresMap.values()) this.occupy(structure)
    this.inventoryState = { ...restored.inventory }
    this.depositRemaining = { ...restored.deposits }
    this.nextStructureId = restored.nextStructureId
    this.transferMotions = []
    this.migrationSearchCooldown.clear()
    this.deliveredState = { ...(restored.delivered ?? {}) }
    this.monsters = (restored.monsters ?? []).map((monster) => ({ ...monster }))
    this.shipments = (restored.shipments ?? []).map((shipment) => ({ ...shipment }))
    this.nextMonsterId = restored.nextMonsterId ?? Math.max(1, ...this.monsters.map((monster) => monster.id + 1))
    this.eventQueue = []
    this.cueQueue = []
    this.shots.length = 0
    this.flowWindow.clear()
    this.forecastCache = { at: -1, warnings: new Map() }
  }

  reset(inventory?: ResourceInventory): void {
    this.tickCount = 0
    this.selectedHex = null
    this.stats = emptyStats()
    this.resetFactory(inventory)
  }

  structureAt(cell: Axial): Structure | null {
    return this.structureAtCoords(cell.q, cell.r)
  }

  structureAtCoords(q: number, r: number): Structure | null {
    return this.occupancy.get(hexKey(q, r)) ?? null
  }

  placementError(cell: Axial, type: StructureType): string | null {
    for (const occupied of footprintCells(cell, STRUCTURES[type].size)) {
      const other = this.structureAt(occupied)
      if (other && !(other.type === 'paving' && type !== 'paving')) return `Área ocupada. ${STRUCTURES[type].name} precisa de ${STRUCTURES[type].size}×${STRUCTURES[type].size} células livres.`
      if (this.isMigrationReservedCell(occupied)) return 'Esta área está reservada para a rota de um Golem.'
      const terrain = this.terrainError(occupied, type)
      if (terrain) return terrain
    }
    return null
  }

  expandAt(cell: Axial): string | null {
    const structure = this.structureAt(cell)
    if (!structure) return 'Não há uma estrutura nesta célula.'
    const size = STRUCTURES[structure.type].size
    if ((structure.size ?? 1) >= size) return 'Esta estrutura já está no tamanho completo.'
    for (const cell of footprintCells(structure, size)) {
      const other = this.structureAt(cell)
      if (other && other.id !== structure.id) return `Libere a área de ${size}×${size} células antes de ampliar.`
      if (this.isMigrationReservedCell(cell)) return 'A ampliação bloquearia uma rota de Golem.'
    }
    if (connectionForLane(structure, 0, (q,r) => this.structureAtCoords(q,r))) return 'Desconecte a saída antes de ampliar; o bocal será reposicionado na nova borda.'
    structure.size = size
    this.occupy(structure)
    return null
  }

  private occupy(structure: Structure): void {
    for (const cell of footprintCells(structure, structure.size ?? 1)) this.occupancy.set(hexKey(cell.q, cell.r), structure)
  }

  private vacate(structure: Structure): void {
    for (const cell of footprintCells(structure, structure.size ?? 1)) this.occupancy.delete(hexKey(cell.q, cell.r))
  }

  get hasPendingTransferMotions(): boolean {
    return this.transferMotions.length > 0
  }

  drainTransferMotions(): TransferMotion[] {
    const pending = this.transferMotions
    this.transferMotions = []
    return pending
  }

  getDepositRemaining(cell: HexCell): number | null {
    if (!cell.deposit) return null
    return this.depositRemaining[cell.key] ?? cell.deposit.quantity * cell.deposit.richness
  }

  getFactoryState(): FactoryState {
    return {
      structures: Array.from(this.structuresMap.values(), cloneStructure),
      inventory: { ...this.inventoryState },
      deposits: { ...this.depositRemaining },
      nextStructureId: this.nextStructureId,
      delivered: { ...this.deliveredState },
      monsters: this.monsters.map((monster) => ({ ...monster })),
      shipments: this.shipments.map((shipment) => ({ ...shipment })),
      nextMonsterId: this.nextMonsterId,
    }
  }

  get tick(): number {
    return this.tickCount
  }

  get selected(): Axial | null {
    return this.selectedHex
  }

  get currentSettings(): GameSettings {
    return this.settings
  }

  get structures(): IterableIterator<Structure> {
    return this.structuresMap.values()
  }

  /** Machines only: floors and lanterns are decoration. */
  get structureCount(): number {
    return this.structuresMap.size - this.decorCount
  }

  get inventory(): ResourceInventory {
    return { ...this.inventoryState }
  }

  get delivered(): ResourceInventory {
    return { ...this.deliveredState }
  }

  get monsterCount(): number {
    return this.monsters.length
  }

  /** 0–100: average health of the factory, reduced by every monster at large. */
  get stability(): number {
    const parts = Array.from(this.structuresMap.values()).filter((structure) => structure.type !== 'conveyor' && !isDecor(structure.type))
    if (!parts.length) return 100
    const health = parts.reduce((sum, structure) => sum + hpOf(structure) / maxHpFor(structure.type), 0) / parts.length
    return Math.max(0, Math.round(health * 100 - this.monsters.length * 6))
  }

  /** Items per minute measured on the last full minute (Lente de Fluxo). */
  flowPerMinute(id: number): number | null {
    return this.flowWindow.get(id)?.rate ?? null
  }

  /** Engenheiro Chefe: golems whose batch will not fit the machine they feed through plain belts. */
  forecast(): Map<number, string> {
    if (this.forecastCache.at >= 0 && this.tickCount - this.forecastCache.at < 40) return this.forecastCache.warnings
    const warnings = new Map<number, string>()
    const lookup = (q: number, r: number) => this.structureAtCoords(q, r)
    for (const golem of this.structuresMap.values()) {
      if (golem.type !== 'golem' || !golem.sourceResource) continue
      let current: Structure = golem
      const seen = new Set<number>()
      for (let hops = 0; hops < 120; hops += 1) {
        const connection = connectionForLane(current, 0, lookup)
        if (!connection || seen.has(connection.target.id)) break
        seen.add(connection.target.id)
        const target = connection.target
        if (target.type === 'conveyor') { current = target; continue }
        if (isLotMachine(target.type)) {
          const batch = golem.batch ?? 1, lot = portLot(target, golem.sourceResource)
          if (batch % lot !== 0) {
            const message = `Alerta do Engenheiro Chefe: lote ${batch} ÷ ${lot} deixa resto ${batch % lot}.`
            warnings.set(target.id, message)
            warnings.set(golem.id, message)
          }
        }
        break
      }
    }
    this.forecastCache = { at: this.tickCount, warnings }
    return warnings
  }

  private resetFactory(inventory?: ResourceInventory): void {
    const initial = createInitialFactoryState(inventory)
    this.structuresMap = new Map()
    this.listCache=null
    this.idIndex.clear()
    this.occupancy.clear()
    this.inventoryState = initial.inventory
    this.depositRemaining = initial.deposits
    this.nextStructureId = initial.nextStructureId
    this.transferMotions = []
    this.migrationSearchCooldown.clear()
    this.deliveredState = {}
    this.monsters = []
    this.shipments = []
    this.nextMonsterId = 1
    this.eventQueue = []
    this.cueQueue = []
    this.shots.length = 0
    this.flowWindow.clear()
    this.forecastCache = { at: -1, warnings: new Map() }
  }

  private updateProduction(world: CellWorld): void {
    this.activeDeposits.clear()
    this.productionScratch.length = 0
    for (const structure of this.structuresMap.values()) this.productionScratch.push(structure)
    const strict = this.strict
    let workers = strict ? this.productionScratch.reduce((count, structure) => count + (structure.type === 'gnomepost' && structure.worker ? 1 : 0), 0) : 0
    for (const structure of this.productionScratch) {
      if (structure.type === 'golem') {
        if (strict && isBroken(structure)) continue
        this.updateGolem(world, structure)
        if (structure.migrationPath.length === 0 && !structure.errand) this.activeDeposits.add(hexKey(structure.q, structure.r))
      } else if (!strict) {
        if (structure.type === 'furnace') this.updateFurnace(structure)
      } else if (structure.type === 'furnace' || structure.type === 'chamber') updateFusionMachine(this, structure)
      else if (structure.type === 'smelter') updateSmelter(this, structure)
      else if (structure.type === 'tower') updateTower(this, structure)
      else if (structure.type === 'collector') updateCollector(this, structure)
      else if (structure.type === 'alchemy') updateAlchemy(this, structure)
      else if (structure.type === 'energizer') updateEnergizer(this, structure)
      else if (structure.type === 'grandaltar') updateGrandAltar(this, structure)
      else if (structure.type === 'gnomepost') {
        const hadWorker = structure.worker !== null && structure.worker !== undefined
        const active = updateGnomePost(this, structure, workers)
        if (active && !hadWorker) workers += 1
      } else if (structure.type === 'depot') updateDepot(this, structure)
      else if (structure.type === 'portal') updatePortal(this, structure)
      else if (structure.type === 'prism' || structure.type === 'silo') { /* handled by logistics */ }
    }
  }

  private updateGolem(world: CellWorld, structure: Structure): void {
    if (structure.migrationPath.length > 0 || structure.errand) {
      this.updateGolemMigration(world, structure)
      return
    }
    const key = hexKey(structure.q, structure.r)
    const cell = world.getCell(structure.q, structure.r)
    if (!cell.deposit || !structure.sourceResource) return
    const capacity = cell.deposit.quantity * cell.deposit.richness
    const remaining = this.depositRemaining[key] ?? capacity
    const thresholdAmount = capacity * structure.migrationThreshold / 100
    const shouldMigrate = remaining < 1 || (structure.migrationThreshold > 0 && remaining <= thresholdAmount)
    if (shouldMigrate && this.tryStartMigration(world, structure)) {
      this.updateGolemMigration(world, structure)
      return
    }
    if (this.strict) {
      const yieldAmount = Math.min(structure.batch ?? 1, Math.floor(remaining))
      const work = 60 + ORES[structure.sourceResource].extraction * 30
      if (yieldAmount < 1 || (structure.output?.amount ?? 0) + yieldAmount > MAX_GOLEM_BUFFER) return
      structure.progress += 1
      if (structure.progress < work) return
      structure.progress = 0
      if (!structure.output) structure.output = { resource: structure.sourceResource, amount: yieldAmount }
      else structure.output.amount += yieldAmount
      this.depositRemaining[key] = remaining - yieldAmount
      this.cueAtStructure('dig', structure)
      return
    }
    if (remaining < 1 || structure.output?.amount === MAX_STACK || structure.workTicks <= 0) return
    structure.progress += 1
    if (structure.progress < structure.workTicks) return
    structure.progress = 0
    if (!structure.output) structure.output = { resource: structure.sourceResource, amount: 1 }
    else structure.output.amount += 1
    this.depositRemaining[key] = remaining - 1
    this.cueAtStructure('dig', structure)
  }

  private tryStartMigration(world: CellWorld, structure: Structure): boolean {
    const cooldown = this.migrationSearchCooldown.get(structure.id) ?? 0
    if (cooldown > this.tickCount) return false
    const choice = this.chooseDeposit(world, structure)
    if (!choice) {
      this.migrationSearchCooldown.set(structure.id, this.tickCount + 20)
      return false
    }
    this.migrationSearchCooldown.delete(structure.id)
    structure.migrationProgress = 0
    structure.progress = 0
    const carried = structure.output?.amount ?? 0
    const point = this.strict && carried > 0 ? this.collectorFor(structure) : null
    const walk = point ? this.pathToCollector(structure, point) : null
    if (point && walk) {
      // Walk to the collection point first, set the load down there, and only then head for the chosen deposit.
      structure.migrationPath = walk
      structure.errand = { target: choice.target, wait: Math.min(COLLECTOR_MAX_WAIT, Math.max(COLLECTOR_MIN_WAIT, carried * COLLECTOR_TICKS_PER_UNIT)), total: 0 }
      structure.errand.total = structure.errand.wait
    } else structure.migrationPath = choice.path
    return true
  }

  /** The nearest working collection point in reach that still has room. */
  private collectorFor(golem: Structure): Structure | null {
    let best: Structure | null = null, nearest = Infinity
    for (const candidate of this.structuresMap.values()) {
      if (candidate.type !== 'collector' || isBroken(candidate) || inventoryTotal(candidate.inputs) >= COLLECTOR_CAPACITY) continue
      const reach = Math.max(Math.abs(candidate.q - golem.q), Math.abs(candidate.r - golem.r))
      if (reach <= COLLECTOR_RADIUS && reach < nearest) { nearest = reach; best = candidate }
    }
    return best
  }

  /** Steps from the golem to a free cell touching the collection point (empty when it already touches it), or null. */
  private pathToCollector(golem: Structure, point: Structure): Axial[] | null {
    if (hexDistance(golem, point) <= 1) return []
    const search = this.explore(golem, COLLECTOR_WALK_LIMIT)
    let goal: string | null = null
    for (const node of search.order) if (hexDistance(node, point) <= 1) { goal = hexKey(node.q, node.r); break }
    return goal ? this.pathFrom(search, goal) : null
  }

  /** Breadth-first walk over free cells (floors do not stop a golem), inside the map and within `limit` steps. */
  private explore(origin: Axial, limit: number): { order: Axial[]; parents: Map<string, string | null>; steps: Map<string, number> } {
    const originKey = hexKey(origin.q, origin.r)
    const order: Axial[] = [{ q: origin.q, r: origin.r }]
    const parents = new Map<string, string | null>([[originKey, null]])
    const steps = new Map<string, number>([[originKey, 0]])
    const bounds = this.bounds
    for (let index = 0; index < order.length; index += 1) {
      const current = order[index], here = steps.get(hexKey(current.q, current.r))!
      if (here >= limit) continue
      for (const direction of HEX_DIRECTIONS) {
        const next = { q: current.q + direction.q, r: current.r + direction.r }
        const nextKey = hexKey(next.q, next.r)
        if (parents.has(nextKey)) continue
        const occupant = this.occupancy.get(nextKey)
        if (occupant && occupant.type !== 'paving') continue
        if (!insideBounds(bounds, next.q, next.r)) continue
        parents.set(nextKey, hexKey(current.q, current.r))
        steps.set(nextKey, here + 1)
        order.push(next)
      }
    }
    return { order, parents, steps }
  }

  private pathFrom(search: { order: Axial[]; parents: Map<string, string | null> }, goal: string): Axial[] {
    const byKey = new Map(search.order.map((node) => [hexKey(node.q, node.r), node]))
    const path: Axial[] = []
    for (let cursor: string | null = goal; cursor !== null && search.parents.get(cursor) !== null; cursor = search.parents.get(cursor) ?? null) {
      const node = byKey.get(cursor)
      if (node) path.push(node)
    }
    return path.reverse()
  }

  private reservedTargets(except: Structure): Set<string> {
    const reserved = new Set<string>()
    for (const other of this.structuresMap.values()) {
      if (other.id === except.id || other.type !== 'golem') continue
      const target = other.errand?.target ?? other.migrationPath[other.migrationPath.length - 1]
      if (target) reserved.add(hexKey(target.q, target.r))
    }
    return reserved
  }

  /**
   * The next deposit of the same ore within sight. It is not simply the nearest: each candidate scores its units left
   * divided by (1 + 0.5 × steps), so a rich deposit a little farther beats a poor one next door, and a poor one
   * at the edge of sight never beats a good one beside the golem.
   */
  private chooseDeposit(world: CellWorld, structure: Structure): { target: Axial; path: Axial[] } | null {
    if (!structure.sourceResource) return null
    const reserved = this.reservedTargets(structure)
    const search = this.explore(structure, GOLEM_MIGRATION_RADIUS)
    let best: { key: string; target: Axial; score: number } | null = null
    for (const node of search.order) {
      const key = hexKey(node.q, node.r)
      const steps = search.steps.get(key) ?? 0
      if (steps === 0 || reserved.has(key)) continue
      const cell = world.getCell(node.q, node.r)
      if (cell.deposit?.ore !== structure.sourceResource) continue
      const remaining = this.getDepositRemaining(cell) ?? 0
      if (remaining < 1) continue
      const score = remaining / (1 + MIGRATION_DISTANCE_WEIGHT * steps)
      if (!best || score > best.score) best = { key, target: node, score }
    }
    return best ? { target: best.target, path: this.pathFrom(search, best.key) } : null
  }

  /** Golem standing at the collection point: set the load down, then walk to the deposit chosen earlier. */
  private updateErrand(world: CellWorld, structure: Structure): void {
    const errand = structure.errand!
    errand.wait -= 1
    if (errand.wait > 0) return
    if (this.strict) collectFrom(this, structure)
    structure.errand = undefined
    const search = this.explore(structure, MIGRATION_WALK_LIMIT)
    const goal = hexKey(errand.target.q, errand.target.r)
    if (search.parents.has(goal) && !this.occupancy.get(goal)) {
      structure.migrationPath = this.pathFrom(search, goal)
      structure.migrationProgress = 0
    } else {
      // The chosen deposit became unreachable: the golem stays where it is and picks again on the next change.
      structure.sourceResource = world.getCell(structure.q, structure.r).deposit?.ore ?? null
    }
  }

  private updateGolemMigration(world: CellWorld, structure: Structure): void {
    const next = structure.migrationPath[0]
    if (!next && structure.errand) { this.updateErrand(world, structure); return }
    if (!next) {
      structure.migrationPath = []
      structure.migrationProgress = 0
      return
    }
    structure.migrationProgress += 1
    if (structure.migrationProgress < GOLEM_MIGRATION_TICKS_PER_CELL) return
    this.structuresMap.delete(hexKey(structure.q, structure.r))
    this.vacate(structure)
    // The golem tramples the floor it walks over (the destination cell is a deposit, never paved).
    const trampled = this.structuresMap.get(hexKey(next.q, next.r))
    if (trampled?.type === 'paving') { this.idIndex.delete(trampled.id); this.listCache = null }
    structure.q = next.q
    structure.r = next.r
    structure.migrationPath.shift()
    structure.migrationProgress = 0
    this.structuresMap.set(hexKey(structure.q, structure.r), structure)
    this.occupy(structure)
    if (structure.migrationPath.length > 0 || structure.errand) return
    const cell = world.getCell(structure.q, structure.r)
    structure.sourceResource = cell.deposit?.ore ?? null
    structure.workTicks = cell.deposit ? 10 + ORES[cell.deposit.ore].extraction * 4 : 0
    structure.progress = 0
    if (cell.deposit && this.depositRemaining[cell.key] === undefined) {
      this.depositRemaining[cell.key] = cell.deposit.quantity * cell.deposit.richness
    }
  }

  private isMigrationReservedCell(cell: Axial): boolean {
    for (const structure of this.structuresMap.values()) {
      if (structure.type !== 'golem') continue
      if (structure.migrationPath.some((step) => step.q === cell.q && step.r === cell.r)) return true
      if (structure.errand && structure.errand.target.q === cell.q && structure.errand.target.r === cell.r) return true
    }
    return false
  }

  private chargedEnergizers(): { x: number; y: number; boost: number }[] {
    const boosters: { x: number; y: number; boost: number }[] = []
    if (!this.strict) return boosters
    for (const structure of this.structuresMap.values()) {
      const boost = structure.type === 'energizer' ? energizerMultiplier(structure) : 1
      if (boost > 1) boosters.push({ x: structure.q + 0.5, y: structure.r + 0.5, boost })
    }
    return boosters
  }

  /** How many times faster the deposit at this cell is recovering right now (1 without a charged Energizador in reach). */
  recoveryBoostAt(q: number, r: number): number {
    let boost = 1
    for (const booster of this.chargedEnergizers()) if (booster.boost > boost && Math.hypot(q - booster.x, r - booster.y) <= ENERGIZER_RADIUS) boost = booster.boost
    return boost
  }

  private recoverDeposits(world: CellWorld): void {
    const boosters = this.chargedEnergizers()
    for (const key in this.depositRemaining) {
      if (this.activeDeposits.has(key)) continue
      const [q, r] = key.split(',').map(Number)
      const cell = world.getCell(q, r)
      if (!cell.deposit) continue
      const capacity = cell.deposit.quantity * cell.deposit.richness
      const remaining = this.depositRemaining[key]
      if (remaining >= capacity) continue
      // Energisers do not stack: the strongest one in reach decides.
      let boost = 1
      for (const booster of boosters) if (booster.boost > boost && Math.hypot(q - booster.x, r - booster.y) <= ENERGIZER_RADIUS) boost = booster.boost
      const recovery = depositRecoveryPerSecond(cell.deposit.purity) * SIMULATION_STEP_MS / 1000 * boost
      this.depositRemaining[key] = Math.min(capacity, remaining + recovery)
    }
  }

  private updateFurnace(structure: Structure): void {
    if (!structure.recipe) {
      const recipe = LEGACY_RECIPE_LIST.find((candidate) => this.hasRecipeInputs(structure.inputs, candidate.inputs))
      if (!recipe) return
      for (const [resource, amount] of Object.entries(recipe.inputs)) {
        structure.inputs[resource as ResourceId] = (structure.inputs[resource as ResourceId] ?? 0) - (amount ?? 0)
      }
      structure.recipe = recipe.id
      structure.progress = 0
    }
    const recipe = RECIPES[structure.recipe]
    if (structure.progress < recipe.durationTicks) structure.progress += 1
    if (structure.progress < recipe.durationTicks) return
    if (structure.output && (structure.output.resource !== recipe.id || structure.output.amount >= MAX_STACK)) return
    if (structure.output) structure.output.amount += 1
    else structure.output = { resource: recipe.id, amount: 1 }
    structure.recipe = null
    structure.progress = 0
  }

  private hasRecipeInputs(inventory: ResourceInventory, inputs: ResourceInventory): boolean {
    return Object.entries(inputs).every(([resource, amount]) => (inventory[resource as ResourceId] ?? 0) >= (amount ?? 0))
  }

  /** Ticks between two moves of the same source. Level-1 belts take 8 ticks; levels 2 and 3 take 4 and 2. */
  private periodOf(source: Structure): number {
    if (source.type === 'conveyor') return STRICT_BELT_PERIODS[(source.tier ?? 1) - 1]
    if (source.type === 'golem' || isLotMachine(source.type)) return STRICT_BELT_PERIODS[0]
    return STRICT_BELT_PERIODS[1]
  }

  private transferResources(): void {
    const strict = this.strict
    this.prepareLogisticsOutputs()
    const plans: TransferPlan[] = []
    const reservations = new Map<string, ResourceInventory>()
    for (const source of this.structuresMap.values()) {
      if (source.type === 'gnome' || source.type === 'tower' || source.type === 'gnomepost') continue
      if (strict && (isBroken(source) || this.tickCount % this.periodOf(source) !== 0)) continue
      const laneCount = source.type === 'prism' ? source.prismOutputCount : source.type === 'bridge' ? 2 : 1
      for (let sourceLane = 0; sourceLane < laneCount; sourceLane += 1) {
        const output = sourceStack(source, sourceLane)
        if (!output) continue
        const connection = connectionForLane(source, sourceLane, (q, r) => this.structureAtCoords(q, r))
        if (!connection) continue
        const { target, targetLane, path } = connection
        const reservationKey = `${hexKey(target.q, target.r)}:${targetLane}`
        const reserved = reservations.get(reservationKey) ?? {}
        if (!this.canAccept(target, targetLane, output.resource, reserved, output.scale ?? 1)) continue
        reserved[output.resource] = (reserved[output.resource] ?? 0) + 1
        reservations.set(reservationKey, reserved)
        plans.push({ source, target, resource: output.resource, scale: output.scale ?? 1, sourceLane, targetLane, path })
      }
    }
    const startedAt = performance.now()
    for (const plan of plans) {
      const { source, target, resource, scale, sourceLane, targetLane } = plan
      const output = sourceStack(source, sourceLane)
      if (!output || output.resource !== resource) continue
      const durationMs = (strict ? this.periodOf(source) : LOGISTICS_INTERVAL_TICKS) * SIMULATION_STEP_MS / this.settings.speed
      output.amount -= 1
      if (output.amount <= 0) {
        if (source.type === 'prism' || source.type === 'bridge') source.laneOutputs[sourceLane] = null
        else source.output = null
      }
      if (strict) {
        const window = this.flowWindow.get(source.id) ?? { count: 0, rate: 0, since: this.tickCount }
        window.count += 1
        this.flowWindow.set(source.id, window)
      }
      if (target.type === 'gnome') {
        this.addInventory(resource, scale)
        this.cueAtStructure('deliver', target)
        if (strict) this.deliveredState[resource] = (this.deliveredState[resource] ?? 0) + scale
      } else if (strict && (isLotMachine(target.type) || target.type === 'portal')) {
        registerArrival(target, resource, this.tickCount)
      } else if (target.type === 'furnace' || target.type === 'prism' || target.type === 'silo' || target.type === 'depot' || target.type === 'energizer' || target.type === 'alchemy') {
        // The Prisma Divisor (and the Mesa) undo a ×10 pack into ten plain units: nothing is lost, 1 × 10 = 10 × 1.
        target.inputs[resource] = (target.inputs[resource] ?? 0) + (target.type === 'prism' || target.type === 'alchemy' ? scale : 1)
      } else if (target.type === 'conveyor') target.output = { resource, amount: 1, ...(scale > 1 ? { scale } : {}) }
      else if (target.type === 'confluence') {
        if (target.output) target.output.amount += 1
        else target.output = { resource, amount: 1 }
      } else if (target.type === 'bridge') target.laneOutputs[targetLane] = { resource, amount: 1, ...(scale > 1 ? { scale } : {}) }
      this.transferMotions.push({
        path: plan.path,
        resource,
        from: { q: source.q, r: source.r },
        to: { q: target.q, r: target.r },
        startedAt,
        durationMs,
        sourceLane,
        targetLane,
      })
    }
  }

  private prepareLogisticsOutputs(): void {
    for (const structure of this.structuresMap.values()) {
      if (this.strict && isBroken(structure)) continue
      if (structure.type === 'prism') this.preparePrismOutputs(structure)
      else if (structure.type === 'silo') this.prepareSiloOutput(structure)
    }
  }

  private preparePrismOutputs(structure: Structure): void {
    const count = structure.prismOutputCount
    const ratio = count === 2 && structure.ratio ? structure.ratio : null
    const unit = ratio ? ratio[0] + ratio[1] : count
    for (const [resource, amount] of Object.entries(structure.inputs)) {
      if (!amount || amount < unit) continue
      const releasable = amount - amount % unit
      const share = releasable / unit
      const shares = ratio ? [share * ratio[0], share * ratio[1]] : Array.from({ length: count }, () => share)
      const compatible = shares.every((laneShare, lane) => {
        const output = structure.laneOutputs[lane] ?? null
        return !output || (output.resource === resource && output.amount + laneShare <= MAX_LOGISTICS_BUFFER)
      })
      if (!compatible) continue
      structure.inputs[resource as ResourceId] = amount - releasable
      if (structure.inputs[resource as ResourceId] === 0) delete structure.inputs[resource as ResourceId]
      for (let lane = 0; lane < count; lane += 1) {
        const output = structure.laneOutputs[lane]
        if (output) output.amount += shares[lane]
        else structure.laneOutputs[lane] = { resource: resource as ResourceId, amount: shares[lane] }
      }
    }
  }

  private prepareSiloOutput(structure: Structure): void {
    if (structure.output) return
    for (const [resource, amount] of Object.entries(structure.inputs)) {
      if (!amount || amount < structure.siloReleaseMultiple) continue
      const releasable = amount - amount % structure.siloReleaseMultiple
      structure.inputs[resource as ResourceId] = amount - releasable
      if (structure.inputs[resource as ResourceId] === 0) delete structure.inputs[resource as ResourceId]
      structure.output = { resource: resource as ResourceId, amount: releasable }
      return
    }
  }

  private canAccept(target: Structure, targetLane: number, resource: ResourceId, reserved: ResourceInventory, scale = 1): boolean {
    const reservedTotal = inventoryTotal(reserved)
    if (target.type === 'collector' || isDecor(target.type)) return false
    if (target.type === 'energizer') {
      return scale === 1 && !isBroken(target) && resource === 'resonant-brass' && (target.inputs[resource] ?? 0) + reservedTotal < ENERGIZER_BRASS_CAPACITY
    }
    if (target.type === 'alchemy') {
      if (isBroken(target)) return false
      // A Núcleo carrying a Runa Multiplicadora (×10) is a pack of ten: the table unpacks it into its own stock.
      if (resource === 'dragon-core') return (target.inputs[resource] ?? 0) + reservedTotal + scale <= ALCHEMY_CORE_CAPACITY
      if (scale !== 1 || !isOre(resource)) return false
      const held = (Object.keys(target.inputs) as ResourceId[]).find((key) => isOre(key) && (target.inputs[key] ?? 0) > 0)
      return (!held || held === resource) && (target.inputs[resource] ?? 0) + reservedTotal < ALCHEMY_SEED_CAPACITY
    }
    if (this.strict) {
      if (isBroken(target) && target.type !== 'gnome') return false
      if (target.type === 'tower' || target.type === 'gnomepost') return false
      if (scale > 1 && target.type !== 'conveyor' && target.type !== 'bridge' && target.type !== 'gnome' && target.type !== 'prism') return false
      if (isLotMachine(target.type)) return acceptsResource(target, resource, reserved[resource] ?? 0)
      if (target.type === 'portal') return (target.inputs[resource] ?? 0) + (target.bursts?.[resource]?.count ?? 0) + reservedTotal < 200
      if (target.type === 'depot') return inventoryTotal(target.inputs) + reservedTotal < 220
    }
    if (target.type === 'gnome') return true
    if (target.type === 'golem') return false
    if (target.type === 'conveyor') return !target.output && reservedTotal === 0
    if (target.type === 'prism') return inventoryTotal(target.inputs) + reservedTotal + scale <= MAX_PRISM_BUFFER
    if (target.type === 'silo') return inventoryTotal(target.inputs) + reservedTotal < MAX_LOGISTICS_BUFFER
    if (target.type === 'confluence') {
      return (!target.output || target.output.resource === resource) && (target.output?.amount ?? 0) + reservedTotal < MAX_CONFLUENCE_BUFFER
    }
    if (target.type === 'bridge') return !target.laneOutputs[targetLane] && reservedTotal === 0
    if (!recipeForResource(resource)) return false
    return (target.inputs[resource] ?? 0) + (reserved[resource] ?? 0) < MAX_FURNACE_INPUT_PER_RESOURCE
  }

  addInventory(resource: ResourceId, amount: number): void {
    const next = Math.max(0, (this.inventoryState[resource] ?? 0) + amount)
    if (next === 0) delete this.inventoryState[resource]
    else this.inventoryState[resource] = next
  }

  /** Test helper for the rule layer: settle every pending burst immediately. */
  settleBursts(): void {
    for (const structure of this.structuresMap.values()) if (isLotMachine(structure.type)) evaluateBursts(this, structure)
  }
}
