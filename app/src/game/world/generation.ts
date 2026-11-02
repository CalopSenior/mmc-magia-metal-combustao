import { BIOMES, type Weighted } from '../content/biomes'
import { ORES } from '../content/ores'
import { hashString } from '../core/prng'
import { hexKey } from '../math/hex'
import type { Axial, BiomeId, HexCell, OreDeposit, OreId, OreLayout, Terrain, WorldChunk } from '../types'
import { CHUNK_SIZE } from '../config'
import { fbm, unitAt } from './noise'
import { sampleTerrainField, surfaceTerrain } from './topography'
import { getBiomeAt } from './biomeField'

export { getBiomeAt } from './biomeField'

function pickWeighted<T>(items: readonly Weighted<T>[], roll: number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let cursor = roll * total
  for (const item of items) {
    cursor -= item.weight
    if (cursor < 0) return item.id
  }
  return items[items.length - 1].id
}

function createLegacyDeposit(seedHash: number, q: number, r: number, biomeId: BiomeId, terrain: Terrain): OreDeposit | null {
  const biome = BIOMES[biomeId]
  const cluster = fbm(seedHash, q * 0.16, r * 0.16, 907, 3)
  const terrainModifier = terrain === 'acid' ? 0.35 : terrain === 'magma' ? 0.7 : 1
  const chance = Math.max(0.04, Math.min(0.72, (biome.oreChance + (cluster - 0.5) * 0.32) * terrainModifier))
  if (unitAt(seedHash, q, r, 911) >= chance) return null
  const ore = pickWeighted(biome.oreWeights, unitAt(seedHash, q, r, 919))
  const richness = (1 + Math.floor(unitAt(seedHash, q, r, 929) * 3)) as 1 | 2 | 3
  const purity = 45 + Math.floor(unitAt(seedHash, q, r, 937) ** 1.7 * 55)
  const definition = ORES[ore]
  const baseLot = typeof definition.baseLot === 'number'
    ? definition.baseLot
    : definition.baseLot[0] + Math.floor(unitAt(seedHash, q, r, 941) * (definition.baseLot[1] - definition.baseLot[0] + 1))
  return { ore, purity, richness, quantity: baseLot * richness }
}

const districtCache=new Map<string,OreId>()
/** Four neighboring chunks share a prospecting district; each chunk contains one ore only. */
export function districtOre(seed:number,chunkQ:number,chunkR:number):OreId {
  const dq=Math.floor(chunkQ/2),dr=Math.floor(chunkR/2),key=`${seed}:${dq},${dr}`
  // Keep the four starter materials within reach of a fresh workshop. Other
  // districts follow biome weights, including all of the rare resources.
  if(dq===0&&dr===0) return 'rusted-copper'
  if(dq===-1&&dr===0) return 'fossil-coal'
  if(dq===0&&dr===-1) return 'bloody-iron'
  if(dq===-1&&dr===-1) return 'whispering-quartz'
  let ore=districtCache.get(key)
  if(!ore) {
    const biome=getBiomeAt(seed,(dq*2+1)*CHUNK_SIZE,(dr*2+1)*CHUNK_SIZE)
    ore=pickWeighted(BIOMES[biome].oreWeights,unitAt(seed,dq,dr,1201))
    if(districtCache.size>=2048) districtCache.delete(districtCache.keys().next().value!)
    districtCache.set(key,ore)
  }
  return ore
}

function createVeinDeposit(seed:number,q:number,r:number,terrain:Terrain):OreDeposit|null {
  const cq=Math.floor(q/CHUNK_SIZE),cr=Math.floor(r/CHUNK_SIZE)
  // Irregular compact pockets leave broad lanes of empty ground for logistics.
  const cx=(cq+.28+unitAt(seed,cq,cr,1213)*.44)*CHUNK_SIZE
  const cy=(cr+.28+unitAt(seed,cq,cr,1217)*.44)*CHUNK_SIZE
  const radius=1.65+unitAt(seed,cq,cr,1223)*1.05
  const warp=(fbm(seed,q*.38,r*.38,1229,2)-.5)*1.3
  if(Math.hypot(q-cx,(r-cy)*1.15)>radius+warp) return null
  if(terrain==='acid'||terrain==='magma') return null
  const ore=districtOre(seed,cq,cr),definition=ORES[ore]
  const richness=(1+Math.floor(unitAt(seed,cq,cr,1231)*3)) as 1|2|3
  const purity=55+Math.floor(unitAt(seed,q,r,1237)*45)
  const baseLot=typeof definition.baseLot==='number'?definition.baseLot:1+Math.floor(unitAt(seed,q,r,1249)*9)
  return {ore,richness,purity,quantity:baseLot*richness}
}

export function generateCell(seedHash: number, q: number, r: number, layout:OreLayout='veins'): HexCell {
  const biome = getBiomeAt(seedHash, q, r)
  const definition = BIOMES[biome]
  const surface = sampleTerrainField(seedHash, q, r, biome)
  const relief = surface.height
  const elevation = definition.elevation[0] + Math.floor(relief * (definition.elevation[1] - definition.elevation[0] + 1))
  const terrainRoll = fbm(seedHash, q * 0.14, r * 0.14, 857, 3) * 0.78 + unitAt(seedHash, q, r, 859) * 0.22
  const depositTerrain = pickWeighted(definition.terrainWeights, terrainRoll)
  const terrain = surfaceTerrain(surface) ?? (depositTerrain === 'acid' || depositTerrain === 'magma' ? 'basalt' : depositTerrain)
  return {
    key: hexKey(q, r),
    q,
    r,
    biome,
    terrain,
    elevation: Math.min(definition.elevation[1], elevation),
    relief,
    deposit: layout==='legacy'?createLegacyDeposit(seedHash,q,r,biome,depositTerrain):createVeinDeposit(seedHash,q,r,terrain),
    variant: Math.floor(unitAt(seedHash, q, r, 863) * 8),
  }
}

export function generateChunk(seedHash: number, chunkQ: number, chunkR: number, layout:OreLayout='veins'): WorldChunk {
  const cells: HexCell[] = []
  const startQ = chunkQ * CHUNK_SIZE
  const startR = chunkR * CHUNK_SIZE
  for (let localR = 0; localR < CHUNK_SIZE; localR += 1) {
    for (let localQ = 0; localQ < CHUNK_SIZE; localQ += 1) {
      cells.push(generateCell(seedHash, startQ + localQ, startR + localR,layout))
    }
  }
  return { key: hexKey(chunkQ, chunkR), q: chunkQ, r: chunkR, cells }
}

export function createSeedHash(seed: string): number {
  return hashString(seed)
}

export function chunkCoordinate(cell: Axial): Axial {
  return { q: Math.floor(cell.q / CHUNK_SIZE), r: Math.floor(cell.r / CHUNK_SIZE) }
}
