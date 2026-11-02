import { BIOME_LIST } from '../content/biomes'
import type { BiomeId } from '../types'
import { fbm, unitAt, unitFromHash } from './noise'

const REGION_SIZE = 26
const SQRT_3 = Math.sqrt(3)

/** Soft Voronoi weights for art. The discrete field remains stable for seeded deposits. */
export function getBiomeBlend(seedHash:number,q:number,r:number):Record<BiomeId,number> {
  const baseX=SQRT_3*(q+r/2),baseY=1.5*r
  const x=baseX+(fbm(seedHash,baseX*0.035,baseY*0.035,701,3)-0.5)*11
  const y=baseY+(fbm(seedHash,baseX*0.035,baseY*0.035,709,3)-0.5)*11
  const sites:{distance:number;biome:BiomeId}[]=[]
  // A two-region halo keeps all nonzero contributors when the region index changes.
  for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) {
    const gx=Math.floor(x/REGION_SIZE)+dx,gy=Math.floor(y/REGION_SIZE)+dy
    const hash=unitAt(seedHash,gx,gy,719)*4294967296
    const sx=(gx+0.12+unitFromHash(hash)*0.76)*REGION_SIZE
    const sy=(gy+0.12+unitFromHash(hash^0x9e3779b9)*0.76)*REGION_SIZE
    sites.push({distance:Math.hypot(sx-x,sy-y),biome:BIOME_LIST[Math.floor(unitFromHash(hash^0x85ebca6b)*BIOME_LIST.length)].id})
  }
  const nearest=Math.min(...sites.map(site=>site.distance))
  const weights=Object.fromEntries(BIOME_LIST.map(biome=>[biome.id,0])) as Record<BiomeId,number>
  let total=0
  for(const site of sites) {
    const t=Math.max(0,1-(site.distance-nearest)/6),weight=t*t*(3-2*t)
    weights[site.biome]+=weight;total+=weight
  }
  for(const biome of BIOME_LIST) weights[biome.id]/=total
  return weights
}

export function getBiomeAt(seedHash: number, q: number, r: number): BiomeId {
  const baseX = SQRT_3 * (q + r / 2)
  const baseY = 1.5 * r
  const warpX = (fbm(seedHash, baseX * 0.035, baseY * 0.035, 701, 3) - 0.5) * 11
  const warpY = (fbm(seedHash, baseX * 0.035, baseY * 0.035, 709, 3) - 0.5) * 11
  const x = baseX + warpX
  const y = baseY + warpY
  const regionX = Math.floor(x / REGION_SIZE)
  const regionY = Math.floor(y / REGION_SIZE)
  let nearestDistance = Number.POSITIVE_INFINITY
  let nearestBiome: BiomeId = 'copper-vale'

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const gridX = regionX + offsetX
      const gridY = regionY + offsetY
      const siteHash = unitAt(seedHash, gridX, gridY, 719) * 4294967296
      const siteX = (gridX + 0.12 + unitFromHash(siteHash) * 0.76) * REGION_SIZE
      const siteY = (gridY + 0.12 + unitFromHash(siteHash ^ 0x9e3779b9) * 0.76) * REGION_SIZE
      const distance = (siteX - x) ** 2 + (siteY - y) ** 2
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestBiome = BIOME_LIST[Math.floor(unitFromHash(siteHash ^ 0x85ebca6b) * BIOME_LIST.length)].id
      }
    }
  }
  return nearestBiome
}

