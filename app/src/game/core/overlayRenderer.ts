import { drawMatrix } from '../content/pixelMatrices'
import { resourceGlyph } from '../content/resources'
import { ENERGIZER_RADIUS, maxHpFor } from '../content/structures'
import { CELL_SIZE } from '../math/grid'
import type { Monster, Structure } from '../types'
import type { Camera } from './camera'
import { hpOf, isBroken } from './machineRules'
import { machineMath, type MathLine } from './mathVision'
import type { Simulation } from './simulation'
import { structureCenter, structureSize } from './structureGeometry'
import type { CarrierRenderer } from './carrierRenderer'

export interface OverlayOptions {
  boundsLabel?:string
  mathVision: boolean
  /** Whether equations show their answers (Aprendiz/Artesão) or only the question. */
  reveal: boolean
  flowLens: boolean
  forecast: boolean
  colorblind: boolean
  font: 'pixel' | 'readable'
  fontScale: number
}

export const DEFAULT_OVERLAY_OPTIONS: OverlayOptions = {
  mathVision: false, reveal: true, flowLens: false, forecast: false, colorblind: false, font: 'pixel', fontScale: 1,
}

const SLIME = [
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 2, 2, 2, 1, 0],
  [1, 2, 3, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 2, 1, 2, 1],
  [0, 1, 2, 2, 2, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
]
const ARMOR = [
  [1, 1, 0, 0, 0, 1, 1],
  [1, 3, 1, 1, 1, 3, 1],
  [0, 1, 2, 2, 2, 1, 0],
  [0, 1, 2, 4, 2, 1, 0],
  [0, 1, 2, 2, 2, 1, 0],
  [1, 3, 1, 1, 1, 3, 1],
  [1, 1, 0, 0, 0, 1, 1],
]
const GNOME = [[0, 1, 1, 0], [1, 2, 2, 1], [1, 3, 3, 1], [0, 1, 1, 0]]
const GLYPHS: Record<string, number[][]> = {
  circle: [[0, 1, 1, 0], [1, 1, 1, 1], [1, 1, 1, 1], [0, 1, 1, 0]],
  square: [[1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1]],
  diamond: [[0, 1, 1, 0], [1, 0, 0, 1], [1, 0, 0, 1], [0, 1, 1, 0]],
  triangle: [[0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [1, 1, 1, 1, 1]],
  hexagon: [[0, 1, 1, 0], [1, 1, 1, 1], [1, 1, 1, 1], [0, 1, 1, 0]],
  cross: [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
}

export const GLYPH_MATRICES = GLYPHS

function fontFor(options: OverlayOptions, size: number): string {
  const px = Math.max(9, Math.round(size * options.fontScale))
  return options.font === 'readable' ? `${px}px Segoe UI, sans-serif` : `${px}px "Pixelify Sans", monospace`
}

function drawLabel(context: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  context.lineWidth = 3
  context.strokeStyle = '#100e0be6'
  context.strokeText(text, x, y)
  context.fillStyle = color
  context.fillText(text, x, y)
}

const TONES: Record<MathLine['tone'], string> = { info: '#f4e7c4', good: '#b9ec91', bad: '#ff9d8a', warn: '#ffd37a' }

function drawBounds(context: CanvasRenderingContext2D, simulation: Simulation, camera: Camera, options:OverlayOptions): void {
  const radius = simulation.bounds
  if (radius === null) return
  const left = camera.worldToScreen((-radius - 0.5) * CELL_SIZE, (-radius - 0.5) * CELL_SIZE)
  const right = camera.worldToScreen((radius + 0.5) * CELL_SIZE, (radius + 0.5) * CELL_SIZE)
  const { viewportWidth: w, viewportHeight: h } = camera
  context.fillStyle = '#0a0d12d9'
  context.fillRect(0, 0, w, Math.max(0, left.y))
  context.fillRect(0, Math.min(h, right.y), w, Math.max(0, h - right.y))
  context.fillRect(0, Math.max(0, left.y), Math.max(0, left.x), Math.max(0, Math.min(h, right.y) - Math.max(0, left.y)))
  context.fillRect(Math.min(w, right.x), Math.max(0, left.y), Math.max(0, w - right.x), Math.max(0, Math.min(h, right.y) - Math.max(0, left.y)))
  context.strokeStyle = '#f2c876'
  context.lineWidth = 3
  context.setLineDash([10, 6])
  context.strokeRect(left.x, left.y, right.x - left.x, right.y - left.y)
  context.setLineDash([])
  if(right.y>=24 && right.y<h-24 && left.x<w && right.x>0) {
    context.font=fontFor(options,14);context.textAlign='left';context.textBaseline='bottom'
    drawLabel(context,options.boundsLabel??'Limite do contrato',Math.max(12,Math.min(w-180,left.x+12)),right.y-8,'#f2c876')
  }
}

function drawMonster(context: CanvasRenderingContext2D, monster: Monster, camera: Camera, options: OverlayOptions): void {
  const point = camera.worldToScreen(monster.x * CELL_SIZE, monster.y * CELL_SIZE)
  const corrupted = monster.kind === 'corrupted'
  const pixel = CELL_SIZE * camera.currentZoom * (corrupted ? 0.8 : 0.55) / 7
  const palette = corrupted ? ['', '#1b1714', '#6c6477', '#9d93ac', '#e0534a'] : ['', '#241a30', monster.fast ? '#d9534f' : '#8a5fc0', '#e0c5ff']
  const wobble = Math.sin(performance.now() / 180 + monster.id) * pixel * 0.6
  drawMatrix(context, corrupted ? ARMOR : SLIME, palette, point.x - pixel * 3.5, point.y - pixel * 3.5 + wobble, pixel)
  context.font = fontFor(options, pixel * 3.4)
  context.textAlign = 'center'; context.textBaseline = 'middle'
  drawLabel(context, corrupted ? `HP ${monster.hp}` : String(monster.hp), point.x, point.y + wobble + (corrupted ? pixel * 5 : 0), '#fff4d2')
}

function drawBadges(context: CanvasRenderingContext2D, structure: Structure, x: number, y: number, size: number, options: OverlayOptions, warning: string | undefined): void {
  const half = size / 2
  const unit = Math.max(4, size / 8)
  context.font = fontFor(options, Math.max(10, unit * 1.7))
  context.textAlign = 'left'; context.textBaseline = 'top'
  let cursor = x - half + 2
  const badge = (text: string, color: string) => {
    drawLabel(context, text, cursor, y - half + 2, color)
    cursor += context.measureText(text).width + 4
  }
  if ((structure.rune ?? 0) > 0) badge(`×${10 ** (structure.rune ?? 0)}`, '#ffd37a')
  if (structure.twin) badge('II', '#9fe8ff')
  if (structure.alchemist) badge('A', '#d9a8ff')
  if (warning) badge('!', '#ff9d3c')
  const crystals = Object.values(structure.crystals ?? {}).reduce((sum, value) => sum + (value ?? 0), 0)
  if (crystals > 0) {
    context.fillStyle = '#b983ff'
    for (let index = 0; index < Math.min(crystals, 6); index += 1) {
      context.fillRect(Math.round(x - half + 2 + index * unit * 0.8), Math.round(y + half - unit * 1.9), Math.round(unit * 0.55), Math.round(unit * 0.9))
    }
  }
}

export function drawOverlays(
  context: CanvasRenderingContext2D, simulation: Simulation, camera: Camera, options: OverlayOptions, radar: boolean, timestamp: number, carriers?:CarrierRenderer, reducedMotion=false,
): void {
  drawBounds(context, simulation, camera, options)
  if (!simulation.strict) return
  const cellSize = CELL_SIZE * camera.currentZoom
  const warnings = options.forecast ? simulation.forecast() : null
  for (const structure of simulation.structures) {
    const center = structureCenter(structure), p = camera.worldToScreen(center.x, center.y)
    const size = cellSize * structureSize(structure)
    if (p.x < -size || p.y < -size || p.x > camera.viewportWidth + size || p.y > camera.viewportHeight + size) continue
    const hp = hpOf(structure), max = maxHpFor(structure.type)
    if (radar) {
      if (isBroken(structure)) { context.fillStyle = '#ff4d3d'; context.fillRect(p.x - 3, p.y - 3, 6, 6) }
      continue
    }
    if (hp < max && structure.type !== 'conveyor' || isBroken(structure)) {
      const width = size * 0.8, height = Math.max(3, size / 14)
      context.fillStyle = '#100e0b'
      context.fillRect(Math.round(p.x - width / 2 - 1), Math.round(p.y + size / 2 - height - 3), Math.round(width + 2), Math.round(height + 2))
      const ratio = hp / max
      context.fillStyle = ratio > 0.55 ? '#7ccf6e' : ratio > 0.25 ? '#e5b347' : '#e0523f'
      context.fillRect(Math.round(p.x - width / 2), Math.round(p.y + size / 2 - height - 2), Math.round(width * ratio), Math.round(height))
    }
    if (isBroken(structure)) {
      context.strokeStyle = '#ff4d3d'; context.lineWidth = 3
      context.beginPath()
      context.moveTo(p.x - size * 0.3, p.y - size * 0.3); context.lineTo(p.x + size * 0.3, p.y + size * 0.3)
      context.moveTo(p.x + size * 0.3, p.y - size * 0.3); context.lineTo(p.x - size * 0.3, p.y + size * 0.3)
      context.stroke()
    }
    if (structure.type !== 'conveyor') drawBadges(context, structure, p.x, p.y, size, options, warnings?.get(structure.id))
    if (options.colorblind && structure.output) {
      const glyph = GLYPHS[resourceGlyph(structure.output.resource)]
      const pixel = Math.max(2, cellSize / 16)
      drawMatrix(context, glyph.map((row) => row.map((value) => (value ? 1 : 0))), ['', '#fff6d6'], p.x - glyph[0].length * pixel / 2, p.y - glyph.length * pixel / 2, pixel)
    }
    if (options.flowLens) {
      const rate = simulation.flowPerMinute(structure.id)
      if (rate !== null && rate > 0 && cellSize >= 28) {
        context.font = fontFor(options, Math.max(9, cellSize / 5)); context.textAlign = 'center'; context.textBaseline = 'middle'
        drawLabel(context, `${rate}/min`, p.x, p.y, '#9fe8ff')
      }
    }
    if (options.mathVision && cellSize >= 30 && structure.type !== 'gnome') {
      const lines = machineMath(structure, options.reveal)
      context.font = fontFor(options, Math.max(10, cellSize / 4.4)); context.textAlign = 'center'; context.textBaseline = 'bottom'
      const lineHeight = Math.max(11, cellSize / 4)
      lines.forEach((line, index) => drawLabel(context, line.text, p.x, p.y - size / 2 - 3 - (lines.length - 1 - index) * lineHeight, TONES[line.tone]))
    }
  }
  const selected = simulation.selected
  if (selected && !radar) {
    const picked = simulation.structureAt(selected)
    if (picked?.type === 'energizer') {
      // The reach of the boost: deposits inside the ring recover faster while the coil is charged.
      const c = structureCenter(picked), ring = ENERGIZER_RADIUS * CELL_SIZE * camera.currentZoom, at = camera.worldToScreen(c.x, c.y)
      context.save()
      context.fillStyle = 'rgba(232, 207, 84, 0.06)'; context.strokeStyle = 'rgba(255, 233, 130, 0.85)'; context.lineWidth = 2; context.setLineDash([10, 8])
      context.beginPath(); context.arc(at.x, at.y, ring, 0, Math.PI * 2); context.fill(); context.stroke()
      context.restore()
    }
  }
  carriers?.update(simulation.shipments,simulation.tick,id=>simulation.structureById(id))
  carriers?.draw(context,camera,simulation.tick,radar,reducedMotion,fontFor(options,13))
  if (radar) return
  for (const structure of simulation.structures) {
    if (structure.type !== 'gnomepost' || !structure.worker) continue
    const target = simulation.structureById(structure.worker.target)
    if (!target) continue
    const a = structureCenter(structure), b = structureCenter(target), t = Math.min(1, structure.worker.progress)
    const p = camera.worldToScreen(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
    const pixel = Math.max(2, cellSize / 14)
    drawMatrix(context, GNOME, ['', '#1b1714', '#6a9b4a', '#f0c48a'], p.x - pixel * 2, p.y - pixel * 2, pixel)
  }
  for (const monster of simulation.monsters) drawMonster(context, monster, camera, options)
  for (const shot of simulation.shots) {
    const a = camera.worldToScreen(shot.from.x * CELL_SIZE, shot.from.y * CELL_SIZE), b = camera.worldToScreen(shot.to.x * CELL_SIZE, shot.to.y * CELL_SIZE)
    context.strokeStyle = shot.good ? '#ffe08a' : '#8d8d99'; context.lineWidth = shot.good ? 3 : 2
    context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke()
  }
  void timestamp
}
