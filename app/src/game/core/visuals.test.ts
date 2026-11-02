import { afterEach, describe, expect, it, vi } from 'vitest'
import { drawMatrix, PIXEL_MATRICES } from '../content/pixelMatrices'
import { DEFAULT_SETTINGS } from '../config'
import { CELL_SIZE, flowPoint, gridToWorld, worldToGrid } from '../math/grid'
import type { Structure } from '../types'
import { ChunkWorld } from '../world/ChunkWorld'
import { Camera } from './camera'
import { resolveLOD } from './lod'
import { Renderer } from './renderer'
import { Simulation } from './simulation'
import { conveyorMatrix, drawStructures } from './structureRenderer'
import { DEFAULT_VISUAL_PREFERENCES } from '../visualPreferences'
import { DIFFICULTIES } from '../content/difficulty'

function contextMock() {
  return { fillStyle: '', strokeStyle: '', fillRect: vi.fn(), strokeRect: vi.fn(),
    drawImage: vi.fn(), setTransform: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),strokeText:vi.fn(),setLineDash:vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

function structure(type: Structure['type'], q = 0): Structure {
  return { id: q + 2, type, q, r: 0, direction: 0, inputs: {}, output: null, recipe: null, progress: 0,
    createdTick: 0, workTicks: 14, sourceResource: null, migrationPath: [], migrationProgress: 0, migrationThreshold: 50,
    laneOutputs: [], prismOutputCount: 2, siloReleaseMultiple: 2 }
}

afterEach(() => vi.unstubAllGlobals())

describe('projeção ortogonal e fluxo', () => {
  it('mantém eixos independentes e seleção correta em coordenadas negativas', () => {
    for (let q = -12; q <= 12; q += 1) {
      for (let r = -12; r <= 12; r += 1) {
        const point = gridToWorld({ q, r })
        expect(point).toEqual({ x: q * CELL_SIZE, y: r * CELL_SIZE })
        expect(worldToGrid({ x: point.x + CELL_SIZE * 0.49, y: point.y - CELL_SIZE * 0.49 })).toEqual({ q, r })
      }
    }
  })

  it('movimenta itens pelas mesmas conexões ortogonais, sem atalhos diagonais', () => {
    const from = { x: 0, y: 0 }, to = { x: 64, y: -64 }
    expect(flowPoint(from, to, 0)).toEqual(from)
    expect(flowPoint(from, to, 0.5)).toEqual({ x: 32, y: -32 })
    expect(flowPoint(from, to, 1)).toEqual(to)
    let previous = from
    for (let i = 1; i <= 64; i += 1) {
      const next = flowPoint(from, to, i / 64)
      expect(next.x === previous.x || next.y === previous.y).toBe(true)
      expect(Math.abs(next.x - previous.x) + Math.abs(next.y - previous.y)).toBe(2)
      previous = next
    }
  })

  it('preserva a posição sob o cursor e aceita o zoom macroscópico', () => {
    const camera = new Camera()
    camera.resize(800, 600)
    const anchor = camera.screenToWorld(120, 170)
    camera.zoomAt(120, 170, 0.08)
    expect(camera.currentZoom).toBe(0.08)
    expect(camera.screenToWorld(120, 170).x).toBeCloseTo(anchor.x, 10)
    expect(camera.screenToWorld(120, 170).y).toBeCloseTo(anchor.y, 10)
  })
})

describe('matrizes e radar', () => {
  it('remove partículas decorativas e destaca máquinas com os recursos de acessibilidade ativos', () => {
    const simulation = new Simulation()
    simulation.restore(0, null, DEFAULT_SETTINGS, { structures: [structure('furnace')], inventory: {}, deposits: {}, nextStructureId: 5 })
    const camera = new Camera(); camera.resize(800, 600)
    const reduced = contextMock(), baseline = contextMock()
    const motion = { resource: 'rusted-copper' as const, from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, sourceLane: 0, targetLane: 0, startedAt: 0, durationMs: 300 }
    const preferences = { ...DEFAULT_VISUAL_PREFERENCES, reducedMotion: true, highContrast: true }
    drawStructures(reduced, simulation, camera, 1, 16, 100, [motion], 'matrix', preferences)
    drawStructures(baseline, simulation, camera, 1, 16, 100, [], 'matrix', preferences)
    expect(reduced.fillRect).toHaveBeenCalledTimes(vi.mocked(baseline.fillRect).mock.calls.length)
    expect(reduced.strokeRect).toHaveBeenCalledTimes(1)
  })
  it('possui planos numéricos 16×16 para todos os tipos de máquina', () => {
    for (const matrix of [...Object.values(PIXEL_MATRICES), conveyorMatrix(0, [3], 0), conveyorMatrix(1, [4], 2)]) {
      expect(matrix).toHaveLength(16)
      expect(matrix.every((row) => row.length === 16 && row.every((index) => Number.isInteger(index) && index >= 0 && index <= 9))).toBe(true)
    }
    const context = contextMock()
    drawMatrix(context, [[0,1,1,0],[2,2,2,0]], ['', '#000', '#fff'], 0, 0, 2)
    expect(context.fillRect).toHaveBeenCalledTimes(2)
    expect(context.fillRect).toHaveBeenNthCalledWith(1, 2, 0, 4, 2)
  })

  it('usa histerese ao entrar e sair do radar', () => {
    expect(resolveLOD(0.38, 'matrix')).toBe('radar')
    expect(resolveLOD(0.42, 'radar')).toBe('radar')
    expect(resolveLOD(0.42, 'matrix')).toBe('matrix')
    expect(resolveLOD(0.46, 'radar')).toBe('matrix')
  })

  it('substitui matrizes por nós e conexões, com custo independente de partículas', () => {
    const simulation = new Simulation()
    simulation.restore(0, null, DEFAULT_SETTINGS, { structures: [structure('golem'), structure('conveyor', 1), structure('gnome', 2)], inventory: {}, deposits: {}, nextStructureId: 5 })
    const camera = new Camera(); camera.resize(800, 600)
    const detail = contextMock(), radar = contextMock()
    drawStructures(detail, simulation, camera, 1, 0, 100, [], 'matrix')
    drawStructures(radar, simulation, camera, 1, 0, 100, [], 'radar')
    expect(vi.mocked(detail.fillRect).mock.calls.length).toBeGreaterThan(100)
    expect(radar.stroke).toHaveBeenCalledTimes(2)
    expect(vi.mocked(radar.fillRect).mock.calls.length).toBeLessThan(12)
    expect(radar.drawImage).not.toHaveBeenCalled()
    const withParticles = contextMock()
    drawStructures(withParticles, simulation, camera, 1, 0, 100,
      [{ resource: 'rusted-copper', from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, sourceLane: 0, targetLane: 0, startedAt: 0, durationMs: 300 }], 'radar')
    expect(withParticles.fillRect).toHaveBeenCalledTimes(vi.mocked(radar.fillRect).mock.calls.length)
  })
})

describe('cache de terreno e cobertura infinita', () => {
  it('publica frames completos a 0,40×, com máscara de contrato, ticks e hover externo sem regenerar terreno',()=>{
    const presentation=contextMock(),frameContext=contextMock()
    let created=0,frame:unknown
    vi.stubGlobal('document',{createElement:()=>{
      const surface={width:0,height:0,getContext:()=>created===1?frameContext:contextMock()};created++
      if(created===1) frame=surface
      return surface
    }})
    const renderer=new Renderer({getContext:()=>presentation} as unknown as HTMLCanvasElement)
    const camera=new Camera();camera.resize(1280,720);camera.restore({x:0,y:0,zoom:.4})
    const world=new ChunkWorld('SEM-FLICKER',1),sim=new Simulation()
    sim.configure({difficulty:DIFFICULTIES.artisan,mode:'campaign',bounds:6,freeMode:true,hasTech:()=>true,maxGnomes:5,allowed:new Set(['conveyor'])},world)
    sim.build(world.getCell(0,0),'conveyor',0)
    renderer.setInputMode('build')
    for(let i=0;i<30;i++) renderer.render(world,camera,sim,{q:10,r:10},1)
    expect(renderer.getCacheStats().pendingTiles).toBe(false)
    const count=created
    for(let tick=0;tick<15;tick++) {sim.step(world);renderer.render(world,camera,sim,{q:8+tick%3,r:-9},1)}
    expect(created).toBe(count)
    expect(presentation.fillRect).not.toHaveBeenCalled()
    expect(presentation.strokeRect).not.toHaveBeenCalled()
    expect(vi.mocked(presentation.drawImage).mock.calls.every(call=>{const args:readonly unknown[]=call;return args[0]===frame&&args.length===3})).toBe(true)
    expect(vi.mocked(frameContext.setLineDash).mock.calls).toContainEqual([[]])
    expect(vi.mocked(frameContext.fillRect).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(presentation.drawImage).mock.invocationCallOrder[0])
  })
  it('destaca a Forja inteira uma vez, mesmo com seleção e hover em células diferentes da mesma base', () => {
    const context = contextMock(),presentation=contextMock()
    let first=true
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => {if(first){first=false;return context}return contextMock()} }) })
    const renderer = new Renderer({ getContext: () => presentation } as unknown as HTMLCanvasElement)
    const simulation = new Simulation(), forge = structure('furnace')
    forge.size = 3
    simulation.restore(0,{q:0,r:0},DEFAULT_SETTINGS,{structures:[forge],inventory:{},deposits:{},nextStructureId:3})
    const camera = new Camera(); camera.resize(800,600)
    renderer.setInputMode('inspect')
    renderer.render(new ChunkWorld('SELECAO-GRANDE',1),camera,simulation,{q:2,r:2},1)
    expect(context.strokeRect).toHaveBeenCalledTimes(1)
    expect(vi.mocked(context.strokeRect).mock.calls[0][2]).toBe(CELL_SIZE * camera.currentZoom * 3 - 2)
    expect(presentation.fillRect).not.toHaveBeenCalled()
    expect(presentation.drawImage).toHaveBeenCalledTimes(1)
  })
  it('cobre a viewport em radar além dos chunks residentes e reutiliza cache em frames estáticos', () => {
    const context = contextMock()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => contextMock() }) })
    const renderer = new Renderer({ getContext: () => context } as unknown as HTMLCanvasElement)
    const world = new ChunkWorld('VISUAL-CACHE', 1)
    const camera = new Camera(); camera.resize(800, 600); camera.zoomAt(400, 300, 0.08)
    const simulation = new Simulation()
    for (let i = 0; i < 12; i += 1) renderer.render(world, camera, simulation, null, 2)
    const stats = renderer.getCacheStats()
    expect(stats.lod).toBe('radar')
    expect(stats.pendingTiles).toBe(false)
    expect(stats.drawnChunks).toBeGreaterThan(world.chunkCount)
    expect(stats.pixels).toBeLessThanOrEqual(4_000_000)
    const drawCalls = vi.mocked(context.drawImage).mock.calls.length
    renderer.render(world, camera, simulation, null, 2)
    expect(context.drawImage).toHaveBeenCalledTimes(drawCalls)
    expect(context.imageSmoothingEnabled).toBe(false)
    renderer.dispose()
    expect(renderer.getCacheStats().pixels).toBe(0)
  })
})
