import { DIFFICULTIES, type DifficultyDefinition } from '../content/difficulty'
import { carrierReturnAt } from './carrierMotion'
import { sameChannel } from '../content/channels'
import { getResource, resourceName } from '../content/resources'
import {
  ALCHEMIST_TOLERANCE,
  ALCHEMY_BONUS,
  ALCHEMY_TICKS,
  ALCHEMY_YIELD,
  COLLECTOR_CAPACITY,
  COLLECTOR_RADIUS,
  COLLECTOR_RELEASE,
  DRAGON_CORE_ORE_COST,
  ENERGIZER_CYCLE_TICKS,
  ENERGIZER_MAX_DOSE,
  GRAND_ALTAR_JOBS,
  GRAND_ALTAR_OUTPUT_FACTOR,
  energizerBoost,
  isDecor,
  ALCHEMIST_WINDOW_TICKS,
  BURST_GAP_TICKS,
  DEPOT_TICKS_PER_CELL,
  FATIGUE_DAMAGE,
  GNOME_RADIUS,
  GNOME_REPAIR_TICKS,
  MONSTER_STEP_TICKS,
  MONSTER_STRIKE,
  RECIPES,
  REPAIR_HP_PER_ETHER,
  STRUCTURES,
  TIER1_RECIPE_LIST,
  TIER2_RECIPE_LIST,
  TOWER_PERIOD_TICKS,
  TOWER_RANGE,
  maxHpFor,
  resourceLot,
} from '../content/structures'
import { describeDivision, isPrime } from '../math/number'
import type { SoundCue } from '../audio/cues'
import type { AlloyId, Monster, OreId, MonsterKind, ResourceId, ResourceStack, RunMode, RunStats, Shipment, Structure, StructureType } from '../types'
import { structureSize } from './structureGeometry'

export type SimEvent =
  | { kind: 'lesson'; message: string }
  | { kind: 'notice'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'discover'; recipe: AlloyId }
  | { kind: 'cue'; cue: SoundCue; x: number; y: number }
  | { kind: 'shot'; from: { x: number; y: number }; to: { x: number; y: number }; good: boolean }

export interface RulesConfig {
  readonly difficulty: DifficultyDefinition
  readonly mode: RunMode
  /** Half-width of the finite contract map, or null for the infinite workshop. */
  readonly bounds: number | null
  readonly freeMode: boolean
  readonly hasTech: (id: string) => boolean
  readonly maxGnomes: number
  readonly allowed: ReadonlySet<StructureType>
}

export const FREE_RULES_DIFFICULTY: DifficultyDefinition = { ...DIFFICULTIES.apprentice, penalty: 0, monsters: false, canFail: false }

/** What the rule functions need from the simulation: kept narrow so they stay testable. */
export interface RuleHost {
  readonly tick: number
  readonly rules: RulesConfig
  readonly stats: RunStats
  ether: number
  readonly monsters: Monster[]
  readonly shipments: Shipment[]
  readonly structureList: Structure[]
  structureById(id: number): Structure | null
  addInventory(resource: ResourceId, amount: number): void
  spendEther(amount: number): boolean
  gainEther(amount: number): void
  emit(event: SimEvent): void
  newMonster(kind: MonsterKind, at: Structure, number: number, hp: number): void
  removeMonster(monster: Monster): void
}

const MAX_OUTPUT = 400
const CRYSTAL_ID: ResourceId = 'raw-ether-crystal'

export function isBroken(structure: Structure): boolean {
  return structure.hp !== undefined && structure.hp <= 0
}

export function hpOf(structure: Structure): number {
  return structure.hp ?? maxHpFor(structure.type)
}

export function isFusionMachine(type: StructureType): boolean {
  return type === 'furnace' || type === 'chamber' || type === 'grandaltar'
}

export function isLotMachine(type: StructureType): boolean {
  return type === 'furnace' || type === 'chamber' || type === 'smelter' || type === 'grandaltar'
}

export function recipeTier(type: StructureType): 1 | 2 {
  return type === 'chamber' ? 2 : 1
}

export function recipesFor(type: StructureType) {
  return type === 'chamber' ? TIER2_RECIPE_LIST : TIER1_RECIPE_LIST
}

/** The Apetite de Lote of a given input port. */
export function portLot(structure: Structure, resource: ResourceId): number {
  if (structure.type === 'smelter') return structure.lot ?? 2
  return resourceLot(resource) ?? 1
}

