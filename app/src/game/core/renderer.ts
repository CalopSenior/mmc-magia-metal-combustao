import { ORES } from '../content/ores'
import { drawMatrix, structurePalette } from '../content/pixelMatrices'
import { structureMatrix } from '../content/orientedMatrices'
import { STRUCTURES } from '../content/structures'
import { CHUNK_SIZE } from '../config'
import { CELL_SIZE, gridToWorld, worldToGrid } from '../math/grid'
import type { Axial, HexCell, HexDirection, ResourceId, Structure, StructureType, TransferMotion } from '../types'
import type { ChunkWorld } from '../world/ChunkWorld'
import { createSeedHash } from '../world/generation'
import { colorCSS, interpolateField, sampleVisualTerrainField, terrainColor, terrainGrain } from '../world/topography'
import type { Camera } from './camera'
import { resolveLOD, type RenderLOD } from './lod'
import type { Simulation } from './simulation'
import { drawStructures } from './structureRenderer'
import { DEFAULT_OVERLAY_OPTIONS, GLYPH_MATRICES, drawOverlays, type OverlayOptions } from './overlayRenderer'
import { resourceGlyph } from '../content/resources'
import { drawResource } from '../content/resourceSprites'
import { DEFAULT_VISUAL_PREFERENCES, type VisualPreferences } from '../visualPreferences'
import type { InputMode } from './input'
import { portCell, structureCenter, structureSize } from './structureGeometry'
import { HEX_DIRECTIONS } from '../math/hex'
import { CarrierRenderer } from './carrierRenderer'

const MAX_CACHE_PIXELS = 4_000_000
const TERRAIN_CHUNK_SIZE = CHUNK_SIZE * CELL_SIZE
const CRYSTAL_MATRIX = [[0,0,1,0,0],[0,1,3,1,0],[1,3,2,2,1],[0,1,2,1,0],[0,0,1,0,0]]
const RUIN_MATRIX = [[1,1,1,0,0,1,1,1],[1,2,1,0,0,1,2,1],[1,1,1,1,1,1,1,1],[0,0,1,2,2,1,0,0],[0,0,1,1,1,1,0,0]]

interface TerrainCache {
  canvas: HTMLCanvasElement
  /** Packed colors are the source of truth; the canvas is only a numeric raster cache. */
  colors: Uint32Array
  pixels: number
}

const digestIds = new Map<string, number>()
function textId(text: string | undefined): number {
  if (text === undefined) return 0
  let id = digestIds.get(text)
  if (id === undefined) { id = digestIds.size + 1; digestIds.set(text, id) }
  return id
}

/** A cheap numeric digest of everything about the structures that changes how they look, instead of building thousands of strings per frame. */
function structuresDigest(structures: Iterable<Structure>): string {
  let a = 0x811c9dc5, b = 0x01000193, count = 0
  for (const s of structures) {
    const parts = [s.id, s.q, s.r, s.size ?? 1, s.direction, textId(s.output?.resource), s.output?.amount ?? -1, s.prismOutputCount, s.siloReleaseMultiple, s.channelColors ? textId(s.channelColors.join(',')) : 0]
    for (const part of parts) { a = Math.imul(a ^ part, 0x01000193); b = Math.imul(b + part + 0x9e3779b9, 0x85ebca6b); b ^= b >>> 13 }
    count += 1
  }
  return `${count}:${a >>> 0}:${b >>> 0}`
}

export class Renderer {
  private readonly context: CanvasRenderingContext2D
  private readonly presentation: CanvasRenderingContext2D
  private readonly frame:HTMLCanvasElement
  private readonly chunkCache = new Map<string, TerrainCache>()
  private readonly detailCells = new Map<string, HexCell>()
  private transferMotions: TransferMotion[] = []
  private readonly carriers=new CarrierRenderer()
  private overlay: OverlayOptions = DEFAULT_OVERLAY_OPTIONS
  private cachePixels = 0
  private cacheSeed = ''
  private seedHash = 0
  private drawnChunks = 0
  private lastRenderKey = ''
  private pendingTiles = false
  private hasEmptyDeposits = false
  private lod: RenderLOD = 'matrix'
  private preferences = { ...DEFAULT_VISUAL_PREFERENCES }
  private inputMode: InputMode = 'pan'
  private buildType: StructureType = 'conveyor'
  private buildDirection: HexDirection = 0
  private beltStroke: readonly Axial[] = []

