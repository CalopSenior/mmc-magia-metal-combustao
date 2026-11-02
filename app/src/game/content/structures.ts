import { lcm } from '../math/number'
import type {
  AlloyId,
  FactoryState,
  HexDirection,
  PrismOutputCount,
  ResourceId,
  ResourceInventory,
  StructureType,
} from '../types'
import { ORES } from './ores'

export interface StructureDefinition {
  readonly size: 1 | 2 | 3 | 5
  readonly id: StructureType
  readonly name: string
  readonly shortName: string
  readonly description: string
  readonly color: string
  readonly cost: Readonly<Partial<Record<ResourceId, number>>>
  readonly maxHp: number
  /** Dock tab from GDD 9.2. */
  readonly tab: 'creatures' | 'logistics' | 'refining' | 'support' | 'masterworks' | 'decor'
  /** Campaign contract order that introduces the piece (1 = available from the start). */
  readonly introOrder: number
  /** Grimório node that must be owned, if any. */
  readonly tech?: string
  /** What the piece teaches, shown in the dock and in the Códice. */
  readonly lesson: string
}

export const STRUCTURES: Record<StructureType, StructureDefinition> = {
  golem: {
    size: 1, id: 'golem', name: 'Golem Minerador', shortName: 'Golem', color: '#d69b64',
    description: 'Uma criatura de pedra, musgo e runas que extrai minérios com uma picareta. Fica sobre a jazida; a marca de contagem (1 a 9) define quantas unidades entrega por batida, em um lote único.',
    cost: { 'bloody-iron': 3, 'rusted-copper': 2 }, maxHp: 60, tab: 'creatures', introOrder: 1,
    lesson: 'Tabuada: o seletor escolhe o múltiplo. Lotes de 3 formam 3, 6, 9, 12…',
  },
  conveyor: {
    size: 1, id: 'conveyor', name: 'Esteira de Mana', shortName: 'Esteira', color: '#91a89d',
    description: 'Move um recurso por vez. Níveis 1, 2 e 3 correm em 1×, 2× e 4× — esteiras longas demoram mais, e é assim que se sincroniza a chegada.',
    cost: { 'rusted-copper': 1 }, maxHp: 12, tab: 'logistics', introOrder: 1,
    lesson: 'Proporção: velocidade 1×, 2×, 4×. Distância ÷ velocidade = tempo de viagem.',
  },
  furnace: {
    size: 3, id: 'furnace', name: 'Altar de Fusão', shortName: 'Altar', color: '#e07854',
    description: 'Ocupa 3×3. Funde dois minérios em uma liga de Nível 1. Cada entrada tem seu Apetite de Lote; a fusão fecha no MMC dos dois lotes.',
    cost: { 'bloody-iron': 4, 'fossil-coal': 2, 'whispering-quartz': 1 }, maxHp: 120, tab: 'refining', introOrder: 3,
    lesson: 'MMC: o menor número que é múltiplo dos dois lotes.',
  },
  gnome: {
    size: 1, id: 'gnome', name: 'Gnomo Coletor', shortName: 'Coletor', color: '#b58bd0',
    description: 'Ponto de entrega do contrato: cataloga tudo o que chega pela esteira e abastece a reserva global.',
    cost: { 'rusted-copper': 2, 'whispering-quartz': 1 }, maxHp: 30, tab: 'creatures', introOrder: 1,
    lesson: 'Contagem: cada unidade entregue aproxima a meta do contrato.',
  },
  prism: {
    size: 1, id: 'prism', name: 'Prisma Divisor', shortName: 'Prisma', color: '#8fd6d0',
    description: 'Divide um fluxo igualmente em 2 a 5 saídas. Se a divisão não for exata, o resto fica retido. Com o Prisma Ajustável, divide em proporções como 2 : 1. Um pacote ×10 de Runa Multiplicadora entra como dez unidades: 1 × 10 = 10 × 1.',
    cost: { 'rusted-copper': 2, 'whispering-quartz': 2 }, maxHp: 50, tab: 'logistics', introOrder: 4,
    lesson: 'Divisão e frações: 14 ÷ 3 = 4 resto 2.',
  },
  confluence: {
    size: 1, id: 'confluence', name: 'Confluência Rúnica', shortName: 'Confluência', color: '#e0b76d',
    description: 'Junta duas esteiras em uma só. Lotes que chegam juntos se somam: 4 + 5 = 9.',
    cost: { 'bloody-iron': 2, 'rusted-copper': 2 }, maxHp: 50, tab: 'logistics', introOrder: 4,
    lesson: 'Adição de lotes: dois fluxos sincronizados somam seus lotes.',
  },
  silo: {
    size: 2, id: 'silo', name: 'Silo de Amortecimento', shortName: 'Silo', color: '#9fb17d',
    description: 'Ocupa 2×2. Armazena e só libera múltiplos completos do lote escolhido (2 a 13) — a forma de montar lotes grandes como 11 e 13.',
    cost: { 'bloody-iron': 4, 'rusted-copper': 3 }, maxHp: 90, tab: 'logistics', introOrder: 4,
    lesson: 'Múltiplos: o Silo só solta 11, 22, 33… quando o lote é 11.',
  },
  bridge: {
    size: 1, id: 'bridge', name: 'Ponte de Mithril', shortName: 'Ponte', color: '#b9a4d8',
    description: 'Cruza duas esteiras retas em níveis independentes, sem misturar os minérios.',
    cost: { 'bloody-iron': 3, 'rusted-copper': 2, 'whispering-quartz': 1 }, maxHp: 50, tab: 'logistics', introOrder: 1, tech: 'mithril-bridges',
    lesson: 'Geometria: dois caminhos podem se cruzar sem se encontrar.',
  },
  smelter: {
    size: 1, id: 'smelter', name: 'Fornalha Devoradora', shortName: 'Fornalha', color: '#e0824f',
    description: 'Tem um número gravado na boca (2 a 9): o Apetite de Lote. Só processa lotes completos. Falta de minério a machuca; sobra cristaliza na entrada.',
    cost: { 'rusted-copper': 3, 'fossil-coal': 2 }, maxHp: 70, tab: 'refining', introOrder: 2,
    lesson: 'Resto zero: quantidade ÷ lote precisa dar resto 0.',
  },
  chamber: {
    size: 3, id: 'chamber', name: 'Câmara de Transmutação', shortName: 'Câmara', color: '#7ad0c8',
    description: 'Ocupa 3×3. Combina duas ligas de Nível 1 (ou uma liga e Éter) em ligas de Nível 2. Falta e sobra ao mesmo tempo geram um Golem Corrompido.',
    cost: { 'bloody-iron': 8, 'whispering-quartz': 4, 'abyssal-cobalt': 2 }, maxHp: 160, tab: 'refining', introOrder: 1, tech: 'metallurgy-2',
    lesson: 'MMC com números grandes: fatore e use os maiores expoentes.',
  },
  tower: {
    size: 1, id: 'tower', name: 'Torre de Dano Exato', shortName: 'Torre', color: '#d4684f',
    description: 'Dispara um dano fixo (1 a 12). Monstros de Escória caem com qualquer golpe; o Golem Corrompido só aceita golpes que dividem exatamente seu HP.',
    cost: { 'bloody-iron': 4, 'whispering-quartz': 2 }, maxHp: 60, tab: 'support', introOrder: 6,
    lesson: 'Divisores: o dano precisa dividir o HP sem resto.',
  },
  gnomepost: {
    size: 1, id: 'gnomepost', name: 'Posto de Gnomos', shortName: 'Posto', color: '#7fa86b',
    description: 'Abriga um Gnomo Operário que conserta máquinas e limpa cristais. Cada ação gasta Pontos de Éter.',
    cost: { 'rusted-copper': 4, 'whispering-quartz': 1 }, maxHp: 40, tab: 'support', introOrder: 5,
    lesson: 'Custo × benefício: consertar custa Éter; evitar o erro é de graça.',
  },
  depot: {
    size: 1, id: 'depot', name: 'Entreposto de Carga', shortName: 'Entreposto', color: '#a9825a',
    description: 'Fecha caixas de 10, 50 ou 100 unidades e um Golem Transportador as leva, por cima de obstáculos, ao Entreposto de mesmo canal.',
    cost: { 'bloody-iron': 3, 'rusted-copper': 4 }, maxHp: 70, tab: 'logistics', introOrder: 8,
    lesson: 'Escala: caixas de 10, 50 e 100 — múltiplos de potências de 10.',
  },
  portal: {
    size: 1, id: 'portal', name: 'Portal de Teleporte Modular', shortName: 'Portal', color: '#c08cf0',
    description: 'Transfere lotes fechados instantaneamente ao portal de mesmo canal — se a quantidade for um número primo ou múltiplo de 12.',
    cost: { 'bloody-iron': 4, 'whispering-quartz': 3, 'lunar-silver': 1 }, maxHp: 70, tab: 'logistics', introOrder: 1, tech: 'modular-teleport',
    lesson: 'Primos e múltiplos de 12: quem passa pelo portal?',
  },
  collector: {
    size: 1, id: 'collector', name: 'Ponto de Coleta', shortName: 'Coleta', color: '#c9a063',
    description: 'Um depósito de beira de jazida. Antes de se mudar para outra jazida, todo Golem Minerador a até 9 células esvazia aqui o que carrega; o ponto guarda o estoque e o solta na esteira, em remessas de até 18. Nada se perde na troca.',
    cost: { 'bloody-iron': 3, 'rusted-copper': 4 }, maxHp: 60, tab: 'logistics', introOrder: 4,
    lesson: 'Conservação: o que o golem carregava antes é exatamente o que sai pela esteira depois. Some os lotes para conferir.',
  },
  alchemy: {
    size: 2, id: 'alchemy', name: 'Mesa de Alquimia', shortName: 'Alquimia', color: '#b07be0',
    description: 'Obra-prima. Um Gnomo Alquimista queima 1 Núcleo de Dragão e 1 minério-semente e devolve 18 unidades do mesmo minério: os 8 minérios básicos que o Núcleo custou para ser forjado, mais 10 de bônus. Aceita Núcleos com Runa ×10 como um pacote de dez.',
    cost: { 'resonant-brass': 6, 'azure-amalgam': 6, 'dragon-core': 1 }, maxHp: 110, tab: 'masterworks', introOrder: 16,
    lesson: 'Soma de uma árvore: some os minérios de cada nível da receita (1 + 1, depois 2 + 2, depois 4 + 4 = 8) e confira a conta.',
  },
  energizer: {
    size: 2, id: 'energizer', name: 'Energizador Aditivo', shortName: 'Energizador', color: '#e8cf54',
    description: 'Obra-prima. Consome Latão Ressonante para dobrar a velocidade com que as jazidas se restauram num raio de 36 células. Mais Latão por ciclo (a dose, de 1 a 5) soma mais um à velocidade: dose 3 é × 4.',
    cost: { 'resonant-brass': 10, 'gray-steel': 6, 'astral-electrum': 4 }, maxHp: 90, tab: 'masterworks', introOrder: 10,
    lesson: 'Multiplicador aditivo: velocidade = 1 + dose. Cada unidade extra de Latão compra a mesma fatia de bônus.',
  },
  grandaltar: {
    size: 5, id: 'grandaltar', name: 'Altar de Fusão Maior', shortName: 'Altar Maior', color: '#ff7f3f',
    description: 'Obra-prima de 5×5, erguida inteira sobre uma Fenda de Magma. Funde até 3 ligas de Nível 1 ao mesmo tempo, escolhidas pelo que chega, e entrega o dobro de cada fusão.',
    cost: { 'scaled-iron': 12, 'dark-chrome': 12, 'volcanic-glass': 8 }, maxHp: 260, tab: 'masterworks', introOrder: 12,
    lesson: 'Paralelismo e dobro: três receitas ao mesmo tempo, com saída × 2. Os lotes continuam valendo: resto zero em cada entrada.',
  },
  paving: {
    size: 1, id: 'paving', name: 'Piso Decorativo', shortName: 'Piso', color: '#9a9482',
    description: 'Pedra lavrada para dar aspecto às alas da oficina. Escolha o acabamento (pedra, laje rúnica ou mosaico de latão). Construir qualquer outra peça sobre um piso o substitui. Não conta no limite de máquinas.',
    cost: { 'rusted-copper': 1 }, maxHp: 10, tab: 'decor', introOrder: 1,
    lesson: 'Padrões e simetria: repetir uma peça em grade forma uma figura maior.',
  },
  lantern: {
    size: 1, id: 'lantern', name: 'Lanterna de Mana', shortName: 'Lanterna', color: '#ffd37a',
    description: 'Um poste de pedra com uma chama de mana que nunca apaga. Decoração: marca caminhos e cantos da oficina. Não conta no limite de máquinas.',
    cost: { 'rusted-copper': 2, 'whispering-quartz': 1 }, maxHp: 10, tab: 'decor', introOrder: 1,
    lesson: 'Pontos de referência: lanternas a cada 4 células formam a tabuada do 4 no chão.',
  },
}