/** A sound the player can place in space: the machine's own centre. */
function cueAt(host: RuleHost, cue: SoundCue, structure: Structure): void {
  const at = center(structure)
  host.emit({ kind: 'cue', cue, x: at.x, y: at.y })
}

function penaltyFor(host: RuleHost, structure: Structure, resource: ResourceId): number {
  const doubled = resource === 'bloody-iron' ? 2 : 1
  return FATIGUE_DAMAGE * host.rules.difficulty.penalty * doubled * (1 + (structure.rune ?? 0))
}

function absorbed(host: RuleHost, structure: Structure): boolean {
  const now = host.tick
  const tolerant = structure.alchemist === true || (host.rules.hasTech('chief-engineer') && isLotMachine(structure.type))
  if (!tolerant) return false
  const window = (structure.absorbed ?? []).filter((at) => now - at < ALCHEMIST_WINDOW_TICKS)
  structure.absorbed = window
  if (window.length >= ALCHEMIST_TOLERANCE) return false
  window.push(now)
  host.stats.absorbedEvents += 1
  host.emit({ kind: 'notice', message: `O Gnomo Alquimista absorveu o erro (${window.length}/${ALCHEMIST_TOLERANCE} por minuto).` })
  return true
}

function harm(host: RuleHost, structure: Structure, amount: number): void {
  if (amount <= 0) return
  const before = hpOf(structure)
  structure.hp = Math.max(0, before - amount)
  host.stats.damageTaken += before - structure.hp
  if (before > 0 && structure.hp <= 0) {
    cueAt(host, 'break', structure)
    host.emit({ kind: 'error', message: `${STRUCTURES[structure.type].name} quebrou por Fadiga Mágica. Conserte-a no Examinar (gasta Éter) ou instale um Posto de Gnomos.` })
  }
}

function spawnSlag(host: RuleHost, structure: Structure, remainder: number): void {
  if (!host.rules.difficulty.monsters) return
  host.newMonster('slag', structure, remainder, Math.max(1, remainder))
  host.emit({ kind: 'lesson', message: `Nasceu um Monstro de Escória com o número ${remainder}: é o resto que o gerou. Uma Torre com dano ${remainder} (ou maior) o derruba.` })
}

function checkCorrupted(host: RuleHost, structure: Structure): void {
  if (structure.type !== 'chamber' || !host.rules.difficulty.monsters) return
  const { hungerAt, crystalAt } = structure
  if (hungerAt === undefined || crystalAt === undefined || Math.abs(hungerAt - crystalAt) > 400) return
  structure.hungerAt = undefined
  structure.crystalAt = undefined
  const recipe = structure.target ? RECIPES[structure.target] : null
  const hp = recipe ? recipe.output : 60
  host.newMonster('corrupted', structure, hp, hp)
  host.emit({ kind: 'lesson', message: `Colapso de Fusão! Fome e entupimento ao mesmo tempo criaram um Golem Corrompido de HP ${hp}. Só cai com dano que seja divisor de ${hp}.` })
}