  setBeltStroke(cells:readonly Axial[]):void { this.beltStroke=cells;this.lastRenderKey='' }

  setVisualPreferences(preferences: VisualPreferences): void {
    this.preferences = { ...preferences }
    this.lastRenderKey = ''
  }

  setInputMode(mode: InputMode): void { this.inputMode = mode; this.lastRenderKey = '' }
  setBuildSelection(type: StructureType, direction: HexDirection): void { this.buildType = type; this.buildDirection = direction; this.lastRenderKey = '' }

  constructor(canvas: HTMLCanvasElement) {
    const presentation = canvas.getContext('2d', { alpha: false, desynchronized: false })
    this.frame=document.createElement('canvas')
    const context=this.frame.getContext('2d',{alpha:false})
    if (!context || !presentation) throw new Error('Canvas 2D não está disponível neste navegador.')
    this.context = context;this.presentation=presentation
  }

  dispose(): void { this.invalidate();this.frame.width=1;this.frame.height=1 }

  setOverlayOptions(options: OverlayOptions): void { this.overlay = options; this.lastRenderKey = '' }

  invalidate(): void {
    for (const entry of this.chunkCache.values()) { entry.canvas.width = 1; entry.canvas.height = 1 }
    this.chunkCache.clear()
    this.detailCells.clear()
    this.transferMotions.length = 0
    this.carriers.clear()
    this.cachePixels = 0
    this.lastRenderKey = ''
    this.hasEmptyDeposits = false
  }

  get renderLOD(): RenderLOD { return this.lod }

  getCacheStats(): { entries: number; pixels: number; drawnChunks: number; lod: RenderLOD; pendingTiles: boolean } {
    return { entries: this.chunkCache.size, pixels: this.cachePixels, drawnChunks: this.drawnChunks, lod: this.lod, pendingTiles: this.pendingTiles }
  }

