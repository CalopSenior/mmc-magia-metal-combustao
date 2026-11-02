import { drawMatrix, structurePalette, type PixelMatrix } from '../content/pixelMatrices'
import { CELL_SIZE } from '../math/grid'
import type { HexDirection, Structure } from '../types'
import type { Camera } from './camera'
import { connectionForLane, outputDirections, portStub, type Connection, type Point, type StructureLookup } from './structureGeometry'

const PIXEL = CELL_SIZE / 16
const HALF_WIDTH = 3.5
const TYPE_IDS = new Map<string, number>()

export interface BeltTile {
  q: number; r: number
  distances: Float32Array
  flowX: Int8Array
  flowY: Int8Array
  frames: Map<number, PixelMatrix>
}

/** Merge centerlines first. Rails are derived from their union, never overpainted by another branch. */
export function rasterizeBeltPaths(paths: readonly (readonly Point[])[]): BeltTile[] {
  const tiles = new Map<string, BeltTile>()
  for (const path of paths) for (let segment = 1; segment < path.length; segment += 1) {
    const from = { x: path[segment - 1].x / PIXEL, y: path[segment - 1].y / PIXEL }
    const to = { x: path[segment].x / PIXEL, y: path[segment].y / PIXEL }
    if (from.x === to.x && from.y === to.y) continue
    const left = Math.min(from.x, to.x), right = Math.max(from.x, to.x)
    const top = Math.min(from.y, to.y), bottom = Math.max(from.y, to.y)
    const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y)
    const priority = dx > 0 ? 4 : dx < 0 ? 3 : dy > 0 ? 2 : 1
    for (let y = Math.floor(top - HALF_WIDTH); y <= Math.ceil(bottom + HALF_WIDTH); y += 1) {
      for (let x = Math.floor(left - HALF_WIDTH); x <= Math.ceil(right + HALF_WIDTH); x += 1) {
        const px = x + 0.5, py = y + 0.5
        const distance = Math.max(Math.abs(px - Math.max(left, Math.min(right, px))), Math.abs(py - Math.max(top, Math.min(bottom, py))))
        if (distance > HALF_WIDTH) continue
        const q = Math.floor((x + 8) / 16), r = Math.floor((y + 8) / 16), key = `${q},${r}`
        let tile = tiles.get(key)
        if (!tile) {
          tile = { q, r, distances: new Float32Array(256).fill(Infinity), flowX:new Int8Array(256), flowY:new Int8Array(256), frames: new Map() }
          tiles.set(key, tile)
        }
        const index = (y - (r * 16 - 8)) * 16 + x - (q * 16 - 8)
        const oldPriority = tile.flowX[index] > 0 ? 4 : tile.flowX[index] < 0 ? 3 : tile.flowY[index] > 0 ? 2 : 1
        if (distance < tile.distances[index] || (distance === tile.distances[index] && priority > oldPriority)) {
          tile.distances[index] = distance; tile.flowX[index] = dx; tile.flowY[index] = dy
        }
      }
    }
  }
  return Array.from(tiles.values())
}

export function beltTileMatrix(tile: BeltTile, frame: number): PixelMatrix {
  const cached = tile.frames.get(frame)
  if (cached) return cached
  const matrix = Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => {
    const distance = tile.distances[y * 16 + x]
    if (!Number.isFinite(distance)) return 0
    if (distance >= 3) return 1
    if (distance >= 2) return 4
    const index = y * 16 + x
    const travel = (tile.q * 16 + x - 8) * tile.flowX[index] + (tile.r * 16 + y - 8) * tile.flowY[index]
    return (travel - frame) % 4 === 0 ? 3 : 9
  }))
  tile.frames.set(frame, matrix)
  return matrix
}

export class BeltRasterCache {
  private topology = ''
  private tiles: BeltTile[] = []
  private connections: Connection[] = []

  get links(): readonly Connection[] { return this.connections }

  draw(context: CanvasRenderingContext2D, structures: readonly Structure[], lookup: StructureLookup, camera: Camera, frame: number): void {
    let a = 0x811c9dc5, b = 0x01000193
    for (const s of structures) {
      const parts = [s.id, TYPE_IDS.get(s.type) ?? TYPE_IDS.set(s.type, TYPE_IDS.size + 1).get(s.type)!, s.q, s.r, s.size ?? 1, s.direction, s.prismOutputCount]
      for (const part of parts) { a = Math.imul(a ^ part, 0x01000193); b = Math.imul(b + part + 0x9e3779b9, 0x85ebca6b); b ^= b >>> 13 }
    }
    const topology = `${structures.length}:${a >>> 0}:${b >>> 0}`
    if (topology !== this.topology) {
      const incoming = new Set<number>(), paths: Point[][] = []
      this.connections = []
      for (const source of structures) outputDirections(source).forEach((_, lane) => {
        const connection = connectionForLane(source, lane, lookup)
        if (!connection) return
        incoming.add(connection.target.id)
        this.connections.push(connection)
        paths.push(connection.path)
      })
      for (const structure of structures) {
        if (structure.type !== 'conveyor') continue
        paths.push(portStub(structure, structure.direction))
        if (!incoming.has(structure.id)) paths.push(portStub(structure, ((structure.direction + 3) % 6) as HexDirection).reverse())
      }
      this.tiles = rasterizeBeltPaths(paths)
      this.topology = topology
    }
    const pixel = PIXEL * camera.currentZoom, size = CELL_SIZE * camera.currentZoom
    for (const tile of this.tiles) {
      const point = camera.worldToScreen(tile.q * CELL_SIZE - CELL_SIZE / 2, tile.r * CELL_SIZE - CELL_SIZE / 2)
      if (point.x > camera.viewportWidth || point.y > camera.viewportHeight || point.x + size < 0 || point.y + size < 0) continue
      drawMatrix(context, beltTileMatrix(tile, frame), structurePalette('conveyor'), point.x, point.y, pixel)
    }
  }
}

/** Local plan retained for previews/tests; actual networks also paint neighboring tiles at corners. */
export function conveyorMatrix(direction: HexDirection, inputs: readonly HexDirection[], frame: number): PixelMatrix {
  const structure = { q: 0, r: 0 } as Structure
  const incoming = inputs.length ? inputs : [((direction + 3) % 6) as HexDirection]
  const paths = [...incoming.map((port) => portStub(structure, port).reverse()), portStub(structure,direction)]
  const tile = rasterizeBeltPaths(paths).find((entry) => entry.q === 0 && entry.r === 0)!
  return beltTileMatrix(tile, frame)
}