function evaluateBurst(host: RuleHost, structure: Structure, resource: ResourceId, count: number): void {
  const lot = portLot(structure, resource)
  const name = resourceName(resource)
  const machine = STRUCTURES[structure.type].shortName
  let good = Math.floor(count / lot) * lot
  const remainder = count - good
  structure.inputs[resource] = structure.inputs[resource] ?? 0
  // Cristal de Éter Bruto is a wildcard: it can supply exactly the modular value that is missing (GDD 3, item 11).
  if (remainder > 0 && structure.type !== 'smelter' && resource !== CRYSTAL_ID) {
    const missing = lot - remainder
    const recipe = structure.target ? RECIPES[structure.target] : null
    const reserved = recipe?.catalyst ?? 0
    const stock = structure.inputs[CRYSTAL_ID] ?? 0
    if (missing <= 9 && stock - missing >= reserved && stock >= missing) {
      structure.inputs[CRYSTAL_ID] = stock - missing
      good += lot
      host.emit({ kind: 'lesson', message: `O Cristal de Éter virou curinga: ${count} + ${missing} = ${count + missing}, um múltiplo de ${lot}. Sem resto!` })
      structure.inputs[resource] = (structure.inputs[resource] ?? 0) + good
      host.stats.perfectCycles += 1
      cueAt(host, 'cycle', structure)
      return
    }
  }
  if (remainder === 0 && good > 0) {
    structure.inputs[resource] = (structure.inputs[resource] ?? 0) + good
    host.stats.perfectCycles += 1
    cueAt(host, 'cycle', structure)
    if (structure.type === 'smelter') {
      structure.progress += 1
      if (structure.progress % 4 === 0) host.gainEther(1)
    }
    host.emit({ kind: 'lesson', message: `Ciclo perfeito em ${machine}: ${describeDivision(count, lot)}. Resto zero!` })
    return
  }
  if (count < lot) {
    if (absorbed(host, structure)) return
    harm(host, structure, penaltyFor(host, structure, resource))
    host.stats.hungerEvents += 1
    structure.hungerAt = host.tick
    structure.flawed = true
    cueAt(host, 'hunger', structure)
    host.emit({ kind: 'lesson', message: `Fome de Lote em ${machine}: chegaram ${count} de ${name}, mas o lote é ${lot} (${describeDivision(count, lot)}). Faltam ${lot - count} para fechar o ciclo.` })
    checkCorrupted(host, structure)
    return
  }
  structure.inputs[resource] = (structure.inputs[resource] ?? 0) + good
  if (absorbed(host, structure)) return
  const crystals = (structure.crystals ??= {})
  crystals[resource] = (crystals[resource] ?? 0) + remainder
  host.stats.clogEvents += 1
  structure.crystalAt = host.tick
  structure.flawed = true
  cueAt(host, 'clog', structure)
  host.emit({ kind: 'lesson', message: `Entupimento em ${machine}: ${describeDivision(count, lot)}. ${remainder} de ${name} excedentes cristalizaram na entrada.` })
  const total = Object.values(crystals).reduce((sum, value) => sum + (value ?? 0), 0)
  if (total >= host.rules.difficulty.spawnThreshold) {
    structure.crystals = {}
    spawnSlag(host, structure, remainder)
  }
  checkCorrupted(host, structure)
}

/** A burst ends after a quiet gap; only then is its size compared with the machine's lot. */
export function evaluateBursts(host: RuleHost, structure: Structure): void {
  const bursts = structure.bursts
  if (!bursts) return
  for (const key of Object.keys(bursts)) {
    const tracker = bursts[key]
    if (tracker.count > 0 && host.tick - tracker.last < BURST_GAP_TICKS) continue
    delete bursts[key]
    if (tracker.count > 0) evaluateBurst(host, structure, key as ResourceId, tracker.count)
  }
}

export function registerArrival(structure: Structure, resource: ResourceId, tick: number): void {
  const bursts = (structure.bursts ??= {})
  const tracker = bursts[resource]
  if (tracker) { tracker.count += 1; tracker.last = tick } else bursts[resource] = { count: 1, last: tick }
}

export function pendingBurst(structure: Structure, resource: ResourceId): number {
  return structure.bursts?.[resource]?.count ?? 0
}

function crystalCount(structure: Structure, resource: ResourceId): number {
  return structure.crystals?.[resource] ?? 0
}

/** How many units of a port the machine is willing to hold, burst in flight included. */
export function portCapacity(structure: Structure, resource: ResourceId): number {
  if (structure.type === 'smelter') return Math.max(36, (structure.lot ?? 2) * 4)
  if (resource === CRYSTAL_ID) return 12
  const lot = resourceLot(resource) ?? 1
  const recipe = structure.target ? RECIPES[structure.target] : null
  if (structure.type === 'grandaltar') {
    // Several fusions share the stock: room for two full rounds of the largest need.
    const pool = recipe ? [recipe] : TIER1_RECIPE_LIST
    const biggest = pool.reduce((most, candidate) => Math.max(most, candidate.inputs[resource] ?? 0), 0)
    return biggest * GRAND_ALTAR_JOBS + lot * 2 + (structure.twin ? lot : 0)
  }
  const need = recipe?.inputs[resource]
  return (need ?? 24) + lot * 2 + (structure.twin ? lot : 0)
}

