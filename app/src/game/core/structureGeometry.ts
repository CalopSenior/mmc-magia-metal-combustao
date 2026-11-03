import { HEX_DIRECTIONS } from '../math/hex'
import { CELL_SIZE, gridToWorld } from '../math/grid'
import { bridgeInputDirection, bridgeOutputDirection, confluenceInputDirections, isDecor, prismOutputDirections } from '../content/structures'
import type { Axial, HexDirection, Structure } from '../types'

export interface Point { x: number; y: number }
export type StructureLookup = (q: number, r: number) => Structure | null

export function structureSize(structure: Pick<Structure, 'size'>): number { return structure.size ?? 1 }

export function footprintCells(cell: Axial, size: number): Axial[] {
  return Array.from({ length: size * size }, (_, index) => ({ q: cell.q + index % size, r: cell.r + Math.floor(index / size) }))
}

export function containsCell(structure: Structure, cell: Axial): boolean {
  const size = structureSize(structure)
  return cell.q >= structure.q && cell.r >= structure.r && cell.q < structure.q + size && cell.r < structure.r + size
}

export function structureCenter(structure: Pick<Structure, 'q' | 'r' | 'size'>): Point {
  const offset = (structureSize(structure) - 1) / 2
  return gridToWorld({ q: structure.q + offset, r: structure.r + offset })
}

export function outputDirections(structure: Structure): HexDirection[] {
  if (structure.type === 'prism') return prismOutputDirections(structure.direction, structure.prismOutputCount)
  if (structure.type === 'bridge') return [bridgeOutputDirection(structure.direction, 0), bridgeOutputDirection(structure.direction, 1)]
  return structure.type === 'gnome' || structure.type === 'energizer' || isDecor(structure.type) ? [] : [structure.direction]
}

export function portCell(structure: Pick<Structure, 'q' | 'r' | 'size'>, direction: HexDirection): Axial {
  const last = structureSize(structure) - 1
  const middle = Math.floor(last / 2)
  const offsets = [[last,middle], [last,0], [middle,0], [0,middle], [0,last], [middle,last]]
  return { q: structure.q + offsets[direction][0], r: structure.r + offsets[direction][1] }
}

export function outputTargetCell(structure: Structure, direction: HexDirection): Axial {
  const port = portCell(structure, direction), delta = HEX_DIRECTIONS[direction]
  return { q: port.q + delta.q, r: port.r + delta.r }
}

/** One canonical orthogonal polyline is shared by belts, radar and moving items. */
export function orthogonalPath(from: Point, to: Point): Point[] {
  const x = (from.x + to.x) / 2
  return [from, { x, y: from.y }, { x, y: to.y }, to].filter((point, index, points) =>
    index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y)
}

export function pointOnPath(path: readonly Point[], progress: number): Point {
  if (!path.length) return { x: 0, y: 0 }
  const lengths = path.slice(1).map((p, i) => Math.abs(p.x - path[i].x) + Math.abs(p.y - path[i].y))
  let distance = Math.max(0, Math.min(1, progress)) * lengths.reduce((sum, length) => sum + length, 0)
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index]
    if (distance <= length && length > 0) {
      const from = path[index], to = path[index + 1], t = distance / length
      return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
    }
    distance -= length
  }
  return path[path.length - 1]
}

export function targetLaneForSource(target: Structure, source: Structure, incoming?: HexDirection): number {
  if (target.id === source.id || target.type === 'golem' || target.type === 'collector' || isDecor(target.type)) return -1
  const candidates = incoming === undefined ? outputDirections(source) : [incoming]
  for (const direction of candidates) {
    const destination = outputTargetCell(source, direction)
    if (!containsCell(target, destination)) continue
    if (target.type === 'prism' || target.type === 'confluence' || target.type === 'bridge') {
      const inputs = target.type === 'prism' ? [((target.direction + 3) % 6) as HexDirection]
        : target.type === 'confluence' ? confluenceInputDirections(target.direction)
          : [bridgeInputDirection(target.direction, 0), bridgeInputDirection(target.direction, 1)]
      const lane = inputs.findIndex((port) => (port + 3) % 6 === direction)
      if (lane >= 0) return target.type === 'bridge' ? lane : 0
    } else return 0
  }
  return -1
}

export interface Connection {
  source: Structure; target: Structure; sourceLane: number; targetLane: number
  direction: HexDirection; path: Point[]
}

/** `withPath` false skips building the animation polyline (the simulation only needs the target). */
export function connectionForLane(source: Structure, lane: number, lookup: StructureLookup, withPath = true): Connection | null {
  const direction = outputDirections(source)[lane]
  if (direction === undefined) return null
  const destination = outputTargetCell(source, direction)
  const target = lookup(destination.q, destination.r)
  if (!target) return null
  const targetLane = targetLaneForSource(target, source, direction)
  if (targetLane < 0) return null
  if (!withPath) return { source, target, sourceLane: lane, targetLane, direction, path: [] }
  const exit = gridToWorld(portCell(source, direction)), entry = gridToWorld(destination)
  const path = [...orthogonalPath(structureCenter(source), exit), ...orthogonalPath(exit, entry).slice(1), ...orthogonalPath(entry, structureCenter(target)).slice(1)]
  return { source, target, sourceLane: lane, targetLane, direction, path }
}

export function portStub(structure: Structure, direction: HexDirection): Point[] {
  const exit = gridToWorld(portCell(structure, direction)), delta = HEX_DIRECTIONS[direction]
  const end = { x: exit.x + delta.q * CELL_SIZE / 2, y: exit.y + delta.r * CELL_SIZE / 2 }
  return [...orthogonalPath(structureCenter(structure), exit),
    ...(delta.q && delta.r ? [{ x: end.x, y: exit.y }, end] : [end])]
}
