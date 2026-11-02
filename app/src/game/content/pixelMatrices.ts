import type { StructureType } from '../types'
import { minerMatrix } from './creatureSprites'

export type PixelMatrix = readonly (readonly number[])[]

// Orthographic plans: stone creatures, crucibles viewed from
// above, concentric altar rings. Zero is transparent; every other value is a
// palette index. These are source data, never image/sprite-sheet assets.
export const PIXEL_MATRICES: Record<Exclude<StructureType, 'conveyor'>, PixelMatrix> = {
  golem: minerMatrix(5),
  furnace: [],
  gnome: [
    [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,1,4,4,3,3,1,0,0,0,0,0],
    [0,0,0,0,1,4,3,3,3,3,2,1,0,0,0,0],
    [0,0,0,1,4,3,3,3,3,3,3,2,1,0,0,0],
    [0,0,1,4,3,3,3,3,3,3,3,3,2,1,0,0],
    [0,0,1,3,3,3,3,3,3,3,3,3,2,1,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,1,5,1,6,7,1,1,7,6,1,5,1,0,0],
    [0,1,5,6,1,5,6,6,6,6,5,1,6,5,1,0],
    [0,1,5,1,3,3,1,1,1,1,3,3,1,5,1,0],
    [0,1,2,1,3,4,3,3,3,3,4,3,1,2,1,0],
    [0,0,1,1,3,3,5,5,5,5,3,3,1,1,0,0],
    [0,0,0,0,1,2,3,3,3,3,2,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ],
  prism: [],
  confluence: [], silo: [], bridge: [],
  smelter: [], chamber: [], tower: [], gnomepost: [], depot: [], portal: [],
  collector: [], alchemy: [], energizer: [], grandaltar: [], paving: [], lantern: [],
}

function machinePlan(type: 'confluence' | 'silo' | 'bridge' | 'furnace' | 'prism' | 'smelter' | 'chamber'): PixelMatrix {
  return Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => {
    const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5)
    if (type === 'bridge') {
      if (dx < 3 || dy < 3) return x === 5 || x === 10 || y === 5 || y === 10 ? 2 : (y % 3 === 0 ? 5 : 9)
      return 0
    }
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > 7.6) return 0
    if (distance > 6.5) return 1
    if (type === 'silo') {
      if (distance > 5.4) return x % 4 === 0 ? 5 : 2
      return x % 3 === 0 ? 9 : (y < 5 ? 4 : 3)
    }
    if (distance > 4.6) return ((x + Math.floor(y / 3) * 2) % 4 === 0 || y % 4 === 0) ? 2 : (y < 7 ? 4 : 3)
    if (distance > 3.6) return 5
    if (type === 'furnace' || type === 'smelter' || type === 'chamber') return distance < 2 ? ((x + y) % 3 === 0 ? 8 : 7) : (x % 3 === 0 ? 7 : 6)
    // Carved rune, rather than a luminous screen or a solid neon cross.
    if (type === 'prism') return (dx < 1 && dy < 3) || (dy < 1 && dx < 3) || (dx === dy && dx < 2) ? 7 : 2
    return (x === 6 || y === 8 || (x === 9 && y < 9)) ? 6 : 2
  }))
}

PIXEL_MATRICES.confluence = machinePlan('confluence')
PIXEL_MATRICES.silo = machinePlan('silo')
PIXEL_MATRICES.bridge = machinePlan('bridge')
PIXEL_MATRICES.furnace = machinePlan('furnace')
PIXEL_MATRICES.prism = machinePlan('prism')
PIXEL_MATRICES.smelter = machinePlan('smelter')
PIXEL_MATRICES.chamber = machinePlan('chamber')

/** Square-section pieces drawn from above: a watchtower, a gnome post, a crate stack and a ring portal. */
function sketch(shape: (x: number, y: number, dx: number, dy: number, distance: number) => number): PixelMatrix {
  return Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => {
    const dx = x - 7.5, dy = y - 7.5
    return shape(x, y, dx, dy, Math.hypot(dx, dy))
  }))
}