export function acceptsResource(structure: Structure, resource: ResourceId, reserved: number): boolean {
  if (isBroken(structure)) return false
  if (structure.type === 'smelter') {
    const held = Object.entries(structure.inputs).find(([, amount]) => (amount ?? 0) > 0)?.[0]
    const pending = Object.keys(structure.bursts ?? {})[0]
    const other = (held && held !== resource) || (pending && pending !== resource) || (structure.output && structure.output.resource !== resource)
    return !other && (structure.inputs[resource] ?? 0) + pendingBurst(structure, resource) + reserved < portCapacity(structure, resource)
  }
  const list = recipesFor(structure.type)
  const recipe = structure.target ? RECIPES[structure.target] : null
  if (resource !== CRYSTAL_ID) {
    if (recipe ? recipe.inputs[resource] === undefined : !list.some((candidate) => candidate.inputs[resource] !== undefined)) return false
  }
  return (structure.inputs[resource] ?? 0) + pendingBurst(structure, resource) + crystalCount(structure, resource) + reserved < portCapacity(structure, resource)
}

function autoTarget(structure: Structure): AlloyId | null {
  const present = new Set([...Object.entries(structure.inputs).filter(([, amount]) => (amount ?? 0) > 0).map(([resource]) => resource), ...Object.keys(structure.bursts ?? {})])
  const candidates = recipesFor(structure.type).filter((recipe) => Object.keys(recipe.inputs).every((resource) => present.has(resource) || resource === CRYSTAL_ID))
  return candidates.length === 1 ? candidates[0].id : null
}

export function updateFusionMachine(host: RuleHost, structure: Structure): void {
  evaluateBursts(host, structure)
  if (isBroken(structure)) return
  if (!structure.target) {
    const guess = autoTarget(structure)
    if (guess) structure.target = guess
    else return
  }
  const recipe = RECIPES[structure.target]
  if (recipe.tier !== recipeTier(structure.type)) { structure.target = null; return }
  if (!structure.recipe) {
    if (!Object.entries(recipe.inputs).every(([resource, amount]) => (structure.inputs[resource as ResourceId] ?? 0) >= (amount ?? 0))) return
    if ((structure.inputs[CRYSTAL_ID] ?? 0) < recipe.catalyst) return
    if ((structure.rune ?? 0) < recipe.minRune) return
    if (!host.spendEther(recipe.etherCost)) return
    for (const [resource, amount] of Object.entries(recipe.inputs)) {
      structure.inputs[resource as ResourceId] = (structure.inputs[resource as ResourceId] ?? 0) - (amount ?? 0)
    }
    if (recipe.catalyst) structure.inputs[CRYSTAL_ID] = (structure.inputs[CRYSTAL_ID] ?? 0) - recipe.catalyst
    structure.recipe = recipe.id
    structure.progress = 0
  }
  structure.progress += structure.twin ? 2 : 1
  if (structure.progress < recipe.durationTicks) return
  const scale = 10 ** (structure.rune ?? 0)
  const output = structure.output
  if (output && (output.resource !== recipe.id || (output.scale ?? 1) !== scale || output.amount + recipe.output > MAX_OUTPUT)) return
  if (output) output.amount += recipe.output
  else structure.output = { resource: recipe.id, amount: recipe.output, ...(scale > 1 ? { scale } : {}) }
  structure.recipe = null
  structure.progress = 0
  host.stats.fusions += 1
  cueAt(host, 'fuse', structure)
  host.emit({ kind: 'discover', recipe: recipe.id })
  if (!structure.flawed) {
    const gain = (recipe.tier === 2 ? 5 : 2) * (structure.twin ? 2 : 1)
    host.gainEther(gain)
    host.stats.pureEther += gain
    host.emit({ kind: 'lesson', message: `Fusão perfeita de ${resourceName(recipe.id)}: +${gain} Éter Puro.` })
  }
  structure.flawed = false
}

export function updateSmelter(host: RuleHost, structure: Structure): void {
  evaluateBursts(host, structure)
  if (isBroken(structure)) return
  const resource = (Object.keys(structure.inputs) as ResourceId[]).find((key) => (structure.inputs[key] ?? 0) > 0)
  if (!resource) return
  const amount = structure.inputs[resource] ?? 0
  const scale = 10 ** (structure.rune ?? 0)
  const output = structure.output
  if (output && (output.resource !== resource || (output.scale ?? 1) !== scale || output.amount + amount > MAX_OUTPUT)) return
  if (output) output.amount += amount
  else structure.output = { resource, amount, ...(scale > 1 ? { scale } : {}) }
  structure.inputs[resource] = 0
  cueAt(host, 'smelt', structure)
}

export function stackValue(stack: ResourceStack): number {
  return stack.amount * (stack.scale ?? 1)
}

// Towers -------------------------------------------------------------------

