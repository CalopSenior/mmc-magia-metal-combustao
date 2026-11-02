import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../config'
import { LARGE_MATRICES } from '../content/pixelMatrices'
import { createSeedHash, generateCell } from '../world/generation'
import { hexKey } from '../math/hex'
import type { HexDirection, Structure } from '../types'
import { beltTileMatrix, rasterizeBeltPaths } from './beltRenderer'
import { Simulation } from './simulation'
import { connectionForLane, containsCell, footprintCells, orthogonalPath, outputTargetCell, pointOnPath, structureCenter } from './structureGeometry'

const seed = createSeedHash('MULTI-TILE-TEST')
const cell = (q: number, r: number) => generateCell(seed, q, r)
const world = { getCell: cell }

function structure(type: Structure['type'], q: number, r: number, id = 1, size: Structure['size'] = 1): Structure {
  return { type, q, r, id, size, direction: 0, inputs: {}, output: null, recipe: null, progress: 0, createdTick: 0,
    workTicks: 0, sourceResource: null, migrationPath: [], migrationProgress: 0, migrationThreshold: 0,
    laneOutputs: [], prismOutputCount: 2, siloReleaseMultiple: 2 }
}

describe('ocupação real de máquinas grandes', () => {
  it('usa nove células e o mesmo pixel de personagem na matriz 48×48 da Forja', () => {
    expect(LARGE_MATRICES.furnace).toHaveLength(48)
    expect(LARGE_MATRICES.furnace!.every((row) => row.length === 48)).toBe(true)
    expect(LARGE_MATRICES.silo).toHaveLength(32)
    const simulation = new Simulation()
    expect(simulation.build(cell(-3, -3), 'furnace', 0)).toBeNull()
    const forge = simulation.structureAtCoords(-3,-3)!
    expect(forge.size).toBe(3)
    for (const point of footprintCells(forge, 3)) expect(simulation.structureAt(point)).toBe(forge)
    expect(simulation.structureCount).toBe(1)
    expect(simulation.structureAtCoords(0,0)).toBeNull()
    expect(structureCenter(forge)).toEqual({ x: -128, y: -128 })
  })

  it('recusa sobreposição parcial sem cobrar recursos ou girar a peça que bloqueia', () => {
    const simulation = new Simulation()
    simulation.build(cell(2,2), 'conveyor', 0)
    const before = simulation.getFactoryState()
    expect(simulation.build(cell(0,0), 'furnace', 0)).toContain('Área ocupada')
    expect(simulation.getFactoryState()).toEqual(before)
  })

  it('seleciona, gira e desmonta pela borda, devolvendo insumos e custo uma única vez', () => {
    const simulation = new Simulation(), inventory = simulation.inventory
    simulation.build(cell(0,0), 'furnace', 0)
    const factory = simulation.getFactoryState()
    factory.structures[0].inputs = { 'bloody-iron': 2 }
    factory.structures[0].output = { resource: 'draconic-steel', amount: 1 }
    simulation.restore(0, { q:2, r:2 }, DEFAULT_SETTINGS, factory)
    expect(simulation.rotateAt({q:2,r:2})).toBe(true)
    expect(simulation.structureAtCoords(0,0)?.direction).toBe(1)
    expect(simulation.demolish(cell(2,2))).toBeNull()
    expect(simulation.selected).toBeNull()
    expect(simulation.structureCount).toBe(0)
    for (const point of footprintCells({q:0,r:0},3)) expect(simulation.structureAt(point)).toBeNull()
    expect(simulation.inventory['bloody-iron']).toBe(inventory['bloody-iron']! + 2)
    expect(simulation.inventory['fossil-coal']).toBe(inventory['fossil-coal'])
    expect(simulation.inventory['draconic-steel']).toBe(1)
    const refunded = simulation.inventory
    expect(simulation.demolish(cell(0,0))).not.toBeNull()
    expect(simulation.inventory).toEqual(refunded)
  })

  it('reserva 2×2 para o Silo e não deixa a Forja bloquear rotas de Golem', () => {
    const simulation = new Simulation()
    simulation.build(cell(-4,0), 'silo', 0)
    expect(simulation.structureAtCoords(-3,1)?.type).toBe('silo')
    const moving = structure('golem',3,2,2)
    moving.migrationPath = [{q:2,r:2},{q:1,r:2}]
    const factory = simulation.getFactoryState(); factory.structures.push(moving); factory.nextStructureId = 3
    simulation.restore(0,null,DEFAULT_SETTINGS,factory)
    const before = simulation.inventory
    expect(simulation.build(cell(0,0),'furnace',0)).toContain('rota')
    expect(simulation.inventory).toEqual(before)
  })

  it('permite ampliar uma Forja compacta somente se não cobrir peças nem deslocar saídas conectadas', () => {
    const simulation = new Simulation(), forge = structure('furnace',0,0)
    simulation.restore(0,null,DEFAULT_SETTINGS,{structures:[forge],inventory:{},deposits:{},nextStructureId:2})
    expect(simulation.expandAt({q:0,r:0})).toBeNull()
    expect(simulation.structureAtCoords(2,2)?.size).toBe(3)
    const blocked = [structure('furnace',0,0), structure('conveyor',2,2,2)]
    simulation.restore(0,null,DEFAULT_SETTINGS,{structures:blocked,inventory:{},deposits:{},nextStructureId:3})
    expect(simulation.expandAt({q:0,r:0})).toContain('Libere')
    expect(simulation.structureAtCoords(0,0)?.size).toBe(1)
    const connected = [structure('furnace',0,0), structure('conveyor',0,-1,2)]
    connected[0].direction = 2
    simulation.restore(0,null,DEFAULT_SETTINGS,{structures:connected,inventory:{},deposits:{},nextStructureId:3})
    expect(simulation.expandAt({q:0,r:0})).toContain('Desconecte')
  })
})