PIXEL_MATRICES.tower = sketch((x, y, dx, dy, distance) => {
  const edge = Math.max(Math.abs(dx), Math.abs(dy))
  if (edge > 7) return 0
  if (edge > 6) return 1
  if (edge > 4.6) return (x + y) % 4 === 0 ? 2 : 4
  if (distance > 3.4) return 5
  if (distance > 2) return 2
  return distance < 1 ? 8 : Math.abs(dx) < 0.8 || Math.abs(dy) < 0.8 ? 7 : 6
})

PIXEL_MATRICES.gnomepost = sketch((x, y, dx, dy) => {
  const edge = Math.max(Math.abs(dx), Math.abs(dy))
  if (edge > 6.6) return 0
  if (edge > 5.6) return 1
  if (dy < 0) return (x + Math.floor(y / 2)) % 3 === 0 ? 5 : 6
  if (Math.abs(dx) < 1.6 && dy > 1.5) return 2
  return Math.abs(dx) < 0.8 ? 1 : (x + y) % 3 === 0 ? 4 : 3
})

PIXEL_MATRICES.depot = sketch((_x, _y, dx, dy) => {
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 7) return 0
  const cx = dx < 0 ? 0 : 1, cy = dy < 0 ? 0 : 1
  const lx = Math.abs(dx) - 0.5, ly = Math.abs(dy) - 0.5
  if (lx > 6 || ly > 6 || lx < 0.4 || ly < 0.4) return 1
  return (cx + cy) % 2 === 0 ? (lx % 3 < 1 || ly % 3 < 1 ? 5 : 4) : (lx % 3 < 1 || ly % 3 < 1 ? 2 : 3)
})

PIXEL_MATRICES.portal = sketch((x, y, dx, dy, distance) => {
  if (distance > 7.4) return 0
  if (distance > 6.4) return 1
  if (distance > 4.8) return (x + y) % 4 === 0 ? 2 : 4
  if (distance > 3.6) return 5
  const angle = Math.atan2(dy, dx) + distance * 0.9
  return Math.sin(angle * 2) > 0 ? 7 : distance < 1.4 ? 8 : 6
})

function forgePlan(): PixelMatrix {
  const matrix = Array.from({ length: 48 }, () => Array<number>(48).fill(0))
  const rect = (x: number, y: number, width: number, height: number, color: number) => {
    for (let row = y; row < y + height; row++) for (let col = x; col < x + width; col++) matrix[row][col] = color
  }
  // Broad mortared foundation, viewed directly from above.
  for (let y = 1; y < 47; y++) for (let x = 1; x < 47; x++) {
    if ((x < 4 || x > 43) && (y < 4 || y > 43)) continue
    const edge = Math.min(x, y, 47 - x, 47 - y)
    matrix[y][x] = edge < 2 ? 1 : edge < 4 ? (y < 24 ? 4 : 2) : y % 6 === 4 || (x + Math.floor(y / 6) * 4) % 9 === 0 ? 2 : 3
  }
  // Three masonry rings around the crucible and a bank of embers.
  for (let y = 5; y <= 31; y++) for (let x = 5; x <= 31; x++) {
    const radius = Math.max(Math.abs(x - 18), Math.abs(y - 18)) + Math.min(Math.abs(x - 18), Math.abs(y - 18)) * 0.4
    if (radius > 14) continue
    matrix[y][x] = radius > 12 ? 1 : radius > 10 ? ((x + y) % 5 === 0 ? 2 : 4)
      : radius > 8 ? 5 : radius > 6 ? 1 : radius > 4 ? 6 : ((x * 3 + y) % 7 < 2 ? 8 : 7)
  }
  // Copper flue and top-view bellows: boards, leather pleats and iron straps.
  rect(30,14,6,5,1); rect(30,15,6,3,6)
  rect(35,7,9,21,1); rect(36,8,7,19,9)
  for (let y = 10; y < 26; y += 3) rect(36,y,7,1,5)
  rect(38,8,1,19,6); rect(41,8,1,19,2)
  rect(37,6,5,2,4); rect(37,27,5,2,2)
  // Anvil and workbench, with a hammer and ingots on a wooden rack.
  rect(7,34,23,8,1); rect(8,35,21,6,9)
  rect(11,34,13,2,4); rect(14,36,9,3,2); rect(11,39,15,2,4)
  rect(27,33,2,7,5); rect(25,32,5,2,4)
  rect(34,33,10,10,1); rect(35,34,8,8,9)
  for (let y = 35; y < 42; y += 3) { rect(36,y,5,1,6); rect(36,y+1,5,1,5) }
  // Carved rune stones anchor each corner; no screens or modern casing.
  for (const [x,y] of [[4,4],[40,3],[3,40],[40,40]]) {
    rect(x,y,4,4,1); rect(x+1,y+1,2,2,4); rect(x+1,y,1,3,7)
  }
  return matrix
}