function center(structure: Structure): { x: number; y: number } {
  const offset = (structureSize(structure) - 1) / 2
  return { x: structure.q + offset, y: structure.r + offset }
}

export function updateTower(host: RuleHost, structure: Structure): void {
  if (isBroken(structure)) return
  structure.cooldown = Math.max(0, (structure.cooldown ?? 0) - 1)
  if (structure.cooldown > 0 || host.monsters.length === 0) return
  const origin = center(structure)
  let nearest: Monster | null = null, best = TOWER_RANGE
  for (const monster of host.monsters) {
    const distance = Math.hypot(monster.x - origin.x, monster.y - origin.y)
    if (distance <= best) { best = distance; nearest = monster }
  }
  if (!nearest) return
  structure.cooldown = TOWER_PERIOD_TICKS
  const power = Math.max(1, structure.power ?? 1)
  const good = nearest.kind === 'slag' || nearest.hp % power === 0
  host.emit({ kind: 'shot', from: origin, to: { x: nearest.x, y: nearest.y }, good })
  if (!good) {
    host.emit({ kind: 'lesson', message: `Ricochete! O Golem Corrompido tem HP ${nearest.hp} e ${nearest.hp} ÷ ${power} deixa resto ${nearest.hp % power}. Escolha um dano que divida ${nearest.hp} exatamente.` })
    return
  }
  nearest.hp -= power
  if (nearest.hp > 0) return
  host.stats.monstersSlain += 1
  host.removeMonster(nearest)
  if (host.rules.hasTech('slag-recycling')) {
    host.gainEther(nearest.kind === 'corrupted' ? 10 : 2)
    host.addInventory(CRYSTAL_ID, nearest.kind === 'corrupted' ? 3 : 1)
    host.emit({ kind: 'notice', message: 'Escória reciclada: Éter e Cristal de Éter Bruto recuperados.' })
  }
}

// Monsters -----------------------------------------------------------------

export function updateMonsters(host: RuleHost): void {
  const { difficulty } = host.rules
  for (const monster of host.monsters) {
    monster.cooldown = Math.max(0, monster.cooldown - 1)
    let target: Structure | null = null, best = 14
    for (const structure of host.structureList) {
      if (isDecor(structure.type)) continue
      const c = center(structure), distance = Math.hypot(c.x - monster.x, c.y - monster.y) - structureSize(structure) / 2
      if (distance < best) { best = distance; target = structure }
    }
    if (!target) continue
    const c = center(target), dx = c.x - monster.x, dy = c.y - monster.y, distance = Math.hypot(dx, dy) || 1
    const reach = 0.7 + structureSize(target) / 2
    if (distance > reach) {
      const speed = (1 / MONSTER_STEP_TICKS) * (monster.fast ? 1.8 : 1) * (difficulty.id === 'master' ? 1.4 : 1)
      monster.x += dx / distance * speed
      monster.y += dy / distance * speed
    } else if (monster.cooldown === 0) {
      monster.cooldown = 30
      harm(host, target, MONSTER_STRIKE * difficulty.penalty * (monster.kind === 'corrupted' ? 2 : 1))
    }
  }
}

// Gnomes -------------------------------------------------------------------

function needsRepair(structure: Structure): boolean {
  const crystals = Object.values(structure.crystals ?? {}).reduce((sum, value) => sum + (value ?? 0), 0)
  return hpOf(structure) < maxHpFor(structure.type) * 0.9 || crystals > 0
}

export function repairCost(structure: Structure): number {
  const missing = maxHpFor(structure.type) - hpOf(structure)
  const crystals = Object.values(structure.crystals ?? {}).reduce((sum, value) => sum + (value ?? 0), 0)
  return Math.ceil(missing / REPAIR_HP_PER_ETHER) + crystals
}

export function applyRepair(host: RuleHost, structure: Structure): boolean {
  const cost = repairCost(structure)
  if (cost <= 0) return false
  if (!host.spendEther(cost)) return false
  structure.hp = maxHpFor(structure.type)
  structure.crystals = {}
  host.stats.repairs += 1
  cueAt(host, 'repair', structure)
  return true
}

