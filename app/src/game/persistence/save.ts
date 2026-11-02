import { z } from 'zod'
import { DEFAULT_CHUNK_DISTANCE, LEGACY_SAVE_ID } from '../config'
import { STARTING_INVENTORY, STRUCTURES } from '../content/structures'
import { connectionForLane, footprintCells, outputDirections } from '../core/structureGeometry'
import { hexKey } from '../math/hex'
import { createProfile, createRun } from '../stats'
import { CHANNEL_COLORS, normalizeStructureChannel } from '../content/channels'
import type { LegacySaveSnapshot, SaveSnapshot, V2SaveSnapshot, V3SaveSnapshot, V4SaveSnapshot, V5SaveSnapshot, V6SaveSnapshot } from '../types'

const axialSchema = z.object({
  q: z.number().int().min(-1000000).max(1000000),
  r: z.number().int().min(-1000000).max(1000000),
})

const cameraSchema = z.object({
  x: z.number().finite().min(-100000).max(100000),
  y: z.number().finite().min(-100000).max(100000),
  zoom: z.number().finite().min(0.08).max(2.4),
})

const oreSchema = z.enum([
  'rusted-copper',
  'fossil-coal',
  'bloody-iron',
  'whispering-quartz',
  'raw-scales',
  'abyssal-cobalt',
  'draconic-obsidian',
  'solar-gold',
  'lunar-silver',
  'gray-mercury',
  'raw-ether-crystal',
])
const legacyAlloySchema = z.enum(['draconic-steel', 'electrum', 'ether-brass'])
const alloySchema = z.enum([
  'draconic-steel', 'electrum', 'ether-brass',
  'runic-bronze', 'gray-steel', 'resonant-brass', 'scaled-iron', 'azure-amalgam', 'volcanic-glass', 'astral-electrum', 'dark-chrome', 'draconic-gold',
  'ether-steel', 'fossil-mithril', 'imperial-orichalcum', 'dorsal-adamantine', 'stellar-silver', 'dragon-core',
])
const legacyResourceSchema = z.union([oreSchema, legacyAlloySchema])
const resourceSchema = z.union([oreSchema, alloySchema])
const legacyInventorySchema = z.partialRecord(legacyResourceSchema, z.number().int().nonnegative().max(1000000000))
const inventorySchema = z.partialRecord(resourceSchema, z.number().int().nonnegative().max(1000000000))
const legacyStructureTypeSchema = z.enum(['golem', 'conveyor', 'furnace', 'gnome'])
const v5StructureTypeSchema = z.enum(['golem', 'conveyor', 'furnace', 'gnome', 'prism', 'confluence', 'silo', 'bridge'])
const structureTypeSchema = z.enum([
  'golem', 'conveyor', 'furnace', 'gnome', 'prism', 'confluence', 'silo', 'bridge',
  'smelter', 'chamber', 'tower', 'gnomepost', 'depot', 'portal',
  'collector', 'alchemy', 'energizer', 'grandaltar', 'paving', 'lantern',
])
const legacyStackSchema = z.object({
  resource: legacyResourceSchema,
  amount: z.number().int().positive().max(8),
})
const v5StackSchema = z.object({
  resource: legacyResourceSchema,
  amount: z.number().int().positive().max(120),
})
const stackSchema = z.object({
  resource: resourceSchema,
  amount: z.number().int().positive().max(1000),
  scale: z.number().int().min(10).max(1000).optional(),
})

const directionSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])

const structureSchemaV3 = axialSchema.extend({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  type: legacyStructureTypeSchema,
  direction: directionSchema,
  inputs: legacyInventorySchema,
  output: legacyStackSchema.nullable(),
  recipe: legacyAlloySchema.nullable(),
  progress: z.number().int().nonnegative().max(1000000),
  createdTick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  workTicks: z.number().int().nonnegative().max(1000000),
  sourceResource: oreSchema.nullable(),
}).strict()

const structureSchemaV4 = structureSchemaV3.extend({
  migrationPath: z.array(axialSchema).max(64),
  migrationProgress: z.number().int().nonnegative().max(1000000),
  migrationThreshold: z.number().int().min(0).max(90).multipleOf(5),
}).strict()