function siloPlan(): PixelMatrix {
  return Array.from({ length: 32 }, (_, y) => Array.from({ length: 32 }, (_, x) => {
    const radius = Math.hypot(x - 15.5, y - 15.5)
    if (radius > 15) return 0
    if (radius > 14) return 1
    if (radius > 12) return (x + y) % 6 === 0 ? 6 : 2
    if (y === 7 || y === 23) return 5
    if (Math.abs(x - 15.5) < 4 && Math.abs(y - 15.5) < 4) return x === 12 || y === 12 ? 6 : 9
    return x % 4 === 0 ? 9 : y < 13 ? 4 : 3
  }))
}

// Obras-Primas and decoration ----------------------------------------------------
/** Shapes are written in unit coordinates (-1 to 1) so one drawing serves a 16-, 32- or 80-pixel plan. */
function unitPlan(size: number, shape: (ux: number, uy: number, x: number, y: number, r: number) => number): PixelMatrix {
  return Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
    const ux = (x + 0.5) / size * 2 - 1, uy = (y + 0.5) / size * 2 - 1
    return shape(ux, uy, x, y, Math.hypot(ux, uy))
  }))
}

/** Cheap, stable pseudo-random value for speckles: the same cell always gets the same answer. */
function speckle(x: number, y: number, salt = 0): number {
  const h = Math.imul((x + salt) * 374761393 + y * 668265263, 1274126177)
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}

/** Ore bin: a wooden rim around a heap of nuggets. */
function collectorPlan(size: number): PixelMatrix {
  return unitPlan(size, (ux, uy, x, y, r) => {
    const edge = Math.max(Math.abs(ux), Math.abs(uy))
    if (edge > 0.94) return 0
    if (edge > 0.86) return 1
    if (edge > 0.7) return (Math.floor((ux + uy) * size / 3) % 2 === 0) ? 5 : 6
    if (edge > 0.64) return 1
    if (r < 0.46) {
      const nugget = speckle(Math.floor(x / 2), Math.floor(y / 2))
      return nugget > 0.82 ? 8 : nugget > 0.45 ? 7 : 6
    }
    return speckle(x, y, 3) > 0.7 ? 2 : 9
  })
}

/** Round alchemy table: runed ring around a bubbling violet cauldron. */
function alchemyPlan(size: number): PixelMatrix {
  return unitPlan(size, (ux, uy, x, y, r) => {
    if (r > 0.98) return 0
    if (r > 0.9) return 1
    const angle = Math.atan2(uy, ux) + Math.PI
    const segment = Math.floor(angle / (Math.PI * 2) * 12)
    if (r > 0.78) return segment % 2 === 0 ? 4 : 3
    if (r > 0.72) return 1
    if (r > 0.6) return segment % 2 === 0 ? 7 : 6
    if (r > 0.54) return 1
    // The cauldron: dark liquid, a lit surface toward the middle and a few bubbles.
    const bubble = speckle(Math.floor(x / (size / 12)), Math.floor(y / (size / 12)), 11)
    if (r < 0.2) return bubble > 0.5 ? 8 : 7
    return bubble > 0.82 ? 8 : r < 0.36 ? 6 : 5
  })
}