export function updateGnomePost(host: RuleHost, structure: Structure, activeWorkers: number): boolean {
  if (isBroken(structure)) return false
  const speed = host.rules.hasTech('mercury-boots') ? 1.5 : 1
  const worker = structure.worker
  if (worker) {
    const target = host.structureById(worker.target)
    if (!target || !needsRepair(target)) { structure.worker = null; return false }
    worker.progress += speed / GNOME_REPAIR_TICKS
    if (worker.progress >= 1) {
      if (applyRepair(host, target)) host.emit({ kind: 'notice', message: `Gnomo consertou ${STRUCTURES[target.type].name}.` })
      structure.worker = null
    }
    return true
  }
  if (activeWorkers >= host.rules.maxGnomes) return false
  const origin = center(structure)
  let pick: Structure | null = null, worst = Infinity
  for (const candidate of host.structureList) {
    if (candidate.id === structure.id || !needsRepair(candidate)) continue
    const c = center(candidate)
    if (Math.max(Math.abs(c.x - origin.x), Math.abs(c.y - origin.y)) > GNOME_RADIUS) continue
    const health = hpOf(candidate) / maxHpFor(candidate.type)
    if (health < worst) { worst = health; pick = candidate }
  }
  if (!pick || host.ether < repairCost(pick) && !host.rules.freeMode) return false
  structure.worker = { target: pick.id, progress: 0 }
  return true
}

// Depots and portals -----------------------------------------------------------

function partner(host: RuleHost, structure: Structure): Structure | null {
  return host.structureList.find((other) => other.id !== structure.id && other.type === structure.type && sameChannel(other,structure) && !isBroken(other)) ?? null
}

export function updateDepot(host: RuleHost, structure: Structure): void {
  if (isBroken(structure)) return
  const crate = structure.crateSize ?? 10
  const resource = (Object.keys(structure.inputs) as ResourceId[]).find((key) => (structure.inputs[key] ?? 0) >= crate)
  const flying = host.shipments.filter((shipment) => shipment.from === structure.id).length
  if (resource && flying < 6) {
    const other = partner(host, structure)
    if (other) {
      structure.inputs[resource] = (structure.inputs[resource] ?? 0) - crate
      const distance = Math.max(Math.abs(other.q - structure.q), Math.abs(other.r - structure.r))
      host.shipments.push({ from: structure.id, to: other.id, resource, amount: crate, departedAt: host.tick, arriveAt: host.tick + 20 + distance * DEPOT_TICKS_PER_CELL })
    }
  }
  for (const shipment of host.shipments) {
    if (shipment.deliveredAt!==undefined || shipment.to !== structure.id || host.tick < shipment.arriveAt) continue
    const output = structure.output
    if (output && (output.resource !== shipment.resource || output.amount + shipment.amount > MAX_OUTPUT)) continue
    if (output) output.amount += shipment.amount
    else structure.output = { resource: shipment.resource, amount: shipment.amount }
    shipment.deliveredAt = host.tick
  }
}

export function pruneShipments(host: RuleHost): void {
  for (let index = host.shipments.length - 1; index >= 0; index -= 1) {
    const shipment = host.shipments[index]
    const returnedAt=carrierReturnAt(shipment)
    if (shipment.amount <= 0 || returnedAt!==null&&host.tick>=returnedAt || !host.structureById(shipment.to) || !host.structureById(shipment.from)) host.shipments.splice(index, 1)
  }
}

/** Modular teleport: an entire closed lot jumps when its size is prime or a multiple of 12. */
export function passesPortal(total: number): boolean {
  return total >= 2 && (isPrime(total) || total % 12 === 0)
}

export function updatePortal(host: RuleHost, structure: Structure): void {
  if (isBroken(structure)) return
  const bursts = structure.bursts
  if (bursts) for (const key of Object.keys(bursts)) {
    const tracker = bursts[key]
    if (host.tick - tracker.last < BURST_GAP_TICKS) continue
    structure.inputs[key as ResourceId] = (structure.inputs[key as ResourceId] ?? 0) + tracker.count
    delete bursts[key]
    const total = structure.inputs[key as ResourceId] ?? 0
    if (!passesPortal(total)) host.emit({ kind: 'lesson', message: `O Portal recusou ${total} unidades: ${total} não é primo nem múltiplo de 12. Mude o lote para 11, 13, 12, 24…` })
  }
  const resource = (Object.keys(structure.inputs) as ResourceId[]).find((key) => passesPortal(structure.inputs[key] ?? 0) && !structure.bursts?.[key])
  if (!resource) return
  const other = partner(host, structure)
  if (!other) return
  const amount = structure.inputs[resource] ?? 0
  const output = other.output
  if (output && (output.resource !== resource || output.amount + amount > MAX_OUTPUT)) return
  if (output) output.amount += amount
  else other.output = { resource, amount }
  structure.inputs[resource] = 0
  cueAt(host, 'portal', other)
  host.emit({ kind: 'notice', message: `Portal: ${amount} × ${getResource(resource).name} teleportados.` })
}

