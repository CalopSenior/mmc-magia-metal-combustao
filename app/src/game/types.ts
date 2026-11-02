import type { CHANNEL_COLORS } from './content/channels'

export interface Axial {
  readonly q: number
  readonly r: number
}

export type BiomeId = 'copper-vale' | 'iron-gorge' | 'obsidian-crater' | 'ether-citadel'

export type Terrain =
  | 'ash'
  | 'basalt'
  | 'magma'
  | 'acid'
  | 'ruin'
  | 'crystal'
  | 'slag'
  | 'ironstone'
  | 'obsidian'
  | 'ether'

export type OreId =
  | 'rusted-copper'
  | 'fossil-coal'
  | 'bloody-iron'
  | 'whispering-quartz'
  | 'raw-scales'
  | 'abyssal-cobalt'
  | 'draconic-obsidian'
  | 'solar-gold'
  | 'lunar-silver'
  | 'gray-mercury'
  | 'raw-ether-crystal'

export type LegacyAlloyId = 'draconic-steel' | 'electrum' | 'ether-brass'
export type Tier1AlloyId =
  | 'runic-bronze' | 'gray-steel' | 'resonant-brass' | 'scaled-iron' | 'azure-amalgam'
  | 'volcanic-glass' | 'astral-electrum' | 'dark-chrome' | 'draconic-gold'
export type Tier2AlloyId =
  | 'ether-steel' | 'fossil-mithril' | 'imperial-orichalcum' | 'dorsal-adamantine' | 'stellar-silver' | 'dragon-core'
export type AlloyId = LegacyAlloyId | Tier1AlloyId | Tier2AlloyId
export type ResourceId = OreId | AlloyId
export type ResourceInventory = Partial<Record<ResourceId, number>>
export type LegacyStructureType = 'golem' | 'conveyor' | 'furnace' | 'gnome' | 'prism' | 'confluence' | 'silo' | 'bridge'
export type StructureType =
  | LegacyStructureType
  | 'smelter' | 'chamber' | 'tower' | 'gnomepost' | 'depot' | 'portal'
  /** Obras-Primas and conveniences added after the contract rules. */
  | 'collector' | 'alchemy' | 'energizer' | 'grandaltar'
  /** Purely decorative pieces. */
  | 'paving' | 'lantern'
export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5
export type PrismOutputCount = 2 | 3 | 4 | 5

export interface ResourceStack {
  resource: ResourceId
  amount: number
  /** Value of each unit: a Caixa Rúnica Condensada carries 10, 100 or 1000 (GDD 10). Absent means 1. */
  scale?: number
}

export interface BurstTracker { count: number; last: number }
export interface WorkerState { target: number; progress: number }

export interface Structure extends Axial {
  /** Missing in legacy layouts: retain their compact 1×1 footprint. */
  size?: 1 | 2 | 3 | 5
  q: number
  r: number
  id: number
  type: StructureType
  direction: HexDirection
  inputs: ResourceInventory
  output: ResourceStack | null
  recipe: AlloyId | null
  progress: number
  createdTick: number
  workTicks: number
  sourceResource: OreId | null
  migrationPath: Axial[]
  migrationProgress: number
  migrationThreshold: number
  laneOutputs: (ResourceStack | null)[]
  prismOutputCount: PrismOutputCount
  siloReleaseMultiple: number
  /** Everything below was introduced by the contract rules (save v7) and is optional so legacy layouts keep loading. */
  hp?: number
  batch?: number
  lot?: number
  tier?: 1 | 2 | 3
  rune?: 0 | 1 | 2 | 3
  twin?: boolean
  alchemist?: boolean
  target?: AlloyId | null
  power?: number
  /** Legacy channel 1–9, converted into channelColors when loaded. */
  channel?: number
  channelColors?: ChannelSequence
  crateSize?: 10 | 50 | 100
  ratio?: [number, number]
  crystals?: ResourceInventory
  bursts?: Record<string, BurstTracker>
  flawed?: boolean
  hungerAt?: number
  crystalAt?: number
  absorbed?: number[]
  worker?: WorkerState | null
  cooldown?: number
  /** Altar de Fusão Maior: fusions in progress and finished alloys waiting for the output slot. */
  jobs?: FusionJob[]
  products?: ResourceInventory
  /** Energizador Aditivo: ticks of boost left and the dose that is feeding it. */
  charge?: number
  dose?: number
  /** A golem on its way to a Ponto de Coleta: where it goes next, and the ticks left (of `total`) to empty its sack. */
  errand?: { target: Axial; wait: number; total: number }
}

export interface FusionJob { recipe: AlloyId; progress: number }