export const STRUCTURE_LIST: readonly StructureDefinition[] = Object.values(STRUCTURES)

export const DOCK_TABS = [
  { id: 'creatures', label: 'Criaturas' },
  { id: 'logistics', label: 'Logística' },
  { id: 'refining', label: 'Refino e Fusão' },
  { id: 'support', label: 'Runas e Suporte' },
  { id: 'masterworks', label: 'Obras-Primas' },
  { id: 'decor', label: 'Decoração' },
] as const

/** Pieces that only decorate: they never count as machines, never break and monsters ignore them. */
export function isDecor(type: StructureType): boolean {
  return type === 'paving' || type === 'lantern'
}

/** Finishes of the Piso Decorativo, chosen with the same selector that picks a belt level. */
export const PAVING_STYLES = [
  { tier: 1, label: 'Pedra', color: '#8f8a78' },
  { tier: 2, label: 'Laje rúnica', color: '#6f6aa8' },
  { tier: 3, label: 'Mosaico de latão', color: '#c6a64b' },
] as const

export interface RecipeDefinition {
  readonly id: AlloyId
  /** Units of each input consumed by one fusion. */
  readonly inputs: Readonly<Partial<Record<ResourceId, number>>>
  readonly durationTicks: number
  /** Units of alloy produced by one fusion (1 for the sandbox alloys). */
  readonly output: number
  readonly tier: 0 | 1 | 2
  /** Wildcard Éter crystals needed in the machine's stock. */
  readonly catalyst: number
  /** Pontos de Éter taken from the reserve ("Éter Puro"). */
  readonly etherCost: number
  readonly minRune: 0 | 1 | 2 | 3
}