const structureSchemaV5 = structureSchemaV4.extend({
  type: v5StructureTypeSchema,
  output: v5StackSchema.nullable(),
  laneOutputs: z.array(v5StackSchema.nullable()).max(5),
  prismOutputCount: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  siloReleaseMultiple: z.number().int().min(2).max(12),
}).strict()

const structureSchemaV6 = structureSchemaV5.extend({
  size: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
}).strict()

const burstSchema = z.object({ count: z.number().int().nonnegative().max(100000), last: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) })
const channelColorSchema=z.enum(CHANNEL_COLORS.map(color=>color.id))

const structureSchema = structureSchemaV6.extend({
  size: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(5)]).optional(),
  type: structureTypeSchema,
  inputs: inventorySchema,
  output: stackSchema.nullable(),
  recipe: alloySchema.nullable(),
  laneOutputs: z.array(stackSchema.nullable()).max(5),
  siloReleaseMultiple: z.number().int().min(2).max(13),
  progress: z.number().int().nonnegative().max(10000000),
  hp: z.number().finite().min(0).max(1000).optional(),
  batch: z.number().int().min(1).max(9).optional(),
  lot: z.number().int().min(2).max(9).optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  rune: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  twin: z.boolean().optional(),
  alchemist: z.boolean().optional(),
  target: alloySchema.nullable().optional(),
  power: z.number().int().min(1).max(12).optional(),
  channel: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
  channelColors: z.tuple([channelColorSchema,channelColorSchema,channelColorSchema]).optional(),
  crateSize: z.union([z.literal(10), z.literal(50), z.literal(100)]).optional(),
  ratio: z.tuple([z.number().int().min(1).max(5), z.number().int().min(1).max(5)]).optional(),
  crystals: inventorySchema.optional(),
  bursts: z.record(z.string().max(40), burstSchema).optional(),
  flawed: z.boolean().optional(),
  hungerAt: z.number().int().optional(),
  crystalAt: z.number().int().optional(),
  absorbed: z.array(z.number().int()).max(8).optional(),
  worker: z.object({ target: z.number().int(), progress: z.number().finite().min(0).max(4) }).nullable().optional(),
  cooldown: z.number().int().min(0).max(10000).optional(),
  jobs: z.array(z.object({ recipe: alloySchema, progress: z.number().int().min(0).max(1000000) })).max(3).optional(),
  products: inventorySchema.optional(),
  charge: z.number().int().min(0).max(100000).optional(),
  dose: z.number().int().min(0).max(5).optional(),
  errand: z.object({ target: axialSchema, wait: z.number().int().min(0).max(1000), total: z.number().int().min(0).max(1000) }).optional(),
}).strict().superRefine((structure,context)=>{
  if(!structure.channelColors&&(structure.channel??1)>9)context.addIssue({code:'custom',message:'Canais novos precisam da sequência de três cores.',path:['channelColors']})
})

const depositsV3 = z.record(z.string().regex(/^-?\d+,-?\d+$/), z.number().int().nonnegative().max(1000000000))
const depositsV4 = z.record(z.string().regex(/^-?\d+,-?\d+$/), z.number().finite().nonnegative().max(1000000000))

const factorySchemaV3 = z.object({
  structures: z.array(structureSchemaV3).max(256),
  inventory: legacyInventorySchema,
  deposits: depositsV3,
  nextStructureId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
}).strict()

const factorySchemaV4 = factorySchemaV3.extend({
  structures: z.array(structureSchemaV4).max(256),
  deposits: depositsV4,
}).strict()

const factorySchemaV5 = factorySchemaV4.extend({
  structures: z.array(structureSchemaV5).max(256),
}).strict()

const factorySchemaV6 = factorySchemaV4.extend({
  structures: z.array(structureSchemaV6).max(256),
}).strict()

const monsterSchema = z.object({
  id: z.number().int().positive(),
  kind: z.enum(['slag', 'corrupted']),
  x: z.number().finite().min(-100000).max(100000),
  y: z.number().finite().min(-100000).max(100000),
  number: z.number().int().min(1).max(100000),
  hp: z.number().finite().min(0).max(100000),
  maxHp: z.number().finite().min(1).max(100000),
  fast: z.boolean(),
  cooldown: z.number().int().min(0).max(1000),
})

