import { createRng } from '../core/prng'
import { ORES } from '../content/ores'
import { hexKey } from '../math/hex'
import type { DepositRequest, HexCell, OreLayout, Terrain } from '../types'
import { createSeedHash, generateCell } from './generation'

/** Natural obstacles from GDD 2.2: magma rifts, basalt pillars, acid lakes and ancient ruins. */
export const OBSTACLE_TERRAINS: ReadonlySet<Terrain> = new Set<Terrain>(['magma', 'acid', 'basalt', 'ruin'])
export const LIQUID_TERRAINS: ReadonlySet<Terrain> = new Set<Terrain>(['magma', 'acid'])

export function isObstacle(cell: Pick<HexCell, 'terrain' | 'deposit'>): boolean {
  return !cell.deposit && OBSTACLE_TERRAINS.has(cell.terrain)
}

/** Deposits are always buildable: the golem has to stand on them. */
export function isLiquid(cell: Pick<HexCell, 'terrain'>): boolean {
  return LIQUID_TERRAINS.has(cell.terrain)
}

export function insideBounds(radius: number | null, q: number, r: number): boolean {
  return radius === null || (Math.abs(q) <= radius && Math.abs(r) <= radius)
}

export interface PlannedMap {
  readonly overrides: ReadonlyMap<string, HexCell>
  readonly missing: number
  readonly buildableShare: number
}

/**
 * Places the requested deposits on buildable, mutually spaced cells.
 * The terrain stays procedural; only the ore layout is guaranteed, so a contract always can be finished.
 */
export function planContractMap(seed: string, radius: number, requests: readonly DepositRequest[],layout:OreLayout='veins',options:{ caldera?: boolean } = {}): PlannedMap {
  const hash = createSeedHash(seed), rng = createRng(`layout:${seed}`)
  const candidates: HexCell[] = []
  let buildable = 0, total = 0
  for (let r = -radius + 1; r <= radius - 1; r += 1) {
    for (let q = -radius + 1; q <= radius - 1; q += 1) {
      const cell = generateCell(hash, q, r,layout)
      total += 1
      if (!isObstacle(cell) && !cell.deposit) buildable += 1
      const distance = Math.max(Math.abs(q), Math.abs(r))
      if (distance >= 2 && !OBSTACLE_TERRAINS.has(cell.terrain)) candidates.push(cell)
    }
  }
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]]
  }
  const overrides = new Map<string, HexCell>(), taken: HexCell[] = []
  let missing = 0
  for (const request of requests) {
    for (let placed = 0; placed < request.count; placed += 1) {
      const spot = candidates.find((cell) => !overrides.has(cell.key) && taken.every((other) => Math.max(Math.abs(other.q - cell.q), Math.abs(other.r - cell.r)) >= 4))
      if (!spot) { missing += 1; continue }
      const richness = request.richness ?? 3
      const definition = ORES[request.ore]
      const quantity = typeof definition.baseLot === 'number' ? 18 + definition.baseLot * 4 : 48
      overrides.set(spot.key, {
        ...spot,
        deposit: { ore: request.ore, richness, purity: 70 + Math.floor(rng() * 30), quantity },
      })
      taken.push(spot)
    }
  }
  // Natural deposits would blur the lesson inside a small contract map: keep only the planned ones.
  for (let r = -radius; r <= radius; r += 1) {
    for (let q = -radius; q <= radius; q += 1) {
      const key = hexKey(q, r)
      if (overrides.has(key)) continue
      const cell = generateCell(hash, q, r,layout)
      if (cell.deposit) overrides.set(key, { ...cell, deposit: null })
    }
  }
  // Once the Altar de Fusão Maior is available, the map owns a lava lake big enough for it (7×7 cells, away from the centre).
  if (options.caldera && radius >= 14) {
    const reach = 3, spots: { q: number; r: number }[] = []
    for (let r = -radius + reach + 1; r <= radius - reach - 1; r += 1) {
      for (let q = -radius + reach + 1; q <= radius - reach - 1; q += 1) {
        const distance = Math.max(Math.abs(q), Math.abs(r))
        if (distance < radius * 0.45 || distance > radius * 0.8) continue
        let free = true
        for (let dr = -reach; dr <= reach && free; dr += 1) for (let dq = -reach; dq <= reach; dq += 1) if (overrides.get(hexKey(q + dq, r + dr))?.deposit) { free = false; break }
        if (free) spots.push({ q, r })
      }
    }
    const lake = spots.length ? spots[Math.floor(rng() * spots.length)] : null
    if (lake) for (let dr = -reach; dr <= reach; dr += 1) for (let dq = -reach; dq <= reach; dq += 1) {
      const q = lake.q + dq, r = lake.r + dr, key = hexKey(q, r)
      overrides.set(key, { ...(overrides.get(key) ?? generateCell(hash, q, r, layout)), terrain: 'magma', deposit: null })
    }
  }
  return { overrides, missing, buildableShare: total ? buildable / total : 0 }
}