function legacy(id: AlloyId, inputs: RecipeDefinition['inputs'], durationTicks: number): RecipeDefinition {
  return { id, inputs, durationTicks, output: 1, tier: 0, catalyst: 0, etherCost: 0, minRune: 0 }
}

export function resourceLot(resource: ResourceId): number | null {
  if (resource === 'raw-ether-crystal') return null
  const ore = ORES[resource as keyof typeof ORES]
  if (ore) return typeof ore.baseLot === 'number' ? ore.baseLot : null
  return FUSION_LOTS[resource as AlloyId] ?? null
}

/** Mutable on purpose: filled once while building the recipes below. */
const FUSION_LOTS: Partial<Record<AlloyId, number>> = {}

function fusion(id: AlloyId, tier: 1 | 2, a: ResourceId, b: ResourceId, extra: Partial<Pick<RecipeDefinition, 'catalyst' | 'etherCost' | 'minRune'>> & { amounts?: [number, number] } = {}): RecipeDefinition {
  const la = resourceLot(a) as number, lb = resourceLot(b) as number
  const [amountA, amountB] = extra.amounts ?? [lcm(la, lb), lcm(la, lb)]
  const output = Math.max(amountA, amountB)
  FUSION_LOTS[id] = output
  return {
    id, inputs: { [a]: amountA, [b]: amountB }, output, tier,
    durationTicks: Math.min(400, 60 + output * 2),
    catalyst: extra.catalyst ?? 0, etherCost: extra.etherCost ?? 0, minRune: extra.minRune ?? 0,
  }
}