const shipmentSchema = z.object({
  from: z.number().int(),
  to: z.number().int(),
  resource: resourceSchema,
  amount: z.number().int().positive().max(1000),
  departedAt: z.number().int().nonnegative(),
  arriveAt: z.number().int().nonnegative(),
  deliveredAt: z.number().int().nonnegative().optional(),
})

function checkOverlaps(factory: { structures: { id: number; type: string; q: number; r: number; size?: 1 | 2 | 3 | 5 }[] }, context: z.RefinementCtx): void {
  const occupied = new Set<string>(), ids = new Set<number>()
  for (const [index, structure] of factory.structures.entries()) {
    const size = structure.size ?? 1
    if (size !== 1 && size !== STRUCTURES[structure.type as keyof typeof STRUCTURES].size) context.addIssue({ code: 'custom', message: 'Dimensão inválida para esta estrutura.', path: ['structures', index, 'size'] })
    if (ids.has(structure.id)) context.addIssue({ code: 'custom', message: 'ID de estrutura repetido.', path: ['structures', index, 'id'] })
    ids.add(structure.id)
    for (const cell of footprintCells(structure, size)) {
      const key = hexKey(cell.q, cell.r)
      if (occupied.has(key)) context.addIssue({ code: 'custom', message: 'Estruturas sobrepostas.', path: ['structures', index] })
      occupied.add(key)
    }
  }
}

const factorySchemaBase = factorySchemaV4.extend({
  // 256 machines plus the floors and lanterns, which are counted apart.
  structures: z.array(structureSchema).max(256 + 512),
  inventory: inventorySchema,
  delivered: inventorySchema.optional(),
  monsters: z.array(monsterSchema).max(24).optional(),
  shipments: z.array(shipmentSchema).max(64).optional(),
  nextMonsterId: z.number().int().positive().optional(),
}).strict()

const factorySchema = factorySchemaBase.superRefine(checkOverlaps)
const factorySchemaV6Checked = factorySchemaV6.superRefine(checkOverlaps)

const settingsSchema = z.object({
  speed: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  showCoordinates: z.boolean(),
  chunkDistance: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
})

const difficultySchema = z.enum(['apprentice', 'artisan', 'engineer', 'master'])
const topicSchema = z.enum(['times-table', 'multiples', 'remainder', 'lcm', 'gcd', 'primes', 'factorization', 'fractions', 'powers10'])

const profileSchema = z.object({
  name: z.string().trim().min(1).max(24),
  difficulty: difficultySchema,
  ether: z.number().finite().min(0).max(1e9),
  seals: z.number().int().min(0).max(99999),
  tech: z.array(z.string().max(40)).max(40),
  campaign: z.record(z.string().max(40), z.object({
    completed: z.boolean(),
    bestTicks: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    bestEther: z.number().min(0).max(1e9),
    sealed: z.boolean(),
    attempts: z.number().int().min(0).max(100000),
  })),
  endless: z.record(z.string().max(100), z.object({
    machines: z.number().int().min(0).max(100000),
    ticks: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    completedAt: z.string().max(40),
  })),
  discovered: z.array(z.string().max(60)).max(200),
  math: z.partialRecord(topicSchema, z.object({ correct: z.number().int().min(0).max(1e6), total: z.number().int().min(0).max(1e6) })),
  lessonsRead: z.array(z.string().max(40)).max(40),
  playTicks: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  createdAt: z.string().max(40),
})

const statsSchema = z.object({
  perfectCycles: z.number().int().min(0), hungerEvents: z.number().int().min(0), clogEvents: z.number().int().min(0),
  absorbedEvents: z.number().int().min(0), damageTaken: z.number().min(0), monstersSlain: z.number().int().min(0),
  machinesBuilt: z.number().int().min(0), peakMachines: z.number().int().min(0), pureEther: z.number().min(0),
  fusions: z.number().int().min(0), repairs: z.number().int().min(0),
})

