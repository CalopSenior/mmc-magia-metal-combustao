import { getBiomeAt, getBiomeBlend } from './biomeField'
import type { BiomeId, Terrain } from '../types'
import { fbm, unitAt } from './noise'

export interface TerrainField {
  height: number
  fissure: number
  moisture: number
  ether: number
  red: number
  green: number
  blue: number
  heat: number
  /** Depth inside a lava lake (0 outside): the obsidian crater is dotted with magma pools big enough for the Altar de Fusão Maior. */
  lava: number
}

const ROCK_COLORS = {
  'copper-vale': [49, 54, 57, 0.12],
  'iron-gorge': [57, 49, 52, 0.55],
  'obsidian-crater': [34, 33, 48, 1],
  'ether-citadel': [26, 49, 57, 0.02],
} as const

const LAKE_CELL = 44

/**
 * One lava lake at most per 44×44 block of the map, 5 to 8 cells wide on each side of its centre and always
 * inside its own block, so a 5×5 square of cells fits entirely inside. Nothing near the starting area.
 */
export function lavaDepth(seed: number, x: number, y: number): number {
  const bq = Math.floor(x / LAKE_CELL), br = Math.floor(y / LAKE_CELL)
  if (unitAt(seed, bq, br, 1301) >= 0.5) return 0
  const cx = (bq + 0.23 + unitAt(seed, bq, br, 1303) * 0.54) * LAKE_CELL
  const cy = (br + 0.23 + unitAt(seed, bq, br, 1307) * 0.54) * LAKE_CELL
  if (Math.abs(cx) < 30 && Math.abs(cy) < 30) return 0
  const radius = (5.4 + unitAt(seed, bq, br, 1309) * 2.4) * (0.92 + fbm(seed, x * 0.3, y * 0.3, 1311, 2) * 0.16)
  return Math.max(0, 1 - Math.hypot(x - cx, y - cy) / radius)
}

function sampleKernel(seed:number,q:number,r:number) {
  const warpX = (fbm(seed, q * 0.065, r * 0.065, 1103, 2) - 0.5) * 3.5
  const warpY = (fbm(seed, q * 0.065, r * 0.065, 1109, 2) - 0.5) * 3.5
  const x = q + warpX
  const y = r + warpY
  const elevation = fbm(seed, x * 0.11, y * 0.11, 811, 4)
  return {x,y,elevation,fissure:fbm(seed,x*0.19,y*0.19,1123,3),moisture:fbm(seed,x*0.13,y*0.13,1129,3)}
}

function biomeHeight(seed:number,{x,y,elevation}:ReturnType<typeof sampleKernel>,biome:BiomeId):number {
  return biome === 'iron-gorge'
    ? (1 - Math.abs(elevation * 2 - 1)) * 0.78 + elevation * 0.22
    : biome === 'obsidian-crater'
      ? Math.min(1, Math.abs(elevation - 0.5) * 1.45 + fbm(seed, x * 0.12, y * 0.12, 823, 3) * 0.35)
      : elevation
}

/** Discrete seeded rules are retained for existing contract layouts and saves. */
export function sampleTerrainField(seed: number, q: number, r: number, biome: BiomeId = getBiomeAt(seed, q, r)): TerrainField {
  const [red,green,blue,heat]=ROCK_COLORS[biome]
  const kernel=sampleKernel(seed,q,r)
  return {
    height:biomeHeight(seed,kernel,biome),
    fissure:kernel.fissure,moisture:kernel.moisture,
    ether: biome === 'ether-citadel' ? 1 : 0,
    red, green, blue, heat,
    lava: lavaDepth(seed, q, r),
  }
}

