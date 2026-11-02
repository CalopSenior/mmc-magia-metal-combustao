import { createRng } from '../core/prng'
import { BIOME_LIST } from './biomes'
import { DIFFICULTIES } from './difficulty'
import { ORES } from './ores'
import { resolveGoals } from './contracts'
import { RECIPES, TIER1_RECIPE_LIST, TIER2_RECIPE_LIST, resourceLot } from './structures'
import type { AlloyId, DepositRequest, DifficultyId, EndlessSpec, OreId, ResourceId } from '../types'

/** Raw ores that must exist on the map to make an alloy, following the recipe tree. */
export function rawOresFor(alloy: AlloyId, seen = new Set<OreId>()): Set<OreId> {
  for (const resource of Object.keys(RECIPES[alloy].inputs) as ResourceId[]) {
    if (resource in ORES) seen.add(resource as OreId)
    else rawOresFor(resource as AlloyId, seen)
  }
  return seen
}

function lotsOf(alloy: AlloyId): number[] {
  return Object.keys(RECIPES[alloy].inputs).map((resource) => resourceLot(resource as ResourceId) ?? 1)
}

export function dailySeed(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export interface EndlessOptions {
  readonly seed: string
  readonly daily: boolean
  readonly difficulty: DifficultyId
  readonly chamberUnlocked: boolean
}

/** Deterministic contract for a seed: the same seed gives the same map, the same goal, and a comparable leaderboard. */
export function makeEndlessSpec({ seed, daily, difficulty, chamberUnlocked }: EndlessOptions): EndlessSpec {
  const rng = createRng(`endless:${seed}:${difficulty}`)
  const definition = DIFFICULTIES[difficulty]
  const tier1 = TIER1_RECIPE_LIST.filter((recipe) => Math.max(...lotsOf(recipe.id)) <= definition.maxLot)
  const tier2 = chamberUnlocked && (difficulty === 'engineer' || difficulty === 'master')
    ? TIER2_RECIPE_LIST.filter((recipe) => recipe.id !== 'dragon-core' && recipe.id !== 'stellar-silver' && recipe.id !== 'imperial-orichalcum')
    : []
  const pool = tier2.length && rng() < 0.4 ? tier2 : tier1
  const recipe = pool[Math.floor(rng() * pool.length)]
  const biome = BIOME_LIST[Math.floor(rng() * BIOME_LIST.length)].id
  const needed = [...rawOresFor(recipe.id)]
  const deposits: DepositRequest[] = needed.map((ore) => ({ ore, count: 2 }))
  const goals = resolveGoals([{ resource: recipe.id, fusions: 1 }, { resource: 'perfect-cycles', amount: 4 }], difficulty)
  return {
    key: `${daily ? 'daily' : 'seed'}:${seed}:${difficulty}`,
    daily, seed: `ENDLESS-${seed}`, biome,
    radius: recipe.tier === 2 ? 15 : 12 + needed.length,
    goals, deposits,
  }
}

export function describeEndless(spec: EndlessSpec): string {
  const goal = spec.goals.find((candidate) => candidate.resource !== 'perfect-cycles')
  return goal ? `${goal.amount} × ${goal.resource}` : 'Contrato procedural'
}
