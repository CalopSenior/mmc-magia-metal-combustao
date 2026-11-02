import { describe, expect, it } from 'vitest'
import { BIOME_LIST } from '../content/biomes'
import { ORE_LIST } from '../content/ores'
import { Simulation } from '../core/simulation'
import { ChunkWorld } from './ChunkWorld'
import { createSeedHash, districtOre, generateCell, generateChunk } from './generation'

describe('mundo procedural por coordenadas', () => {
  it('gera chunks de 64 células únicas, inclusive em coordenadas negativas', () => {
    const chunk = generateChunk(createSeedHash('TESTE-MMC'), -2, 3)
    expect(chunk.cells).toHaveLength(64)
    expect(new Set(chunk.cells.map((cell) => cell.key)).size).toBe(64)
    expect(chunk.cells[0].q).toBe(-16)
    expect(chunk.cells[0].r).toBe(24)
  })

  it('é determinístico e independe da ordem de geração dos chunks', () => {
    const seedHash = createSeedHash('ORDEM-INDEPENDENTE')
    const chunk = generateChunk(seedHash, 4, -7)
    for (const cell of chunk.cells) {
      expect(generateCell(seedHash, cell.q, cell.r)).toEqual(cell)
    }
    expect(generateChunk(seedHash, 4, -7)).toEqual(chunk)
  })

  it('produz mundos diferentes para seeds diferentes e mantém depósitos válidos', () => {
    const a = generateChunk(createSeedHash('SEED-A'), 0, 0)
    const b = generateChunk(createSeedHash('SEED-B'), 0, 0)
    expect(a.cells).not.toEqual(b.cells)
    for (const cell of a.cells) {
      if (!cell.deposit) continue
      expect(cell.deposit.purity).toBeGreaterThanOrEqual(45)
      expect(cell.deposit.purity).toBeLessThanOrEqual(99)
      expect(cell.deposit.richness).toBeGreaterThanOrEqual(1)
      expect(cell.deposit.richness).toBeLessThanOrEqual(3)
      expect(cell.deposit.quantity).toBeGreaterThan(0)
    }
  })

  it('contém os quatro biomas e os onze minérios do GDD', () => {
    expect(BIOME_LIST).toHaveLength(4)
    expect(ORE_LIST).toHaveLength(11)
    const seedHash = createSeedHash('DRAGON-DORSAL-01')
    const found = new Set<string>()
    for (let r = -80; r <= 80; r += 4) {
      for (let q = -80; q <= 80; q += 4) found.add(generateCell(seedHash, q, r).biome)
    }
    expect(found).toEqual(new Set(BIOME_LIST.map((biome) => biome.id)))
  })
})

describe('streaming de chunks', () => {
  it('mantém um minério por chunk e bolsões compactos separados por áreas livres',()=>{
    const seed=createSeedHash('DISTRITOS-TESTE')
    let deposits=0,cells=0
    for(let cr=-5;cr<=5;cr++) for(let cq=-5;cq<=5;cq++) {
      const chunk=generateChunk(seed,cq,cr)
      const ores=new Set(chunk.cells.flatMap(cell=>cell.deposit?[cell.deposit.ore]:[]))
      expect(ores.size).toBeLessThanOrEqual(1)
      for(const ore of ores) expect(ore).toBe(districtOre(seed,cq,cr))
      cells+=chunk.cells.length;deposits+=chunk.cells.filter(cell=>cell.deposit).length
    }
    expect(deposits/cells).toBeGreaterThan(.06)
    expect(deposits/cells).toBeLessThan(.35)
    expect(districtOre(seed,-2,-2)).toBe(districtOre(seed,-1,-1))
    expect(districtOre(seed,0,0)).toBe(districtOre(seed,1,1))
  })
  it('oferece todos os minérios ao explorar distritos e não depende da ordem de visita',()=>{
    const seed=createSeedHash('EXPLORACAO-DE-VEIOS'),seen=new Set<string>()
    for(let r=-50;r<=50;r+=2) for(let q=-50;q<=50;q+=2) seen.add(districtOre(seed,q,r))
    expect(seen).toEqual(new Set(ORE_LIST.map(ore=>ore.id)))
    expect(districtOre(seed,-2,4)).toBe(districtOre(seed,-2,4))
  })
  it('garante os quatro materiais iniciais nos distritos ao redor da oficina',()=>{
    for(const name of ['DRAGON-DORSAL-01','OUTRA-OFICINA']) {
      const seed=createSeedHash(name)
      expect(districtOre(seed,0,0)).toBe('rusted-copper')
      expect(districtOre(seed,-1,0)).toBe('fossil-coal')
      expect(districtOre(seed,0,-1)).toBe('bloody-iron')
      expect(districtOre(seed,-1,-1)).toBe('whispering-quartz')
    }
  })
  it('preserva separadamente o layout antigo durante streaming e consultas fora do cache',()=>{
    const world=new ChunkWorld('LAYOUT-ANTIGO',1,new Map(),'legacy'),seed=createSeedHash(world.seed)
    const before=world.getCell(3,2)
    expect(before).toEqual(generateCell(seed,3,2,'legacy'))
    world.update({q:80,r:80})
    expect(world.getCell(3,2)).toEqual(before)
    world.update({q:0,r:0})
    expect(world.getCell(3,2)).toEqual(before)
    const legacy=generateChunk(seed,0,0,'legacy'),veins=generateChunk(seed,0,0,'veins')
    expect(legacy.cells).not.toEqual(veins.cells)
    for(let i=0;i<64;i++) expect(legacy.cells[i].terrain).toBe(veins.cells[i].terrain)
  })
  it('mantém o orçamento de cache e restaura células idênticas após descarregamento', () => {
    const world = new ChunkWorld('CACHE-DETERMINISTICO', 2)
    expect(world.chunkCount).toBe(25)
    expect(world.cellCount).toBe(1600)
    const original = world.getCell(0, 0)
    world.update({ q: 80, r: 80 })
    expect(world.chunkCount).toBe(25)
    expect(world.cellCount).toBe(1600)
    world.update({ q: 0, r: 0 })
    expect(world.getCell(0, 0)).toEqual(original)
  })

  it('aplica distâncias configuráveis de 1 a 4 sem reter chunks excedentes', () => {
    const world = new ChunkWorld('DISTANCIA', 1)
    expect(world.chunkCount).toBe(9)
    expect(world.cellCount).toBe(576)
    world.setDistance(4)
    expect(world.chunkCount).toBe(81)
    expect(world.cellCount).toBe(5184)
    world.setDistance(1)
    expect(world.chunkCount).toBe(9)
    expect(world.cellCount).toBe(576)
  })
})

describe('relógio da simulação', () => {
  it('avança apenas em passos explícitos e reinicia sem resíduo', () => {
    const simulation = new Simulation()
    const world = new ChunkWorld('RELOGIO-TESTE', 1)
    simulation.step(world)
    simulation.step(world)
    simulation.select({ q: 2, r: 1 })
    expect(simulation.tick).toBe(2)
    simulation.reset()
    expect(simulation.tick).toBe(0)
    expect(simulation.selected).toBeNull()
  })
})