// Ponto de Coleta ----------------------------------------------------------------

function stockOf(structure: Structure): number {
  return Object.values(structure.inputs).reduce((sum, amount) => sum + (amount ?? 0), 0)
}

/**
 * A golem is about to walk to another deposit: whatever it carries goes to the nearest collection point
 * within reach that still has room. Returns the amount handed over.
 */
export function collectFrom(host: RuleHost, golem: Structure): number {
  const carried = golem.output
  if (!carried || carried.amount <= 0) return 0
  const here = center(golem)
  let point: Structure | null = null, nearest = Infinity
  for (const candidate of host.structureList) {
    if (candidate.type !== 'collector' || isBroken(candidate) || stockOf(candidate) >= COLLECTOR_CAPACITY) continue
    const at = center(candidate), reach = Math.max(Math.abs(at.x - here.x), Math.abs(at.y - here.y))
    if (reach <= COLLECTOR_RADIUS && reach < nearest) { nearest = reach; point = candidate }
  }
  if (!point) return 0
  const moved = Math.min(carried.amount, COLLECTOR_CAPACITY - stockOf(point))
  point.inputs[carried.resource] = (point.inputs[carried.resource] ?? 0) + moved
  carried.amount -= moved
  if (carried.amount <= 0) golem.output = null
  cueAt(host, 'collect', point)
  host.emit({ kind: 'lesson', message: `Ponto de Coleta: o Golem deixou ${moved} × ${getResource(carried.resource).name} antes de trocar de jazida. Estoque do ponto: ${stockOf(point)}.` })
  return moved
}

export function updateCollector(host: RuleHost, structure: Structure): void {
  void host
  if (isBroken(structure) || structure.output) return
  let best: ResourceId | null = null, most = 0
  for (const [resource, amount] of Object.entries(structure.inputs)) {
    if ((amount ?? 0) > most) { most = amount ?? 0; best = resource as ResourceId }
  }
  if (!best) return
  const amount = Math.min(most, COLLECTOR_RELEASE)
  structure.inputs[best] = most - amount
  if (structure.inputs[best] === 0) delete structure.inputs[best]
  structure.output = { resource: best, amount }
}

// Mesa de Alquimia ---------------------------------------------------------------

/** The ore a running table is multiplying, or null while it is idle. */
export function alchemySeed(structure: Structure): ResourceId | null {
  return structure.sourceResource
}

export function isOre(resource: ResourceId): boolean {
  return !(resource in RECIPES)
}

export function updateAlchemy(host: RuleHost, structure: Structure): void {
  if (isBroken(structure)) return
  if (structure.sourceResource === null) {
    if ((structure.inputs['dragon-core'] ?? 0) < 1) return
    const seed = (Object.keys(structure.inputs) as ResourceId[]).find((key) => isOre(key) && (structure.inputs[key] ?? 0) > 0)
    if (!seed) return
    const held = structure.output
    if (held && (held.resource !== seed || held.amount + ALCHEMY_YIELD > MAX_OUTPUT)) return
    structure.inputs['dragon-core'] = (structure.inputs['dragon-core'] ?? 0) - 1
    structure.inputs[seed] = (structure.inputs[seed] ?? 0) - 1
    structure.sourceResource = seed as OreId
    structure.progress = 0
  }
  structure.progress += 1
  if (structure.progress < ALCHEMY_TICKS) return
  const seed = structure.sourceResource as ResourceId
  const held = structure.output
  if (held && (held.resource !== seed || held.amount + ALCHEMY_YIELD > MAX_OUTPUT)) return
  if (held) held.amount += ALCHEMY_YIELD
  else structure.output = { resource: seed, amount: ALCHEMY_YIELD }
  structure.sourceResource = null
  structure.progress = 0
  cueAt(host, 'transmute', structure)
  host.emit({ kind: 'lesson', message: `Mesa de Alquimia: 1 Núcleo de Dragão custou ${DRAGON_CORE_ORE_COST} minérios básicos. Devolve ${DRAGON_CORE_ORE_COST} + ${ALCHEMY_BONUS} = ${ALCHEMY_YIELD} × ${getResource(seed).name}.` })
}