const LEGACY_RECIPES: RecipeDefinition[] = [
  legacy('draconic-steel', { 'bloody-iron': 2, 'fossil-coal': 1 }, 40),
  legacy('electrum', { 'solar-gold': 1, 'lunar-silver': 1 }, 60),
  legacy('ether-brass', { 'rusted-copper': 2, 'raw-ether-crystal': 1 }, 50),
]

const TIER1_RECIPES: RecipeDefinition[] = [
  fusion('runic-bronze', 1, 'rusted-copper', 'fossil-coal'),
  fusion('gray-steel', 1, 'fossil-coal', 'bloody-iron'),
  fusion('resonant-brass', 1, 'rusted-copper', 'whispering-quartz'),
  fusion('scaled-iron', 1, 'bloody-iron', 'raw-scales'),
  fusion('azure-amalgam', 1, 'whispering-quartz', 'abyssal-cobalt'),
  fusion('volcanic-glass', 1, 'raw-scales', 'draconic-obsidian'),
  fusion('astral-electrum', 1, 'abyssal-cobalt', 'solar-gold'),
  fusion('dark-chrome', 1, 'bloody-iron', 'abyssal-cobalt'),
  fusion('draconic-gold', 1, 'draconic-obsidian', 'solar-gold'),
]

const TIER2_RECIPES: RecipeDefinition[] = [
  fusion('ether-steel', 2, 'gray-steel', 'resonant-brass'),
  fusion('fossil-mithril', 2, 'scaled-iron', 'dark-chrome'),
  fusion('imperial-orichalcum', 2, 'runic-bronze', 'azure-amalgam'),
  fusion('dorsal-adamantine', 2, 'volcanic-glass', 'draconic-gold'),
  fusion('stellar-silver', 2, 'astral-electrum', 'lunar-silver', { amounts: [63, 66], catalyst: 3 }),
  fusion('dragon-core', 2, 'ether-steel', 'dorsal-adamantine', { etherCost: 5, minRune: 1 }),
]