/** Brass coil on a square plinth with four electrodes: the energiser. */
function energizerPlan(size: number): PixelMatrix {
  return unitPlan(size, (ux, uy, _x, _y, r) => {
    const edge = Math.max(Math.abs(ux), Math.abs(uy))
    if (edge > 0.97) return 0
    if (edge > 0.9) return 1
    if (edge > 0.74) return (Math.abs(ux) > 0.74 && Math.abs(uy) > 0.74) ? 6 : (Math.floor((ux + uy) * size / 4) % 2 === 0 ? 4 : 3)
    // Four electrodes on the axes.
    const electrode = (Math.abs(ux) < 0.12 && Math.abs(uy) > 0.52 && Math.abs(uy) < 0.74) || (Math.abs(uy) < 0.12 && Math.abs(ux) > 0.52 && Math.abs(ux) < 0.74)
    if (electrode) return 7
    if (r > 0.56) return 2
    if (r > 0.5) return 1
    if (r > 0.38) return Math.floor(Math.atan2(uy, ux) * 6 / Math.PI + 12) % 2 === 0 ? 6 : 5
    if (r > 0.32) return 1
    if (r > 0.18) return 4
    return r < 0.1 ? 8 : 7
  })
}

/** The Greater Altar: stone terraces, four braziers, three crucibles around a white-hot heart. */
function grandAltarPlan(size: number): PixelMatrix {
  return unitPlan(size, (ux, uy, x, y, r) => {
    const ax = Math.abs(ux), ay = Math.abs(uy), edge = Math.max(ax, ay)
    if (edge > 0.98) return 0
    if (edge > 0.93) return 1
    if (ax > 0.7 && ay > 0.7) {
      // Corner brazier: a stone block holding a flame.
      const cr = Math.hypot(ax - 0.84, ay - 0.84)
      if (cr < 0.07) return 8
      if (cr < 0.12) return 7
      if (cr < 0.16) return 6
      return cr < 0.19 ? 1 : 4
    }
    if (edge > 0.64) {
      const block = (Math.floor(x / (size / 20)) + Math.floor(y / (size / 20))) % 2
      return Math.floor(x % (size / 20)) === 0 || Math.floor(y % (size / 20)) === 0 ? 2 : block ? 3 : 4
    }
    if (r > 0.62) return speckle(x, y, 5) > 0.86 ? 6 : 9
    if (r > 0.58) return 1
    if (r > 0.46) {
      const angle = Math.atan2(uy, ux) + Math.PI
      return Math.floor(angle / (Math.PI * 2) * 24) % 2 === 0 ? 6 : 5
    }
    // Three crucibles at 90°, 210° and 330° around the core.
    for (const turn of [Math.PI / 2, Math.PI * 7 / 6, Math.PI * 11 / 6]) {
      const d = Math.hypot(ux - Math.cos(turn) * 0.34, uy - Math.sin(turn) * 0.34)
      if (d < 0.09) return d < 0.05 ? 8 : 7
      if (d < 0.12) return 1
    }
    if (r > 0.2) return 1
    return r < 0.1 ? 8 : 7
  })
}

/** Floor tiles: 16 pixels, mortar on the right and bottom edges so a grid of them reads as paving. */
function pavingPlan(style: 1 | 2 | 3): PixelMatrix {
  return Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => {
    if (x === 15 || y === 15) return 2
    if (style === 1) {
      // Two offset slabs.
      const seam = y < 8 ? x === 7 : x === 0 || x === 15
      if (y === 7 || seam) return 2
      if (x === 0 || y === 0) return 4
      return speckle(x, y, 2) > 0.86 ? 4 : 3
    }
    if (style === 2) {
      if (x === 0 || y === 0) return 4
      const dx = Math.abs(x - 7), dy = Math.abs(y - 7)
      if (dx + dy === 5) return 7
      if (dx + dy === 2 && (dx === 0 || dy === 0)) return 7
      return dx + dy < 2 ? 7 : 3
    }
    const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5)
    if (x === 0 || y === 0) return 7
    const lattice = (Math.floor(x / 4) + Math.floor(y / 4)) % 2
    const diamond = dx % 4 + dy % 4
    return lattice ? (diamond < 3 ? 6 : 5) : (diamond < 3 ? 7 : 6)
  }))
}

