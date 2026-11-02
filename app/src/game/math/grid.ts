import type { Axial } from '../types'

/** World units per square cell. q/r remain the persisted logical coordinates. */
export const CELL_SIZE = 64

export function gridToWorld(cell: Axial): { x: number; y: number } {
  return { x: cell.q * CELL_SIZE, y: cell.r * CELL_SIZE }
}

export function worldToGrid(point: { x: number; y: number }): Axial {
  return { q: Math.floor(point.x / CELL_SIZE + 0.5), r: Math.floor(point.y / CELL_SIZE + 0.5) }
}

/** Manhattan interpolation also routes the two legacy diagonal ports orthogonally. */
export function flowPoint(from: { x: number; y: number }, to: { x: number; y: number }, t: number): { x: number; y: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.abs(dx) + Math.abs(dy)
  const travelled = Math.max(0, Math.min(1, t)) * distance
  const halfX = Math.abs(dx) / 2
  if (travelled <= halfX) return { x: from.x + Math.sign(dx) * travelled, y: from.y }
  if (travelled <= halfX + Math.abs(dy)) return { x: from.x + dx / 2, y: from.y + Math.sign(dy) * (travelled - halfX) }
  return { x: from.x + dx / 2 + Math.sign(dx) * (travelled - halfX - Math.abs(dy)), y: to.y }
}