export const RECIPE_LIST: readonly RecipeDefinition[] = [...LEGACY_RECIPES, ...TIER1_RECIPES, ...TIER2_RECIPES]
export const LEGACY_RECIPE_LIST: readonly RecipeDefinition[] = LEGACY_RECIPES
export const TIER1_RECIPE_LIST: readonly RecipeDefinition[] = TIER1_RECIPES
export const TIER2_RECIPE_LIST: readonly RecipeDefinition[] = TIER2_RECIPES
export const RECIPES = Object.fromEntries(RECIPE_LIST.map((recipe) => [recipe.id, recipe])) as Record<AlloyId, RecipeDefinition>

/**
 * Basic ore units that went into one unit of a resource, walking the whole recipe tree.
 * Dragon core = ether steel + dorsal adamantine = (gray steel + resonant brass) + (volcanic glass + draconic gold)
 *              = (2 + 2) + (2 + 2) = 8, because each fusion takes the same amount of both inputs.
 */
export function oreCost(resource: ResourceId): number {
  const recipe = RECIPES[resource as AlloyId]
  if (!recipe || recipe.tier === 0) return 1
  const total = Object.entries(recipe.inputs).reduce((sum, [input, amount]) => sum + (amount ?? 0) * oreCost(input as ResourceId), 0)
  return total / recipe.output
}

