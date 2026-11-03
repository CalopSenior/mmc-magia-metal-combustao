import { PAVING_MATRICES, drawMatrix, pavingPalette, structurePalette } from '../content/pixelMatrices'
import { structureMatrix } from '../content/orientedMatrices'
import { minerMatrix } from '../content/creatureSprites'
import { channelColors } from '../content/channels'
import { drawChannelTag } from './channelRenderer'
import { getResource, resourceGlyph } from '../content/resources'
import { drawResource } from '../content/resourceSprites'
import { GLYPH_MATRICES } from './overlayRenderer'
import { ALCHEMY_TICKS, ENERGIZER_CYCLE_TICKS, GOLEM_MIGRATION_TICKS_PER_CELL, RECIPES, STRUCTURES } from '../content/structures'
import { HEX_DIRECTIONS } from '../math/hex'
import { CELL_SIZE, flowPoint, gridToWorld } from '../math/grid'
import type { Structure, TransferMotion } from '../types'
import { energizerActive } from './machineRules'
import type { Camera } from './camera'
import type { RenderLOD } from './lod'
import type { Simulation } from './simulation'
import { DEFAULT_VISUAL_PREFERENCES, type VisualPreferences } from '../visualPreferences'
import { BeltRasterCache } from './beltRenderer'
import { connectionForLane, outputDirections, outputTargetCell, pointOnPath, portCell, structureCenter, structureSize, type Connection, type Point } from './structureGeometry'

export { conveyorMatrix } from './beltRenderer'

const beltCaches = new WeakMap<Simulation, BeltRasterCache>()

function movingPosition(structure: Structure): Point {
  const from = structureCenter(structure)
  if (structure.type !== 'golem' || !structure.migrationPath.length) return from
  return flowPoint(from, gridToWorld(structure.migrationPath[0]), structure.migrationProgress / GOLEM_MIGRATION_TICKS_PER_CELL)
}

/** Machines that are doing their work right now look it: lit forge, bubbling table, charged coil. */
function isWorking(structure: Structure): boolean {
  if (structure.type === 'alchemy') return structure.sourceResource !== null
  if (structure.type === 'energizer') return energizerActive(structure)
  return structure.recipe !== null
}

function screen(camera: Camera, point: Point) { return camera.worldToScreen(point.x, point.y) }
function visible(camera: Camera, point: Point, margin: number): boolean {
  return point.x >= -margin && point.y >= -margin && point.x <= camera.viewportWidth + margin && point.y <= camera.viewportHeight + margin
}

function drawRadar(context: CanvasRenderingContext2D, simulation: Simulation, camera: Camera): void {
  const half = CELL_SIZE * camera.currentZoom / 2
  context.lineCap = 'butt'; context.lineJoin = 'miter'
  for (const source of simulation.liveStructures) {
    if (!visible(camera, screen(camera, structureCenter(source)), half * (structureSize(source) + 2))) continue
    outputDirections(source).forEach((_, lane) => {
      const connection = connectionForLane(source, lane, (q, r) => simulation.structureAtCoords(q, r))
      if (!connection) return
      const stack = source.laneOutputs[lane] ?? source.output
      context.strokeStyle = stack ? getResource(stack.resource).color : STRUCTURES[source.type].color
      context.lineWidth = Math.max(1.5, half * 0.22)
      context.beginPath()
      connection.path.forEach((point, index) => {
        const p = screen(camera, point)
        if (index === 0) context.moveTo(p.x, p.y)
        else context.lineTo(p.x, p.y)
      })
      context.stroke()
      const arrow = screen(camera, pointOnPath(connection.path, 0.78))
      context.fillStyle = context.strokeStyle
      context.fillRect(arrow.x - 1.5, arrow.y - 1.5, 3, 3)
    })
  }
  for (const structure of simulation.liveStructures) {
    const point = screen(camera, movingPosition(structure)), footprint = structureSize(structure)
    if (!visible(camera, point, half * (footprint + 2))) continue
    const radius = Math.max(2, half * (structure.type === 'conveyor' ? 0.15 : footprint * 0.8))
    context.fillStyle = '#1b1714'
    context.fillRect(point.x - radius - 1, point.y - radius - 1, radius * 2 + 2, radius * 2 + 2)
    context.fillStyle = STRUCTURES[structure.type].color
    context.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2)
  }
}