const goalSchema = z.object({ resource: z.union([resourceSchema, z.literal('perfect-cycles')]), amount: z.number().int().min(1).max(1e9) })
const biomeSchema = z.enum(['copper-vale', 'iron-gorge', 'obsidian-crater', 'ether-citadel'])

const runSchema = z.object({
  mode: z.enum(['free', 'campaign', 'endless']),
  contractId: z.string().max(40).nullable(),
  status: z.enum(['active', 'complete', 'failed']),
  endless: z.object({
    key: z.string().max(100), daily: z.boolean(), seed: z.string().max(80), biome: biomeSchema,
    radius: z.number().int().min(6).max(40), goals: z.array(goalSchema).max(6),
    deposits: z.array(z.object({ ore: oreSchema, count: z.number().int().min(1).max(8), richness: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional() })).max(16),
  }).nullable(),
  stats: statsSchema,
  report: z.object({ ticks: z.number().int().min(0), etherReward: z.number().min(0), sealed: z.boolean(), newBest: z.boolean(), quizAnswered: z.number().int().min(0).max(255).optional(), quizCorrect: z.number().int().min(0).max(255).optional() }).nullable(),
})

const slotIdSchema = z.string().regex(/^(slot-[1-9]|architecture-sandbox)$/)

const baseSaveSchema = z.object({
  id: slotIdSchema,
  savedAt: z.string().datetime(),
  seed: z.string().trim().min(1).max(80),
  tick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  selected: axialSchema.nullable(),
  camera: cameraSchema,
})

const saveSchema = baseSaveSchema.extend({
  oreLayout:z.enum(['legacy','veins']).optional(),
  schemaVersion: z.literal(7),
  settings: settingsSchema,
  factory: factorySchema,
  profile: profileSchema,
  run: runSchema,
}).strict()

const v6SaveSchema = baseSaveSchema.extend({
  schemaVersion: z.literal(6), settings: settingsSchema, factory: factorySchemaV6Checked,
}).strict()

const v5SaveSchema = baseSaveSchema.extend({
  schemaVersion: z.literal(5), settings: settingsSchema, factory: factorySchemaV5,
}).strict()

const v4SaveSchema = baseSaveSchema.extend({
  schemaVersion: z.literal(4),
  settings: settingsSchema,
  factory: factorySchemaV4,
}).strict()

const v3SaveSchema = baseSaveSchema.extend({
  schemaVersion: z.literal(3),
  settings: settingsSchema,
  factory: factorySchemaV3,
}).strict()

const v2SaveSchema = baseSaveSchema.extend({
  schemaVersion: z.literal(2),
  settings: settingsSchema,
}).strict()

const legacySaveSchema = baseSaveSchema.extend({
  schemaVersion: z.literal(1),
  settings: z.object({
    speed: z.union([z.literal(1), z.literal(2), z.literal(4)]),
    showCoordinates: z.boolean(),
  }),
}).strict()

/** Sandbox saves from before the campaign become a free-workshop slot with a fresh profile. */
function migrateV6Save(snapshot: V6SaveSnapshot): SaveSnapshot {
  return {
    ...snapshot,
    schemaVersion: 7,
    profile: createProfile('Engenheiro', 'artisan', 30),
    run: createRun(),
    factory: { ...snapshot.factory, delivered: {}, monsters: [], shipments: [], nextMonsterId: 1 },
  }
}

function migrateV5Save(snapshot: V5SaveSnapshot): V6SaveSnapshot {
  const structures = snapshot.factory.structures.map((structure) => ({ ...structure }))
  const occupied = new Map(structures.map((structure) => [hexKey(structure.q, structure.r), structure]))
  const reserved = new Set(structures.flatMap((structure) => structure.migrationPath.map((cell) => hexKey(cell.q, cell.r))))
  for (const structure of structures) {
    const size = STRUCTURES[structure.type].size
    if (size === 1) continue
    const cells = footprintCells(structure, size)
    const clear = cells.every((cell) => {
      const key = hexKey(cell.q, cell.r), other = occupied.get(key)
      return (!other || other.id === structure.id) && !reserved.has(key)
    })
    // Connected outputs keep their original position in dense legacy factories.
    const hasOutput = outputDirections(structure).some((_, lane) => connectionForLane(structure, lane, (q, r) => occupied.get(hexKey(q, r)) ?? null))
    structure.size = clear && !hasOutput ? size : 1
    if (structure.size > 1) for (const cell of cells) occupied.set(hexKey(cell.q, cell.r), structure)
  }
  return { ...snapshot, schemaVersion: 6, factory: { ...snapshot.factory, structures } }
}