export type MonsterKind = 'slag' | 'corrupted'
export interface Monster {
  id: number
  kind: MonsterKind
  /** Position in grid units (fractional while walking). */
  x: number
  y: number
  /** The remainder that created it (slag) or the lcm that armours it (corrupted). */
  number: number
  hp: number
  maxHp: number
  fast: boolean
  cooldown: number
}

export interface Shipment {
  from: number
  to: number
  resource: ResourceId
  amount: number
  departedAt: number
  arriveAt: number
  /** Cargo was accepted; this same golem is unloading or walking home empty. */
  deliveredAt?: number
}

export interface RunStats {
  perfectCycles: number
  hungerEvents: number
  clogEvents: number
  absorbedEvents: number
  damageTaken: number
  monstersSlain: number
  machinesBuilt: number
  peakMachines: number
  pureEther: number
  fusions: number
  repairs: number
}

export interface FactoryState {
  structures: Structure[]
  inventory: ResourceInventory
  deposits: Record<string, number>
  nextStructureId: number
  delivered?: ResourceInventory
  monsters?: Monster[]
  shipments?: Shipment[]
  nextMonsterId?: number
}

export interface TransferMotion {
  readonly path?: readonly { x: number; y: number }[]
  readonly resource: ResourceId
  readonly from: Axial
  readonly to: Axial
  readonly startedAt: number
  readonly durationMs: number
  readonly sourceLane: number
  readonly targetLane: number
}

export interface OreDeposit {
  readonly ore: OreId
  readonly purity: number
  readonly richness: 1 | 2 | 3
  readonly quantity: number
}

export interface HexCell extends Axial {
  readonly key: string
  readonly biome: BiomeId
  readonly terrain: Terrain
  readonly elevation: number
  readonly relief: number
  readonly deposit: OreDeposit | null
  readonly variant: number
}

export interface WorldChunk {
  readonly key: string
  readonly q: number
  readonly r: number
  readonly cells: readonly HexCell[]
}

export type SimulationSpeed = 1 | 2 | 4
export type ChunkDistance = 1 | 2 | 3 | 4
export type OreLayout = 'legacy' | 'veins'

export interface GameSettings {
  readonly speed: SimulationSpeed
  readonly showCoordinates: boolean
  readonly chunkDistance: ChunkDistance
}

