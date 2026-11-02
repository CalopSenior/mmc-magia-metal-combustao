import { CHUNK_SIZE } from '../config'
import { hexKey } from '../math/hex'
import type { Axial, ChunkDistance, HexCell, OreLayout, WorldChunk } from '../types'
import { chunkCoordinate, createSeedHash, generateCell, generateChunk } from './generation'

export class ChunkWorld {
  private readonly chunkMap = new Map<string, WorldChunk>()
  private readonly cellMap = new Map<string, HexCell>()
  private readonly seedHash: number
  private distance: ChunkDistance
  private center: Axial = { q: 0, r: 0 }

  readonly seed: string
  readonly oreLayout:OreLayout
  readonly platforms:ReadonlySet<string>
  /** Hand-placed cells (contract deposits) that replace the procedural ones. */
  private readonly overrides: ReadonlyMap<string, HexCell>

  constructor(seed: string, distance: ChunkDistance, overrides: ReadonlyMap<string, HexCell> = new Map(), oreLayout:OreLayout='veins',platforms:ReadonlySet<string>=new Set()) {
    this.seed = seed
    this.oreLayout=oreLayout
    this.platforms=platforms
    this.seedHash = createSeedHash(seed)
    this.distance = distance
    this.overrides = overrides
    this.update({ q: 0, r: 0 })
  }

  update(center: Axial): void {
    const expectedChunks = (this.distance * 2 + 1) ** 2
    if (center.q === this.center.q && center.r === this.center.r && this.chunkMap.size === expectedChunks) return
    this.center = center
    const centerChunk = chunkCoordinate(center)
    const required = new Set<string>()
    for (let r = centerChunk.r - this.distance; r <= centerChunk.r + this.distance; r += 1) {
      for (let q = centerChunk.q - this.distance; q <= centerChunk.q + this.distance; q += 1) {
        const key = hexKey(q, r)
        required.add(key)
        if (!this.chunkMap.has(key)) this.addChunk(generateChunk(this.seedHash, q, r,this.oreLayout))
      }
    }
    for (const [key, chunk] of this.chunkMap) {
      if (!required.has(key)) this.removeChunk(key, chunk)
    }
  }

  setDistance(distance: ChunkDistance): void {
    this.distance = distance
    this.update(this.center)
  }

  getCell(q: number, r: number): HexCell {
    const key = hexKey(q, r)
    return this.cellMap.get(key) ?? this.overrides.get(key) ?? generateCell(this.seedHash, q, r,this.oreLayout)
  }

  get chunks(): IterableIterator<WorldChunk> {
    return this.chunkMap.values()
  }

  get chunkCount(): number {
    return this.chunkMap.size
  }

  get cellCount(): number {
    return this.cellMap.size
  }

  get chunkDistance(): ChunkDistance {
    return this.distance
  }

  get chunkSize(): number {
    return CHUNK_SIZE
  }

  private addChunk(chunk: WorldChunk): void {
    this.chunkMap.set(chunk.key, chunk)
    for (const cell of chunk.cells) this.cellMap.set(cell.key, this.overrides.get(cell.key) ?? cell)
  }

  private removeChunk(key: string, chunk: WorldChunk): void {
    this.chunkMap.delete(key)
    for (const cell of chunk.cells) this.cellMap.delete(cell.key)
  }
}