describe('portas e logística nas bordas', () => {
  it.each([0,1,2,3,4,5] as HexDirection[])('envia pela borda correta ao girar a Forja para a direção %i', (direction) => {
    const simulation = new Simulation()
    simulation.build(cell(0,0),'furnace',direction)
    const forge = simulation.structureAtCoords(0,0)!
    const destination = outputTargetCell(forge,direction)
    expect(containsCell(forge,destination)).toBe(false)
    simulation.build(cell(destination.q,destination.r),'gnome',0)
    const factory = simulation.getFactoryState()
    factory.structures[0].output = { resource:'draconic-steel', amount:1 }
    simulation.restore(0,null,DEFAULT_SETTINGS,factory)
    for(let tick=0;tick<6;tick++) simulation.step(world)
    expect(simulation.inventory['draconic-steel']).toBe(1)
  })

  it('recebe dois insumos por células diferentes da borda e libera a saída em outra célula', () => {
    const simulation = new Simulation()
    simulation.build(cell(0,0),'furnace',0)
    simulation.build(cell(-1,0),'conveyor',0)
    simulation.build(cell(-1,2),'conveyor',0)
    simulation.build(cell(3,1),'gnome',0)
    const factory = simulation.getFactoryState()
    factory.structures[0].output = {resource:'draconic-steel',amount:3}
    factory.structures[1].output = {resource:'bloody-iron',amount:1}
    factory.structures[2].output = {resource:'fossil-coal',amount:1}
    simulation.restore(0,null,DEFAULT_SETTINGS,factory)
    for(let tick=0;tick<6;tick++) simulation.step(world)
    const forge = simulation.structureAtCoords(1,1)!
    expect(forge.inputs).toMatchObject({'bloody-iron':1,'fossil-coal':1})
    expect(simulation.inventory['draconic-steel']).toBe(1)
    expect(simulation.drainTransferMotions().every((motion) => motion.path && motion.path.length >= 2)).toBe(true)
  })

  it('conecta o bocal grande à retaguarda do Prisma usando a direção real do fluxo', () => {
    const forge = structure('furnace',0,0,1,3), prism = structure('prism',3,1,2)
    const map = new Map(footprintCells(forge,3).map((cell) => [hexKey(cell.q,cell.r),forge]))
    map.set('3,1',prism)
    const connection = connectionForLane(forge,0,(q,r) => map.get(hexKey(q,r)) ?? null)!
    expect(connection.targetLane).toBe(0)
    expect(connection.path[0]).toEqual({x:64,y:64})
    expect(connection.path.at(-1)).toEqual({x:192,y:64})
    prism.direction = 3
    expect(connectionForLane(forge,0,(q,r) => map.get(hexKey(q,r)) ?? null)).toBeNull()
  })
})