function migrateV4Save(snapshot: V4SaveSnapshot): V6SaveSnapshot {
  return migrateV5Save({
    ...snapshot,
    schemaVersion: 5,
    factory: {
      ...snapshot.factory,
      structures: snapshot.factory.structures.map((structure) => ({
        ...structure,
        laneOutputs: [],
        prismOutputCount: 2,
        siloReleaseMultiple: 2,
      })),
    },
  })
}

function migrateV3Save(snapshot: V3SaveSnapshot): V6SaveSnapshot {
  return migrateV4Save({
    ...snapshot,
    schemaVersion: 4,
    factory: {
      ...snapshot.factory,
      structures: snapshot.factory.structures.map((structure) => ({
        ...structure,
        migrationPath: [],
        migrationProgress: 0,
        migrationThreshold: 0,
      })),
    },
  })
}

function migrateV2Save(snapshot: V2SaveSnapshot): V6SaveSnapshot {
  return migrateV3Save({
    ...snapshot,
    schemaVersion: 3,
    factory: { structures: [], inventory: { ...STARTING_INVENTORY }, deposits: {}, nextStructureId: 1 },
  })
}

function migrateLegacySave(snapshot: LegacySaveSnapshot): V6SaveSnapshot {
  return migrateV2Save({
    ...snapshot,
    schemaVersion: 2,
    settings: { ...snapshot.settings, chunkDistance: DEFAULT_CHUNK_DISTANCE },
  })
}

function validatedMigration(snapshot: V6SaveSnapshot): SaveSnapshot | null {
  const parsed = saveSchema.safeParse(migrateV6Save(snapshot))
  return parsed.success ? parsed.data : null
}

export function validateSave(value: unknown): SaveSnapshot | null {
  const current = saveSchema.safeParse(value)
  if (current.success) {current.data.factory.structures.forEach(normalizeStructureChannel);return current.data}
  const v6 = v6SaveSchema.safeParse(value)
  if (v6.success) return validatedMigration(v6.data as V6SaveSnapshot)
  const v5 = v5SaveSchema.safeParse(value)
  if (v5.success) {
    const migrated = v6SaveSchema.safeParse(migrateV5Save(v5.data as V5SaveSnapshot))
    return migrated.success ? validatedMigration(migrated.data as V6SaveSnapshot) : null
  }
  const v4 = v4SaveSchema.safeParse(value)
  if (v4.success) return finishLegacy(migrateV4Save(v4.data as V4SaveSnapshot))
  const v3 = v3SaveSchema.safeParse(value)
  if (v3.success) return finishLegacy(migrateV3Save(v3.data as V3SaveSnapshot))
  const v2 = v2SaveSchema.safeParse(value)
  if (v2.success) return finishLegacy(migrateV2Save(v2.data as V2SaveSnapshot))
  const legacy = legacySaveSchema.safeParse(value)
  return legacy.success ? finishLegacy(migrateLegacySave(legacy.data as LegacySaveSnapshot)) : null
}

function finishLegacy(snapshot: V6SaveSnapshot): SaveSnapshot | null {
  const checked = v6SaveSchema.safeParse(snapshot)
  return checked.success ? validatedMigration(checked.data as V6SaveSnapshot) : null
}

export function parseSaveText(text: string): SaveSnapshot {
  try {
    const parsed: unknown = JSON.parse(text)
    const snapshot = validateSave(parsed)
    if (!snapshot) throw new Error('formato inválido')
    return snapshot
  } catch {
    throw new Error('O arquivo não contém um save válido do M.M.C. nesta versão.')
  }
}

export function serializeSave(snapshot: SaveSnapshot): string {
  return JSON.stringify(snapshot, null, 2)
}

export { LEGACY_SAVE_ID }
