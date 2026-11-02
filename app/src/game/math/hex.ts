import type { Axial } from '../types'

const SQRT_3 = Math.sqrt(3)

export interface Point {
  readonly x: number
  readonly y: number
}

export const HEX_DIRECTIONS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export const POINTY_HEX_CORNERS: readonly Point[] = Array.from({ length: 6 }, (_, index) => {
  const angle = (Math.PI / 180) * (60 * index - 30)
  return { x: Math.cos(angle), y: Math.sin(angle) }
})

export function hexKey(q: number, r: number): string {
  return `${q},${r}`
}

export function hexEquals(a: Axial | null, b: Axial | null): boolean {
  return a === b || (a !== null && b !== null && a.q === b.q && a.r === b.r)
}

export function hexDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

export function axialToPixel(hex: Axial, size: number): Point {
  return {
    x: size * SQRT_3 * (hex.q + hex.r / 2),
    y: size * 1.5 * hex.r,
  }
}

export function axialRound(q: number, r: number): Axial {
  const s = -q - r
  let roundedQ = Math.round(q)
  let roundedR = Math.round(r)
  const roundedS = Math.round(s)
  const qDiff = Math.abs(roundedQ - q)
  const rDiff = Math.abs(roundedR - r)
  const sDiff = Math.abs(roundedS - s)

  if (qDiff > rDiff && qDiff > sDiff) {
    roundedQ = -roundedR - roundedS
  } else if (rDiff > sDiff) {
    roundedR = -roundedQ - roundedS
  }

  return { q: roundedQ, r: roundedR }
}

export function pixelToAxial(point: Point, size: number): Axial {
  const x = point.x / size
  const y = point.y / size
  return axialRound((SQRT_3 / 3) * x - y / 3, (2 / 3) * y)
}