  render(world: ChunkWorld, camera: Camera, simulation: Simulation, hovered: Axial | null, dpr: number): void {
    const width=Math.max(1,Math.round(camera.viewportWidth*dpr)),height=Math.max(1,Math.round(camera.viewportHeight*dpr))
    if(this.frame.width!==width||this.frame.height!==height) {
      this.frame.width=width;this.frame.height=height;this.lastRenderKey=''
    }
    if (this.cacheSeed !== world.seed) {
      this.invalidate(); this.cacheSeed = world.seed; this.seedHash = createSeedHash(world.seed)
    }
    this.lod = resolveLOD(camera.currentZoom, this.lod)
    const radar = this.lod === 'radar'
    const timestamp = performance.now()
    if (simulation.hasPendingTransferMotions) {
      const pending = simulation.drainTransferMotions()
      if (!radar) this.transferMotions.push(...pending)
    }
    this.transferMotions = radar || this.preferences.reducedMotion ? [] : this.transferMotions.filter((motion) => timestamp < motion.startedAt + motion.durationMs)
    const selected = simulation.selected
    // Simulation tick invalidates state changes even while paused after rotate/build.
    const view = camera.visibleCells(CELL_SIZE)
    const structureKey = structuresDigest(simulation.visibleStructures(view.minQ, view.minR, view.maxQ, view.maxR))
    const key = [world.seed, camera.viewX, camera.viewY, camera.currentZoom, camera.viewportWidth, camera.viewportHeight, dpr,
      simulation.structureCount || this.hasEmptyDeposits ? simulation.tick : 0, structureKey, selected?.q, selected?.r, hovered?.q, hovered?.r, simulation.currentSettings.showCoordinates,
      this.lod, this.transferMotions.length ? Math.floor(timestamp / 33) : 0, JSON.stringify(this.overlay), simulation.bounds, simulation.monsterCount].join('|')
    if (!this.pendingTiles && key === this.lastRenderKey) return
    this.lastRenderKey = key
    const context = this.context
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.imageSmoothingEnabled = false
    context.globalAlpha = 1
    context.fillStyle = radar ? '#101620' : '#222633'
    context.fillRect(0, 0, camera.viewportWidth, camera.viewportHeight)
    this.drawTerrain(camera)
    if (!radar) this.drawCellDetails(world, camera, simulation)
    if (!radar) this.drawGrid(camera)
    drawStructures(context, simulation, camera, dpr, simulation.tick, timestamp, this.transferMotions, this.lod, this.preferences)
    drawOverlays(context, simulation, camera, this.overlay, radar, timestamp,this.carriers,this.preferences.reducedMotion)
    if (this.inputMode === 'build' && this.beltStroke.length) {
      context.strokeStyle='#ffdc8a';context.lineWidth=2;context.fillStyle='#ffdc8a22'
      const size=CELL_SIZE*camera.currentZoom
      for(const cell of this.beltStroke) {
        const point=camera.worldToScreen(cell.q*CELL_SIZE,cell.r*CELL_SIZE)
        context.fillRect(point.x-size/2,point.y-size/2,size,size)
        context.strokeRect(point.x-size/2+1,point.y-size/2+1,size-2,size-2)
      }
    } else if (this.inputMode === 'build') this.drawBuildPreview(world, camera, simulation, hovered)
    if (selected) this.drawCellOverlay(selected, camera, '#f2c876', true, simulation)
    const selectedStructure = selected ? simulation.structureAt(selected) : null
    const sameTarget = selected && hovered && ((hovered.q === selected.q && hovered.r === selected.r) || (selectedStructure && selectedStructure.id === simulation.structureAt(hovered)?.id))
    if (hovered && this.inputMode !== 'build' && !sameTarget) this.drawCellOverlay(hovered, camera, '#c6ebe0', false, simulation)
    // Only publish a complete frame. In particular, the contract mask must already
    // cover the inaccessible terrain before any pixels reach the visible canvas.
    this.presentation.setTransform(1,0,0,1,0,0)
    this.presentation.globalAlpha=1;this.presentation.imageSmoothingEnabled=false
    this.presentation.drawImage(this.frame,0,0)
  }

  private drawTerrain(camera: Camera): void {
    const radar = this.lod === 'radar'
    const span = TERRAIN_CHUNK_SIZE * (radar ? 4 : 1)
    const topLeft = camera.screenToWorld(0, 0)
    const bottomRight = camera.screenToWorld(camera.viewportWidth, camera.viewportHeight)
    const tiles: { q: number; r: number; distance: number }[] = []
    for (let r = Math.floor(topLeft.y / span); r <= Math.floor(bottomRight.y / span); r += 1) {
      for (let q = Math.floor(topLeft.x / span); q <= Math.floor(bottomRight.x / span); q += 1) {
        tiles.push({ q, r, distance: Math.abs((q + 0.5) * span - camera.viewX) + Math.abs((r + 0.5) * span - camera.viewY) })
      }
    }
    tiles.sort((a, b) => a.distance - b.distance)
    let budget = radar ? 8 : 3
    this.pendingTiles = false
    this.drawnChunks = 0
    for (const tile of tiles) {
      const key = `${this.lod}:${tile.q},${tile.r}`
      let entry = this.chunkCache.get(key)
      if (!entry) {
        if (budget-- <= 0) { this.pendingTiles = true; continue }
        entry = this.createTerrainTile(tile.q, tile.r, span, radar)
        this.addCacheEntry(key, entry)
      } else { this.chunkCache.delete(key); this.chunkCache.set(key, entry) }
      const point = camera.worldToScreen(tile.q * span, tile.r * span)
      // Shared rounded boundaries prevent hairline gaps at fractional zoom/DPR.
      const end = camera.worldToScreen((tile.q + 1) * span, (tile.r + 1) * span)
      this.context.drawImage(entry.canvas, Math.floor(point.x), Math.floor(point.y), Math.ceil(end.x) - Math.floor(point.x), Math.ceil(end.y) - Math.floor(point.y))
      this.drawnChunks += 1
    }
  }