/** Lantern seen from above: a chamfered plinth and a glowing lamp. */
function lanternPlan(): PixelMatrix {
  return unitPlan(16, (ux, uy, _x, _y, r) => {
    const edge = Math.max(Math.abs(ux), Math.abs(uy)), corner = Math.abs(ux) + Math.abs(uy)
    if (edge > 0.82 || corner > 1.5) return 0
    if (edge > 0.74 || corner > 1.36) return 1
    if (r > 0.6) return Math.abs(ux) < 0.1 || Math.abs(uy) < 0.1 ? 5 : 3
    if (r > 0.52) return 1
    if (r > 0.4) return 6
    if (r > 0.22) return 7
    return 8
  })
}

PIXEL_MATRICES.collector = collectorPlan(16)
PIXEL_MATRICES.alchemy = alchemyPlan(16)
PIXEL_MATRICES.energizer = energizerPlan(16)
PIXEL_MATRICES.grandaltar = grandAltarPlan(16)
PIXEL_MATRICES.paving = pavingPlan(1)
PIXEL_MATRICES.lantern = lanternPlan()

export const PAVING_MATRICES: readonly PixelMatrix[] = [pavingPlan(1), pavingPlan(2), pavingPlan(3)]

const FORGE_PLAN = forgePlan()
export const LARGE_MATRICES: Partial<Record<StructureType, PixelMatrix>> = {
  furnace: FORGE_PLAN, chamber: FORGE_PLAN, silo: siloPlan(),
  alchemy: alchemyPlan(32), energizer: energizerPlan(32), grandaltar: grandAltarPlan(80),
}

export const CONVEYOR_ICON: PixelMatrix = Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) =>
  y < 3 || y > 12 ? 0 : y === 3 || y === 12 ? 1 : y === 4 || y === 11 ? 4 : x % 4 === 0 ? 3 : 9))