const SOCKET = [[5,5,5],[5,1,5],[5,5,5]]
const CONVEYOR_ARROWS = [ [[6,0],[0,6],[6,0]], [[6,0],[0,6],[6,0]], [[0,6,0],[6,0,6]], [[0,6],[6,0],[0,6]], [[0,6],[6,0],[0,6]], [[6,0,6],[0,6,0]] ]

function drawItem(context: CanvasRenderingContext2D, resourceId: TransferMotion['resource'], point: Point, pixel: number, glyphs = false): void {
  drawResource(context,resourceId,point.x-pixel*3,point.y-pixel*3,pixel*6)
  if (!glyphs) return
  const glyph = GLYPH_MATRICES[resourceGlyph(resourceId)], small = pixel * 0.8
  drawMatrix(context, glyph.map((row) => row.map((value) => (value ? 1 : 0))), ['', '#fffbe8'], point.x - glyph[0].length * small / 2, point.y - glyph.length * small / 2, small)
}

export function drawStructures(
  context: CanvasRenderingContext2D, simulation: Simulation, camera: Camera,
  dpr: number, tick: number, timestamp: number, motions: readonly TransferMotion[], lod: RenderLOD = 'matrix', preferences: VisualPreferences = DEFAULT_VISUAL_PREFERENCES,
): void {
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (lod === 'radar') { drawRadar(context, simulation, camera); return }
  const cellSize = CELL_SIZE * camera.currentZoom, pixel = cellSize / 16
  const animation = preferences.reducedMotion ? 0 : Math.floor(tick / 3) % 4
  const view = camera.visibleCells(CELL_SIZE)
  const structures = simulation.visibleStructures(view.minQ, view.minR, view.maxQ, view.maxR)
  let belts = beltCaches.get(simulation)
  if (!belts) { belts = new BeltRasterCache(); beltCaches.set(simulation, belts) }
  belts.draw(context, simulation.liveStructures, (q,r) => simulation.structureAtCoords(q,r), camera, animation)
  const inputPorts = new Map<number, Connection[]>()
  for (const connection of belts.links) {
    const ports = inputPorts.get(connection.target.id) ?? []
    ports.push(connection); inputPorts.set(connection.target.id,ports)
  }
  const arriving = new Set<string>()
  for (const motion of preferences.reducedMotion ? [] : motions) {
    if (timestamp >= motion.startedAt + motion.durationMs) continue
    arriving.add(`${motion.to.q},${motion.to.r}`)
    const progress = (timestamp - motion.startedAt) / motion.durationMs
    const point = motion.path ? pointOnPath(motion.path, progress) : flowPoint(gridToWorld(motion.from), gridToWorld(motion.to), progress)
    const p = screen(camera, point)
    if (visible(camera, p, cellSize)) drawItem(context, motion.resource, p, pixel, preferences.colorblind)
  }
  for (const structure of structures) {
    const { x, y } = screen(camera, movingPosition(structure)), size = cellSize * structureSize(structure)
    if (!visible(camera, { x, y }, size)) continue
    if (structure.type === 'conveyor') {
      const arrow = CONVEYOR_ARROWS[structure.direction]
      drawMatrix(context,arrow,structurePalette('conveyor'),x-arrow[0].length*pixel/2,y-arrow.length*pixel/2,pixel)
      if (structure.output && !arriving.has(`${structure.q},${structure.r}`)) drawItem(context, structure.output.resource, { x, y }, pixel, preferences.colorblind)
      continue
    }
    const palette = structure.type === 'paving' ? pavingPalette(structure.tier ?? 1) : structurePalette(structure.type, isWorking(structure), animation)
    if (preferences.highContrast) {
      context.strokeStyle = '#fff0bc'; context.lineWidth = 2
      context.strokeRect(Math.round(x - size / 2), Math.round(y - size / 2), Math.round(size), Math.round(size))
    }
    if (structure.type === 'lantern') {
      // A soft halo under the flame; it breathes unless the player asked for less motion.
      const breathe = preferences.reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(tick / 9 + structure.q)
      const glow = context.createRadialGradient(x, y, 0, x, y, cellSize * 1.1 * breathe)
      glow.addColorStop(0, 'rgba(255, 196, 87, 0.42)'); glow.addColorStop(1, 'rgba(255, 196, 87, 0)')
      context.fillStyle = glow
      context.fillRect(x - cellSize * 1.2, y - cellSize * 1.2, cellSize * 2.4, cellSize * 2.4)
    }
    const matrix = structure.type==='golem'?minerMatrix(structure.direction,!preferences.reducedMotion&&structure.workTicks>0,animation)
      :structure.type==='paving'?PAVING_MATRICES[Math.min(2,Math.max(0,(structure.tier ?? 1)-1))]
      :structureMatrix(structure.type,structure.direction,structureSize(structure)>1)
    drawMatrix(context, matrix, palette, x - size / 2, y - size / 2, size / matrix.length)
    if (structure.type === 'golem' && structure.workTicks > 0&&!preferences.reducedMotion) drawMatrix(context, [[0,2,0],[4,0,2]], palette, x+pixel*4, y+pixel*5, pixel)
    if ((structure.type === 'furnace' || structure.type === 'chamber') && structure.recipe) {
      context.fillStyle = '#ffcc72'
      context.fillRect(x - size * 0.3, y + size / 2 - pixel * 3, size * 0.6 * structure.progress / RECIPES[structure.recipe].durationTicks, pixel)
    }
    if (structure.type === 'grandaltar') {
      // One bar per crucible in use: up to three fusions run side by side.
      context.fillStyle = '#ffcc72'
      ;(structure.jobs ?? []).forEach((job, index) => {
        context.fillRect(x - size * 0.3, y + size / 2 - pixel * (3 + index * 2), size * 0.6 * Math.min(1, job.progress / RECIPES[job.recipe].durationTicks), pixel)
      })
    }
    if (structure.type === 'golem' && structure.errand && !structure.migrationPath.length) {
      // Emptying the sack at the collection point: the bar drains as the load is set down.
      context.fillStyle = '#100e0b'
      context.fillRect(x - size * 0.34, y + size / 2 - pixel * 3.5, size * 0.68, pixel * 2)
      context.fillStyle = '#e9b969'
      context.fillRect(x - size * 0.32, y + size / 2 - pixel * 3, size * 0.64 * structure.errand.wait / Math.max(1, structure.errand.total), pixel)
    }
    if (structure.type === 'alchemy' && structure.sourceResource) {
      context.fillStyle = '#e6c4ff'
      context.fillRect(x - size * 0.3, y + size / 2 - pixel * 3, size * 0.6 * Math.min(1, structure.progress / ALCHEMY_TICKS), pixel)
    }
    if (structure.type === 'energizer' && energizerActive(structure)) {
      context.fillStyle = '#fff08a'
      context.fillRect(x - size * 0.3, y + size / 2 - pixel * 3, size * 0.6 * (structure.charge ?? 0) / ENERGIZER_CYCLE_TICKS, pixel)
    }
    outputDirections(structure).forEach((direction) => {
      if(structure.type==='golem'||structure.type==='gnome')return
      const cell = portCell(structure, direction), delta = HEX_DIRECTIONS[direction]
      const point = screen(camera, { x: cell.q * CELL_SIZE + delta.q * CELL_SIZE * 0.44, y: cell.r * CELL_SIZE + delta.r * CELL_SIZE * 0.44 })
      drawMatrix(context, SOCKET, palette, point.x - pixel * 1.5, point.y - pixel * 1.5, pixel)
    })
    if (structure.type !== 'golem' && structure.type !== 'gnome') for (const connection of inputPorts.get(structure.id) ?? []) {
      const entry = outputTargetCell(connection.source, connection.direction), delta = HEX_DIRECTIONS[connection.direction]
      const point = screen(camera, {x:entry.q * CELL_SIZE - delta.q * CELL_SIZE * 0.44, y:entry.r * CELL_SIZE - delta.r * CELL_SIZE * 0.44})
      drawMatrix(context,SOCKET,palette,point.x-pixel*1.5,point.y-pixel*1.5,pixel)
    }
    const stacks = structure.laneOutputs.length ? structure.laneOutputs : [structure.output]
    stacks.forEach((stack, lane) => {
      if (!stack) return
      context.fillStyle = getResource(stack.resource).color
      context.fillRect(x - size * 0.28 + lane * pixel * 2, y + size * 0.27, pixel * 1.5, pixel * 1.5)
    })
    if(structure.type==='depot'||structure.type==='portal')drawChannelTag(context,channelColors(structure),x-cellSize*.30,y+cellSize*.33,cellSize/40,preferences.colorblind)
  }
}