  private createTerrainTile(q: number, r: number, span: number, radar: boolean): TerrainCache {
    const resolution = radar ? 16 : 64
    const lattice = 16
    const fields = Array.from({ length: (lattice + 1) ** 2 }, (_, index) => sampleVisualTerrainField(this.seedHash,
      (q * span + index % (lattice + 1) * span / lattice) / CELL_SIZE,
      (r * span + Math.floor(index / (lattice + 1)) * span / lattice) / CELL_SIZE))
    const colors = new Uint32Array(resolution * resolution)
    const canvas = document.createElement('canvas')
    canvas.width = resolution; canvas.height = resolution
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível criar o cache de terreno.')
    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const fx = (x + 0.5) / resolution * lattice, fy = (y + 0.5) / resolution * lattice
        const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy
        const a = fields[iy * (lattice + 1) + ix], b = fields[iy * (lattice + 1) + ix + 1]
        const c = fields[(iy + 1) * (lattice + 1) + ix], d = fields[(iy + 1) * (lattice + 1) + ix + 1]
        const field = interpolateField(a, b, c, d, tx, ty)
        const slopeX = ((b.height - a.height) * (1 - ty) + (d.height - c.height) * ty)
        const slopeY = ((c.height - a.height) * (1 - tx) + (d.height - b.height) * tx)
        const color = terrainColor(field, slopeX, slopeY, radar ? 0.5 : terrainGrain(this.seedHash, q * resolution + x, r * resolution + y), radar)
        colors[y * resolution + x] = color
        context.fillStyle = colorCSS(color)
        context.fillRect(x, y, 1, 1)
      }
    }
    return { canvas, colors, pixels: resolution * resolution }
  }

  private drawCellDetails(world: ChunkWorld, camera: Camera, simulation: Simulation): void {
    const context = this.context
    const size = CELL_SIZE * camera.currentZoom
    this.hasEmptyDeposits = false
    // Query the visible cells directly, so distance=1 never exposes an empty
    // border. These lookups do not expand the simulation's resident chunk set.
    const start = camera.screenToWorld(0, 0), end = camera.screenToWorld(camera.viewportWidth, camera.viewportHeight)
    for (let r = Math.floor(start.y / CELL_SIZE - 0.5); r <= Math.ceil(end.y / CELL_SIZE + 0.5); r += 1) {
      for (let q = Math.floor(start.x / CELL_SIZE - 0.5); q <= Math.ceil(end.x / CELL_SIZE + 0.5); q += 1) {
        const { x, y } = camera.worldToScreen(q * CELL_SIZE, r * CELL_SIZE)
        if (x < -size / 2 || y < -size / 2 || x > camera.viewportWidth + size / 2 || y > camera.viewportHeight + size / 2) continue
        const key = `${q},${r}`
        let cell = this.detailCells.get(key)
        if (!cell) {
          cell = world.getCell(q, r)
          if (this.detailCells.size >= 8192) this.detailCells.delete(this.detailCells.keys().next().value!)
          this.detailCells.set(key, cell)
        }
        if(world.platforms.has(key)) {
          const pixel=size/16
          if(cell.terrain==='magma') {
            // The pool under the Altar de Fusão Maior: dark crust, glowing lava and a few bright sparks.
            context.fillStyle='#3a120c';context.fillRect(x-size/2,y-size/2,size,size)
            context.fillStyle=((q+r)%2===0)?'#9a3517':'#b3411c'
            context.fillRect(x-size/2+pixel,y-size/2+pixel,size-pixel*2,size-pixel*2)
            context.fillStyle='#ff9a3c'
            for(let spark=0;spark<3;spark+=1) context.fillRect(x-size/2+(2+(q*7+r*13+spark*5+ (spark*q)%4)%11)*pixel,y-size/2+(2+(r*5+q*3+spark*7)%11)*pixel,pixel*2,pixel)
          } else {
            context.fillStyle='#20251e';context.fillRect(x-size/2,y-size/2,size,size)
            context.fillStyle=((q+r)%3===0)?'#494536':'#3c3d30'
            context.fillRect(x-size/2+pixel,y-size/2+pixel,size-pixel*2,size-pixel*2)
            context.fillStyle='#5b5540';context.fillRect(x-size/2+pixel,y-size/2+pixel,size-pixel*2,pixel)
          }
        }
        if (cell.terrain === 'ruin' || cell.terrain === 'crystal' || cell.terrain === 'ether') {
          const ruin = cell.terrain === 'ruin'
          const matrix = ruin ? RUIN_MATRIX : CRYSTAL_MATRIX
          const pixel = size / 24
          drawMatrix(context, matrix, ['', '#171d2b', ruin ? '#4f514e' : '#246577', ruin ? '#7d7b67' : '#70dbdf'], x - matrix[0].length * pixel / 2, y - matrix.length * pixel / 2, pixel)
        }
        const remaining = cell.deposit ? (simulation.getDepositRemaining(cell) ?? 0) : 0
        if (cell.deposit && remaining <= 0) this.hasEmptyDeposits = true
        if (cell.deposit && remaining > 0) {
          const ore = ORES[cell.deposit.ore]
          const pixel = size / 18
          drawResource(context,ore.id,x-size*.3,y-size*.3,size*.6)
          if (this.preferences.colorblind) {
            const glyph = GLYPH_MATRICES[resourceGlyph(ore.id)], small = pixel * 0.9
            drawMatrix(context, glyph.map((row) => row.map((value) => (value ? 1 : 0))), ['', '#fffbe8'], x - glyph[0].length * small / 2, y - glyph.length * small / 2, small)
          }
        }
        if (simulation.currentSettings.showCoordinates && size >= 38) {
          context.font = '10px ui-monospace, monospace'
          context.textAlign = 'center'; context.textBaseline = 'bottom'
          context.fillStyle = '#aeb7bb'
          context.fillText(cell.key, x, y + size * 0.45)
        }
      }
    }
  }

  private drawGrid(camera: Camera): void {
    const context = this.context
    const strength = this.preferences.grid
    const building = this.inputMode === 'build' || this.inputMode === 'demolish'
    if (strength !== 'off' || building) {
      const strong = strength === 'strong' || this.preferences.highContrast || building
      const start = camera.screenToWorld(0, 0), end = camera.screenToWorld(camera.viewportWidth, camera.viewportHeight)
      // A dark under-stroke remains legible on magma, pale stone and acid alike.
      context.lineWidth = strong ? 3 : 2
      context.strokeStyle = strong ? '#100f13bb' : '#100f1340'
      context.beginPath()
      for (let q = Math.floor(start.x / CELL_SIZE); q <= Math.ceil(end.x / CELL_SIZE); q += 1) {
        const x = camera.worldToScreen((q + 0.5) * CELL_SIZE, 0).x
        context.moveTo(x, 0); context.lineTo(x, camera.viewportHeight)
      }
      for (let r = Math.floor(start.y / CELL_SIZE); r <= Math.ceil(end.y / CELL_SIZE); r += 1) {
        const y = camera.worldToScreen(0, (r + 0.5) * CELL_SIZE).y
        context.moveTo(0, y); context.lineTo(camera.viewportWidth, y)
      }
      context.stroke()
      context.lineWidth = 1
      context.strokeStyle = strong ? '#f7dfaa99' : '#decba033'
      context.stroke()
    }
  }

  private drawCellOverlay(cell: Axial, camera: Camera, color: string, selected: boolean, simulation: Simulation): void {
    const structure = simulation.structureAt(cell)
    const world = structure ? structureCenter(structure) : gridToWorld(cell)
    const { x, y } = camera.worldToScreen(world.x, world.y)
    const size = CELL_SIZE * camera.currentZoom * (structure ? structureSize(structure) : 1)
    if (x < -size || y < -size || x > camera.viewportWidth + size || y > camera.viewportHeight + size) return
    this.context.strokeStyle = color
    this.context.lineWidth = selected || this.preferences.highContrast ? 3 : 2
    this.context.strokeRect(x - size / 2 + 1, y - size / 2 + 1, size - 2, size - 2)
    if (selected) {
      this.context.fillStyle = '#fff1c7'
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
        this.context.fillRect(Math.round(x + dx * (size / 2 - 3) - 2), Math.round(y + dy * (size / 2 - 3) - 2), 4, 4)
      }
    }
  }

  private drawBuildPreview(world: ChunkWorld, camera: Camera, simulation: Simulation, hovered: Axial | null): void {
    const cell = hovered ?? worldToGrid({ x: camera.viewX, y: camera.viewY })
    const existing = simulation.structureAt(cell)
    if (existing) { this.drawCellOverlay(cell, camera, '#f2c876', false, simulation); return }
    const definition = STRUCTURES[this.buildType], size = definition.size
    const inventory = simulation.inventory
    const resources = Object.entries(definition.cost).every(([id, amount]) => (inventory[id as ResourceId] ?? 0) >= (amount ?? 0))
    const deposit = world.getCell(cell.q, cell.r)
    const valid = !simulation.placementError(cell, this.buildType) && resources && (this.buildType !== 'golem' || (deposit.deposit && (simulation.getDepositRemaining(deposit) ?? 0) >= 1))
    const center = structureCenter({ ...cell, size }), point = camera.worldToScreen(center.x, center.y)
    const width = size * CELL_SIZE * camera.currentZoom, pixel = CELL_SIZE * camera.currentZoom / 16
    const context = this.context, color = valid ? '#b9d784' : '#f29a78'
    if (this.lod === 'matrix' && this.buildType !== 'conveyor') {
      const matrix = structureMatrix(this.buildType,this.buildDirection)
      context.globalAlpha = 0.38
      drawMatrix(context, matrix, structurePalette(this.buildType), point.x - width / 2, point.y - width / 2, width / matrix.length)
    }
    context.globalAlpha = 0.12; context.fillStyle = color
    context.fillRect(point.x - width / 2, point.y - width / 2, width, width)
    context.globalAlpha = 1; context.strokeStyle = color; context.lineWidth = 2
    context.strokeRect(point.x - width / 2, point.y - width / 2, width, width)
    const port = portCell({ ...cell, size }, this.buildDirection), delta = HEX_DIRECTIONS[this.buildDirection]
    const p = camera.worldToScreen(port.q * CELL_SIZE + delta.q * CELL_SIZE * 0.44, port.r * CELL_SIZE + delta.r * CELL_SIZE * 0.44)
    context.fillStyle = '#ffe0a1'; context.fillRect(p.x - pixel * 1.5, p.y - pixel * 1.5, pixel * 3, pixel * 3)
    context.font = this.preferences.font === 'readable' ? '13px Segoe UI, sans-serif' : '16px "Pixelify Sans", monospace'
    context.textAlign = 'left'; context.textBaseline = 'bottom'; context.fillStyle = color
    context.fillText(`${size}×${size} · ${valid ? 'Área livre' : resources ? 'Área indisponível' : 'Faltam materiais'}`, point.x - width / 2, point.y - width / 2 - 6)
  }

  private addCacheEntry(key: string, entry: TerrainCache): void {
    while (this.cachePixels + entry.pixels > MAX_CACHE_PIXELS && this.chunkCache.size) {
      const oldestKey = this.chunkCache.keys().next().value!
      const oldest = this.chunkCache.get(oldestKey)!
      this.cachePixels -= oldest.pixels
      oldest.canvas.width = 1; oldest.canvas.height = 1
      this.chunkCache.delete(oldestKey)
    }
    this.chunkCache.set(key, entry); this.cachePixels += entry.pixels
  }
}