/** Ingredients of a fusion, with how many whole lots of each one it takes: the lesson behind "MMC = 6 (3 + 2 lotes)". */
export function recipeLots(recipe: RecipeDefinition): { resource: ResourceId; amount: number; lot: number; lots: number }[] {
  return Object.entries(recipe.inputs).map(([resource, amount]) => {
    const lot = resourceLot(resource as ResourceId) ?? 1
    return { resource: resource as ResourceId, amount: amount ?? 0, lot, lots: Math.round((amount ?? 0) / lot) }
  })
}

export const MAX_STRUCTURES = 256
/** Floors and lanterns are counted apart, so decorating never costs a machine slot. */
export const MAX_DECOR = 512
export const MAX_STACK = 8
export const MAX_GOLEM_BUFFER = 18
export const LOGISTICS_INTERVAL_TICKS = 6
export const MAX_FURNACE_INPUT_PER_RESOURCE = 12
export const GOLEM_MIGRATION_RADIUS = 3
export const GOLEM_MIGRATION_TICKS_PER_CELL = 8
export const DEPOSIT_RECOVERY_MAX_PER_SECOND = 0.1
export const MAX_LOGISTICS_BUFFER = 120
export const MAX_PRISM_BUFFER = 60
export const MAX_CONFLUENCE_BUFFER = 64
export const MIN_SILO_RELEASE_MULTIPLE = 2
export const MAX_SILO_RELEASE_MULTIPLE = 13

// Contract rules ------------------------------------------------------------
/**
 * Ticks between two moves of one belt: levels 1, 2 and 3 run at 1×, 2× and 4×. Two-phase transfers let a belt take a new
 * item every second pass, so consecutive items of one lot are 2 × period apart (8, 4 or 2 ticks).
 * A silence longer than `BURST_GAP_TICKS` therefore ends the lot, whichever belt level carried it.
 */
export const STRICT_BELT_PERIODS = [4, 2, 1] as const
export const BURST_GAP_TICKS = 12
export const FATIGUE_DAMAGE = 14
export const CRYSTAL_BUFFER = 24
export const REPAIR_HP_PER_ETHER = 10
export const GNOME_REPAIR_TICKS = 40
export const GNOME_RADIUS = 9
export const TOWER_RANGE = 5
export const TOWER_PERIOD_TICKS = 24
export const MAX_TOWER_POWER = 12
export const DEPOT_TICKS_PER_CELL = 10
export const MONSTER_STEP_TICKS = 22
export const MONSTER_STRIKE = 5
export const ALCHEMIST_TOLERANCE = 2
export const ALCHEMIST_WINDOW_TICKS = 1200
export const ALCHEMIST_COST_ETHER = 8
export const RUNE_COSTS: Record<1 | 2 | 3, number> = { 1: 6, 2: 18, 3: 45 }

// Obras-Primas and conveniences ------------------------------------------------
/** A golem empties its sack here when it moves to another deposit, from this far (cells, either axis). */
export const COLLECTOR_RADIUS = 9
export const COLLECTOR_CAPACITY = 300
export const COLLECTOR_RELEASE = 18
/** A golem needs this long (ticks) to empty each unit of its sack, between a minimum and a maximum. */
export const COLLECTOR_TICKS_PER_UNIT = 8
export const COLLECTOR_MIN_WAIT = 20
export const COLLECTOR_MAX_WAIT = 160
/** How far (steps) a golem will walk to reach a collection point, and to the deposit it chose afterwards. */
export const COLLECTOR_WALK_LIMIT = 14
export const MIGRATION_WALK_LIMIT = 40
/** Choosing the next deposit: score = units left / (1 + this × steps away), so 20 next door beats 21 at the edge of sight. */
export const MIGRATION_DISTANCE_WEIGHT = 0.5
/** Basic ores in one Núcleo de Dragão (8) and what the table pays back for it. */
export const DRAGON_CORE_ORE_COST = oreCost('dragon-core')
export const ALCHEMY_BONUS = 10
export const ALCHEMY_YIELD = DRAGON_CORE_ORE_COST + ALCHEMY_BONUS
export const ALCHEMY_TICKS = 120
export const ALCHEMY_CORE_CAPACITY = 24
export const ALCHEMY_SEED_CAPACITY = 24
/** Deposits closer than this to an Energizador (cells, straight line) recover faster. */
export const ENERGIZER_RADIUS = 36
export const ENERGIZER_CYCLE_TICKS = 1200
export const ENERGIZER_MAX_DOSE = 5
export const ENERGIZER_BRASS_CAPACITY = 40
export const GRAND_ALTAR_JOBS = 3
export const GRAND_ALTAR_OUTPUT_FACTOR = 2