export interface CameraSnapshot {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

export type DifficultyId = 'apprentice' | 'artisan' | 'engineer' | 'master'
export type RunMode = 'free' | 'campaign' | 'endless'
export type RunStatus = 'active' | 'complete' | 'failed'
export type MathTopic = 'times-table' | 'multiples' | 'remainder' | 'lcm' | 'gcd' | 'primes' | 'factorization' | 'fractions' | 'powers10'

export interface ContractRecord { completed: boolean; bestTicks: number; bestEther: number; sealed: boolean; attempts: number }
export interface EndlessRecord { machines: number; ticks: number; completedAt: string }
export interface TopicScore { correct: number; total: number }

export interface Profile {
  name: string
  difficulty: DifficultyId
  ether: number
  seals: number
  tech: string[]
  campaign: Record<string, ContractRecord>
  endless: Record<string, EndlessRecord>
  discovered: string[]
  math: Partial<Record<MathTopic, TopicScore>>
  lessonsRead: string[]
  playTicks: number
  createdAt: string
}

export interface ContractGoal {
  /** A delivered resource, or the special "perfect cycle" counter. */
  resource: ResourceId | 'perfect-cycles'
  amount: number
}

export interface DepositRequest { ore: OreId; count: number; richness?: 1 | 2 | 3 }

export interface EndlessSpec {
  key: string
  daily: boolean
  seed: string
  biome: BiomeId
  radius: number
  goals: ContractGoal[]
  deposits: DepositRequest[]
}

export interface RunReport {
  ticks: number
  etherReward: number
  sealed: boolean
  newBest: boolean
  /** Bit masks of the Prova da Guilda questions already answered / answered right, so a reload cannot farm Éter. */
  quizAnswered?: number
  quizCorrect?: number
}

export interface RunState {
  mode: RunMode
  contractId: string | null
  status: RunStatus
  endless: EndlessSpec | null
  stats: RunStats
  report: RunReport | null
}

export interface SaveSnapshot {
  readonly oreLayout?:OreLayout
  readonly schemaVersion: 7
  readonly id: string
  readonly savedAt: string
  readonly seed: string
  readonly tick: number
  readonly selected: Axial | null
  readonly camera: CameraSnapshot
  readonly settings: GameSettings
  readonly factory: FactoryState
  readonly profile: Profile
  readonly run: RunState
}

export interface V6SaveSnapshot extends Omit<SaveSnapshot, 'schemaVersion' | 'profile' | 'run'> {
  readonly schemaVersion: 6
}

export interface V5SaveSnapshot extends Omit<V6SaveSnapshot, 'schemaVersion'> {
  readonly schemaVersion: 5
}

export type V4Structure = Pick<Structure, 'q' | 'r' | 'id' | 'direction' | 'inputs' | 'output' | 'recipe' | 'progress' | 'createdTick' | 'workTicks' | 'sourceResource' | 'migrationPath' | 'migrationProgress' | 'migrationThreshold'> & { type: LegacyStructureType }
export interface V4FactoryState {
  structures: V4Structure[]
  inventory: ResourceInventory
  deposits: Record<string, number>
  nextStructureId: number
}

export interface V4SaveSnapshot {
  readonly schemaVersion: 4
  readonly id: string
  readonly savedAt: string
  readonly seed: string
  readonly tick: number
  readonly selected: Axial | null
  readonly camera: CameraSnapshot
  readonly settings: GameSettings
  readonly factory: V4FactoryState
}

export type V3Structure = Omit<V4Structure, 'migrationPath' | 'migrationProgress' | 'migrationThreshold'>
export interface V3FactoryState {
  structures: V3Structure[]
  inventory: ResourceInventory
  deposits: Record<string, number>
  nextStructureId: number
}

export interface V3SaveSnapshot {
  readonly schemaVersion: 3
  readonly id: string
  readonly savedAt: string
  readonly seed: string
  readonly tick: number
  readonly selected: Axial | null
  readonly camera: CameraSnapshot
  readonly settings: GameSettings
  readonly factory: V3FactoryState
}

export interface V2SaveSnapshot {
  readonly schemaVersion: 2
  readonly id: string
  readonly savedAt: string
  readonly seed: string
  readonly tick: number
  readonly selected: Axial | null
  readonly camera: CameraSnapshot
  readonly settings: GameSettings
}

export interface LegacySaveSnapshot {
  readonly schemaVersion: 1
  readonly id: string
  readonly savedAt: string
  readonly seed: string
  readonly tick: number
  readonly selected: Axial | null
  readonly camera: CameraSnapshot
  readonly settings: Omit<GameSettings, 'chunkDistance'>
}

export type SaveStatus = 'loading' | 'dirty' | 'saving' | 'saved' | 'error'

export type ChannelColorId = (typeof CHANNEL_COLORS)[number]['id']
export type ChannelSequence = readonly [ChannelColorId,ChannelColorId,ChannelColorId]

export type CreatureId = 'golem' | 'gnome' | 'carrier'
export type CodexCategory = 'biomes' | 'ores' | 'alloys' | 'terrains' | 'machines' | 'creatures' | 'lessons'

export type CodexTarget =
  | { readonly category: 'biomes'; readonly id: BiomeId }
  | { readonly category: 'ores'; readonly id: OreId }
  | { readonly category: 'alloys'; readonly id: AlloyId }
  | { readonly category: 'terrains'; readonly id: Terrain }
  | { readonly category: 'machines'; readonly id: StructureType }
  | { readonly category: 'creatures'; readonly id: CreatureId }
  | { readonly category: 'lessons'; readonly id: string }

/** What the HUD needs to know about the running contract. */
export interface ContractProgress {
  readonly title: string
  readonly goals: readonly { resource: ContractGoal['resource']; amount: number; done: number }[]
  readonly stability: number
  readonly status: RunStatus
}

export interface EngineSnapshot {
  readonly renderLOD: 'matrix' | 'radar'
  readonly ready: boolean
  readonly tick: number
  readonly paused: boolean
  readonly speed: SimulationSpeed
  readonly showCoordinates: boolean
  readonly selected: Axial | null
  readonly selectedCell: HexCell | null
  readonly focusedCell: HexCell | null
  readonly selectedStructure: Structure | null
  readonly focusedStructure: Structure | null
  readonly focusedDepositRemaining: number | null
  readonly structureCount: number
  readonly inventory: ResourceInventory
  readonly centerCell: HexCell
  readonly camera: CameraSnapshot
  readonly seed: string
  readonly chunkDistance: ChunkDistance
  readonly loadedChunks: number
  readonly cellCount: number
  readonly fps: number
  readonly dpr: number
  readonly profile: Profile
  readonly run: RunState
  readonly progress: ContractProgress | null
  readonly mathVision: boolean
  readonly monsterCount: number
  readonly unlocked: readonly StructureType[]
  readonly slot: string
}

export interface EngineCallbacks {
  onBuildSelection?: (selection: {type:StructureType;direction:HexDirection;tier:1|2|3}) => void
  onSnapshot: (snapshot: EngineSnapshot) => void
  onSaveStatus: (status: SaveStatus) => void
  onError: (message: string) => void
  onNotice: (message: string) => void
  onOpenGuide: (target: CodexTarget) => void
  /** Teaching moment raised by the rules (remainder explained, fusion discovered...). */
  onLesson?: (message: string) => void
}
