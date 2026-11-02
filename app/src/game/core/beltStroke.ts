import { worldToGrid } from '../math/grid'
import type { Axial, HexDirection } from '../types'

export interface BeltStep extends Axial { direction: HexDirection }

/** Fill fast pointer gaps with cardinal neighbors. A reversed step erases a backtrack. */
export function planBeltStroke(points: readonly {x:number;y:number}[], fallback: HexDirection = 0): BeltStep[] {
  const cells: Axial[] = []
  const push = (cell: Axial) => {
    const last = cells.at(-1), previous = cells.at(-2)
    if (last?.q === cell.q && last.r === cell.r) return
    if (previous?.q === cell.q && previous.r === cell.r) cells.pop()
    else cells.push(cell)
  }
  for (const point of points) {
    const target = worldToGrid(point)
    if (!cells.length) { push(target); continue }
    let {q,r} = cells[cells.length-1]
    while ((q !== target.q || r !== target.r) && cells.length <= 512) {
      if (Math.abs(target.q-q) >= Math.abs(target.r-r) && q !== target.q) q += Math.sign(target.q-q)
      else r += Math.sign(target.r-r)
      push({q,r})
    }
    if (cells.length > 512) break
  }
  const steps = new Map<string,BeltStep>()
  for (let i=0;i<cells.length;i++) {
    const cell = cells[i], next = cells[i+1]
    const previous = cells[i-1]
    const dx = next ? next.q-cell.q : previous ? cell.q-previous.q : 0
    const dy = next ? next.r-cell.r : previous ? cell.r-previous.r : 0
    const direction: HexDirection = dx > 0 ? 0 : dx < 0 ? 3 : dy < 0 ? 2 : dy > 0 ? 5 : fallback
    const key = `${cell.q},${cell.r}`
    if (next || !steps.has(key)) steps.set(key,{...cell,direction})
  }
  return Array.from(steps.values())
}