/** Blend relief and thermal parameters before classifying pixels, avoiding biome cut walls. */
export function sampleVisualTerrainField(seed:number,q:number,r:number):TerrainField {
  const weights=getBiomeBlend(seed,q,r),kernel=sampleKernel(seed,q,r)
  const result:TerrainField={height:0,red:0,green:0,blue:0,heat:0,ether:0,lava:lavaDepth(seed,q,r),fissure:kernel.fissure,moisture:kernel.moisture}
  for(const [biome,weight] of Object.entries(weights)) {
    if(weight===0) continue
    const [red,green,blue,heat]=ROCK_COLORS[biome as BiomeId]
    result.height+=biomeHeight(seed,kernel,biome as BiomeId)*weight
    result.red+=red*weight;result.green+=green*weight;result.blue+=blue*weight
    result.heat+=heat*weight;result.ether+=(biome==='ether-citadel'?1:0)*weight
  }
  return result
}

/** Same thresholds drive inspection and rendering; deposits retain their old seed rules. */
export function surfaceTerrain(field: TerrainField): Terrain | null {
  if (field.lava > 0 && field.heat > 0.8) return 'magma'
  const crack = Math.abs(field.fissure - 0.5)
  if (crack < 0.018 + field.heat * 0.025 && field.heat > 0.3) return 'magma'
  if (field.moisture > 0.56 && field.height < 0.57) return 'acid'
  if (field.ether > 0.35 && crack < 0.055) return 'crystal'
  return null
}

export function interpolateField(a: TerrainField, b: TerrainField, c: TerrainField, d: TerrainField, x: number, y: number): TerrainField {
  const field = {} as TerrainField
  for (const key of Object.keys(a) as (keyof TerrainField)[]) {
    field[key] = (a[key] * (1 - x) + b[key] * x) * (1 - y) + (c[key] * (1 - x) + d[key] * x) * y
  }
  return field
}

/** Packed RGB palette, quantized light and contour steps imitate minimal 16-bit art. */
export function terrainColor(field: TerrainField, slopeX: number, slopeY: number, grain: number, radar = false): number {
  let { red, green, blue } = field
  const crack = Math.abs(field.fissure - 0.5)
  const magmaWidth = 0.018 + field.heat * 0.025
  const terrain = surfaceTerrain(field)
  if (terrain === 'magma') {
    const core = field.lava > 0 && field.heat > 0.8 ? Math.min(1, field.lava * 1.8) : 1 - crack / magmaWidth
    ;[red, green, blue] = core < 0.22 ? [119, 46, 28] : core < 0.52 ? [190, 68, 26] : core < 0.82 ? [231, 118, 30] : [255, 188, 72]
  } else if (terrain === 'acid') {
    const depth = Math.min(1, (field.moisture - 0.56) * 12)
    ;[red, green, blue] = depth < 0.22 ? [113, 164, 57] : depth < 0.55 ? [69, 120, 45] : [34, 74, 48]
  } else if (terrain === 'crystal') {
    const core = 1 - crack / 0.055
    ;[red, green, blue] = core < 0.35 ? [25, 63, 76] : core < 0.7 ? [38, 107, 126] : [106, 178, 185]
  } else {
    const terrace = Math.floor(field.height * 12)
    const contour = (field.height * 12) % 1
    const light = radar ? 0.58 : Math.round(Math.max(0.5, Math.min(1.5,
      0.65 + terrace * 0.07 - slopeX * 9 - slopeY * 12 + (contour < 0.09 ? -0.25 : 0))) * 4) / 4
    red *= light; green *= light; blue *= light
    // Sparse mineral specks, rather than a full-resolution film of noise.
    if (!radar && grain > 0.97) { red += 12; green += 12; blue += 8 }
  }
  if (radar) { red *= 0.48; green *= 0.48; blue *= 0.48 }
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value / 4) * 4))
  return (channel(red) << 16) | (channel(green) << 8) | channel(blue)
}

export function colorCSS(rgb: number): string {
  return `#${rgb.toString(16).padStart(6, '0')}`
}

export function terrainGrain(seed: number, x: number, y: number): number {
  return unitAt(seed, x, y, 1151)
}