/** Speed of a deposit's recovery while an Energizador at this dose feeds it: 1 + dose (dose 1 doubles it). */
export function energizerBoost(dose: number): number {
  return 1 + Math.max(0, Math.min(ENERGIZER_MAX_DOSE, Math.round(dose)))
}

export function maxHpFor(type: StructureType): number {
  return STRUCTURES[type].maxHp
}

function normalizeDirection(direction: number): HexDirection {
  return ((direction % 6 + 6) % 6) as HexDirection
}

export function prismOutputDirections(direction: HexDirection, count: PrismOutputCount): HexDirection[] {
  if (count === 2) return [normalizeDirection(direction + 1), normalizeDirection(direction + 5)]
  if (count === 3) return [normalizeDirection(direction + 1), direction, normalizeDirection(direction + 5)]
  if (count === 4) return [normalizeDirection(direction + 1), normalizeDirection(direction + 5), normalizeDirection(direction + 2), normalizeDirection(direction + 4)]
  return [normalizeDirection(direction + 1), direction, normalizeDirection(direction + 5), normalizeDirection(direction + 2), normalizeDirection(direction + 4)]
}

export function confluenceInputDirections(direction: HexDirection): [HexDirection, HexDirection] {
  return [normalizeDirection(direction + 2), normalizeDirection(direction + 4)]
}

export function bridgeOutputDirection(direction: HexDirection, lane: number): HexDirection {
  return normalizeDirection(direction + lane)
}

export function bridgeInputDirection(direction: HexDirection, lane: number): HexDirection {
  return normalizeDirection(direction + lane + 3)
}

export function depositRecoveryPerSecond(purity: number): number {
  return DEPOSIT_RECOVERY_MAX_PER_SECOND * purity / 100
}

export const STARTING_INVENTORY: ResourceInventory = {
  'rusted-copper': 24,
  'fossil-coal': 12,
  'bloody-iron': 16,
  'whispering-quartz': 6,
  'solar-gold': 3,
  'lunar-silver': 3,
  'raw-ether-crystal': 3,
}

/** Contracts start with a healthy workshop stock so the lesson, not the shopping, is the challenge. */
export const CONTRACT_INVENTORY: ResourceInventory = {
  'rusted-copper': 60,
  'fossil-coal': 40,
  'bloody-iron': 50,
  'whispering-quartz': 24,
  'raw-scales': 4,
  'abyssal-cobalt': 6,
  'solar-gold': 2,
  'lunar-silver': 2,
  'raw-ether-crystal': 4,
}

export function createInitialFactoryState(inventory: ResourceInventory = STARTING_INVENTORY): FactoryState {
  return {
    structures: [],
    inventory: { ...inventory },
    deposits: {},
    nextStructureId: 1,
    delivered: {},
    monsters: [],
    shipments: [],
    nextMonsterId: 1,
  }
}

export function recipeForResource(resource: ResourceId): boolean {
  return LEGACY_RECIPES.some((recipe) => (recipe.inputs[resource] ?? 0) > 0)
}

export function formatCost(cost: Readonly<Partial<Record<ResourceId, number>>>): string {
  return Object.entries(cost).map(([resource, amount]) => `${amount} ${resource}`).join(', ')
}