export function structurePalette(type: StructureType, active = false, phase = 0): string[] {
  const palette = ['', '#1b1714', '#37352e', '#777363', '#b6b096', '#795030', '#b68b4e', '#ddad5c', '#fff0b7', '#503a29']
  if (type === 'golem') { palette[3] = '#6e8060'; palette[4] = '#adb68b'; palette[7] = '#e4bb72'; palette[9] = '#40573e' }
  if (type === 'gnome') { palette[3] = '#3d6140'; palette[4] = '#7f965d'; palette[6] = '#c5915d' }
  if (type === 'conveyor') { palette[3] = '#8c6842'; palette[4] = '#bd9864'; palette[9] = '#392d24' }
  if (type === 'smelter') { palette[3] = '#7a4a37'; palette[4] = '#c18a62'; palette[6] = '#d0642b'; palette[7] = active ? '#ffba4c' : '#e0823f'; palette[8] = '#ffe79a' }
  if (type === 'chamber') { palette[3] = '#3f6e72'; palette[4] = '#7ac7c4'; palette[5] = '#2f4d54'; palette[6] = '#3fb0a8'; palette[7] = active ? '#9ffff0' : '#59d6c8'; palette[8] = '#e5fffb' }
  if (type === 'tower') { palette[3] = '#6b5a4a'; palette[4] = '#b29f86'; palette[6] = '#d4684f'; palette[7] = '#ff9b6a' }
  if (type === 'gnomepost') { palette[3] = '#5f7a4a'; palette[4] = '#98b46f'; palette[5] = '#7a4e2d'; palette[6] = '#a8693a' }
  if (type === 'depot') { palette[3] = '#8a6a45'; palette[4] = '#c09a68'; palette[5] = '#a67c4a'; palette[2] = '#5d4529' }
  if (type === 'portal') { palette[2] = '#3b2f58'; palette[4] = '#8f78c8'; palette[5] = '#5b4a8d'; palette[6] = '#b58cf0'; palette[7] = '#e0c4ff'; palette[8] = '#ffffff' }
  if (type === 'furnace') {
    palette[3] = '#77513f'; palette[4] = '#b58a66'; palette[6] = '#b95225'
    palette[7] = active ? (phase % 2 ? '#ef9f38' : '#ffba4c') : '#cd7730'
    palette[8] = active ? '#ffe79a' : '#e8a14b'
  }
  if (type === 'silo') { palette[3] = '#947048'; palette[4] = '#c3a16c'; palette[9] = '#62482f' }
  if (type === 'collector') { palette[2] = '#4b3d2c'; palette[3] = '#6e6a58'; palette[5] = '#8a5a34'; palette[6] = '#a8794b'; palette[7] = '#d9a860'; palette[8] = '#fff0b7'; palette[9] = '#35291c' }
  if (type === 'alchemy') {
    palette[2] = '#2b2140'; palette[3] = '#5a4a7a'; palette[4] = '#9a86c8'; palette[5] = active ? (phase % 2 ? '#5b3d8a' : '#6d49a3') : '#3d3057'
    palette[6] = '#9b63d4'; palette[7] = active ? '#e6c4ff' : '#c58be8'; palette[8] = '#ffffff'; palette[9] = '#2b2140'
  }
  if (type === 'energizer') {
    palette[2] = '#3b3217'; palette[3] = '#8a7a3a'; palette[4] = '#d8c46a'; palette[5] = '#5e4f26'; palette[6] = '#e8cf54'
    palette[7] = active ? (phase % 2 ? '#fff6a8' : '#fff08a') : '#cfae38'; palette[8] = '#ffffff'; palette[9] = '#3b3217'
  }
  if (type === 'grandaltar') {
    palette[2] = '#3a2622'; palette[3] = '#6a4a3c'; palette[4] = '#a8806a'; palette[5] = '#4b3030'; palette[6] = active ? '#f06a2a' : '#c4501f'
    palette[7] = active ? (phase % 2 ? '#ffb347' : '#ff9a3c') : '#e0782e'; palette[8] = active ? '#fff3c0' : '#ffd58a'; palette[9] = '#2a1a18'
  }
  if (type === 'lantern') { palette[3] = '#6e6a58'; palette[4] = '#a9a38b'; palette[5] = '#555142'; palette[6] = '#d98b36'; palette[7] = active ? '#ffc457' : '#ffb347'; palette[8] = '#fff6c9' }
  return palette
}

/** Paving finishes are chosen per piece, so their palette is chosen by the tier too. */
export function pavingPalette(tier: number): string[] {
  const palette = ['', '#1b1714', '#4a4840', '#8f8a78', '#aaa593', '#795030', '#b68b4e', '#ddad5c', '#fff0b7', '#503a29']
  if (tier === 2) { palette[2] = '#35304f'; palette[3] = '#6f6aa8'; palette[4] = '#8f8bc8'; palette[7] = '#c9c0ff' }
  if (tier === 3) { palette[2] = '#5a4a22'; palette[5] = '#7d6428'; palette[6] = '#c6a64b'; palette[7] = '#f1dc8a'; palette[3] = '#a98a3a'; palette[4] = '#d8b95a' }
  return palette
}

export function drawMatrix(context: CanvasRenderingContext2D, matrix: PixelMatrix, palette: readonly string[], x: number, y: number, pixel: number): void {
  // Run-length batches reduce fill calls without introducing filtered bitmaps.
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix[row].length;) {
      const index = matrix[row][column]
      let end = column + 1
      while (end < matrix[row].length && matrix[row][end] === index) end += 1
      if (index !== 0) {
        context.fillStyle = palette[index]
        const left = Math.round(x + column * pixel), top = Math.round(y + row * pixel)
        context.fillRect(left, top, Math.round(x + end * pixel) - left, Math.round(y + (row + 1) * pixel) - top)
      }
      column = end
    }
  }
}