describe('rasterização contínua das esteiras', () => {
  const paths = [orthogonalPath({x:-64,y:0},{x:64,y:0}), orthogonalPath({x:0,y:-64},{x:0,y:0})]

  it('não sobrepõe trilhos ao centro de uma junção, qualquer que seja a ordem de desenho', () => {
    const forward = rasterizeBeltPaths(paths), reverse = rasterizeBeltPaths([...paths].reverse())
    const normalized = (tiles: ReturnType<typeof rasterizeBeltPaths>) => tiles.map((tile) => ({key:`${tile.q},${tile.r}`,matrix:beltTileMatrix(tile,0)})).sort((a,b) => a.key.localeCompare(b.key))
    expect(normalized(forward)).toEqual(normalized(reverse))
    const center = beltTileMatrix(forward.find((tile) => tile.q===0 && tile.r===0)!,0)
    expect([3,9]).toContain(center[8][8])
  })

  it('mantém largura, bordas e leito contínuos na fronteira de células', () => {
    const tiles = rasterizeBeltPaths([orthogonalPath({x:-64,y:0},{x:128,y:0})])
    const left = beltTileMatrix(tiles.find((tile) => tile.q===0 && tile.r===0)!,0)
    const right = beltTileMatrix(tiles.find((tile) => tile.q===1 && tile.r===0)!,0)
    expect(left.map((row) => row[15] !== 0)).toEqual(right.map((row) => row[0] !== 0))
    expect(left[4][15]).toBe(1); expect(right[4][0]).toBe(1)
    expect(left[5][15]).toBe(4); expect(right[5][0]).toBe(4)
  })

  it('move os travessões na direção de cada trecho, inclusive quando o fluxo se inverte', () => {
    const east = rasterizeBeltPaths([orthogonalPath({x:-64,y:0},{x:128,y:0})]).find((t) => t.q===0 && t.r===0)!
    const west = rasterizeBeltPaths([orthogonalPath({x:128,y:0},{x:-64,y:0})]).find((t) => t.q===0 && t.r===0)!
    expect(beltTileMatrix(east,0)).toEqual(beltTileMatrix(west,0))
    expect(beltTileMatrix(east,1)).not.toEqual(beltTileMatrix(west,1))
    expect(east.flowX[8*16+8]).toBe(1)
    expect(west.flowX[8*16+8]).toBe(-1)
  })

  it('inclui as margens dos cantos diagonais e mantém o item dentro do leito durante todo o caminho', () => {
    const path = orthogonalPath({x:0,y:0},{x:64,y:-64}), tiles = rasterizeBeltPaths([path])
    expect(tiles.some((tile) => tile.q===1 && tile.r===0)).toBe(true)
    expect(tiles.some((tile) => tile.q===0 && tile.r===-1)).toBe(true)
    for(let index=0;index<=128;index++) {
      const point = pointOnPath(path,index/128), x = Math.floor(point.x/4), y = Math.floor(point.y/4)
      const q = Math.floor((x+8)/16), r = Math.floor((y+8)/16)
      const tile = tiles.find((tile) => tile.q===q && tile.r===r)!
      expect(Number.isFinite(tile.distances[(y-r*16+8)*16+x-q*16+8])).toBe(true)
    }
  })
})