// Energizador Aditivo -------------------------------------------------------------

export function energizerActive(structure: Structure): boolean {
  return structure.type === 'energizer' && !isBroken(structure) && (structure.charge ?? 0) > 0
}

/** Multiplier on the recovery speed of deposits in reach: 1 while idle, 1 + dose while charged. */
export function energizerMultiplier(structure: Structure): number {
  return energizerActive(structure) ? energizerBoost(structure.dose ?? 1) : 1
}

export function updateEnergizer(host: RuleHost, structure: Structure): void {
  if (isBroken(structure)) return
  if ((structure.charge ?? 0) > 0) { structure.charge = (structure.charge ?? 0) - 1; return }
  const dose = Math.max(1, Math.min(ENERGIZER_MAX_DOSE, structure.power ?? 1))
  const brass = structure.inputs['resonant-brass'] ?? 0
  if (brass < dose) { structure.dose = 0; return }
  structure.inputs['resonant-brass'] = brass - dose
  structure.charge = ENERGIZER_CYCLE_TICKS
  structure.dose = dose
  cueAt(host, 'energize', structure)
}

// Altar de Fusão Maior ------------------------------------------------------------

const MAX_PRODUCTS = 800

export function updateGrandAltar(host: RuleHost, structure: Structure): void {
  evaluateBursts(host, structure)
  if (isBroken(structure)) return
  const jobs = (structure.jobs ??= [])
  const products = (structure.products ??= {})
  const pool = structure.target ? [RECIPES[structure.target]] : TIER1_RECIPE_LIST
  // Start every recipe whose inputs are all in stock, up to the number of crucibles.
  for (let guard = 0; guard < GRAND_ALTAR_JOBS && jobs.length < GRAND_ALTAR_JOBS; guard += 1) {
    const recipe = pool.find((candidate) => Object.entries(candidate.inputs).every(([resource, amount]) => (structure.inputs[resource as ResourceId] ?? 0) >= (amount ?? 0)))
    if (!recipe) break
    for (const [resource, amount] of Object.entries(recipe.inputs)) structure.inputs[resource as ResourceId] = (structure.inputs[resource as ResourceId] ?? 0) - (amount ?? 0)
    jobs.push({ recipe: recipe.id, progress: 0 })
  }
  for (let index = jobs.length - 1; index >= 0; index -= 1) {
    const job = jobs[index], recipe = RECIPES[job.recipe]
    job.progress += structure.twin ? 2 : 1
    if (job.progress < recipe.durationTicks) continue
    const made = recipe.output * GRAND_ALTAR_OUTPUT_FACTOR
    if (Object.values(products).reduce((sum, amount) => sum + (amount ?? 0), 0) + made > MAX_PRODUCTS) { job.progress = recipe.durationTicks; continue }
    products[recipe.id] = (products[recipe.id] ?? 0) + made
    jobs.splice(index, 1)
    host.stats.fusions += 1
    cueAt(host, 'fuse', structure)
    host.emit({ kind: 'discover', recipe: recipe.id })
    if (!structure.flawed) {
      const gain = 2 * (structure.twin ? 2 : 1) * GRAND_ALTAR_OUTPUT_FACTOR
      host.gainEther(gain)
      host.stats.pureEther += gain
      host.emit({ kind: 'lesson', message: `Fusão perfeita de ${resourceName(recipe.id)} no Altar Maior: ${recipe.output} × 2 = ${made}. +${gain} Éter Puro.` })
    }
  }
  if (jobs.length === 0) structure.flawed = false
  // Finished alloys leave one kind at a time through the single outlet.
  const held = structure.output
  let kind: ResourceId | null = null, most = 0
  for (const [resource, amount] of Object.entries(products)) {
    if ((amount ?? 0) > most && (!held || held.resource === resource)) { most = amount ?? 0; kind = resource as ResourceId }
  }
  if (kind && (!held || held.amount < MAX_OUTPUT)) {
    const moved = Math.min(most, MAX_OUTPUT - (held?.amount ?? 0))
    products[kind] = most - moved
    if (products[kind] === 0) delete products[kind]
    if (held) held.amount += moved
    else structure.output = { resource: kind, amount: moved }
  }
  // The renderer and the audio read the first crucible.
  structure.recipe = jobs[0]?.recipe ?? null
  structure.progress = jobs[0]?.progress ?? 0
}
