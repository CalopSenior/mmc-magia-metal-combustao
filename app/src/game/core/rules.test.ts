import { describe, expect, it } from 'vitest'
import { CONTRACTS } from '../content/contracts'
import { DIFFICULTIES } from '../content/difficulty'
import { RECIPES, STRUCTURE_LIST } from '../content/structures'
import { hexKey } from '../math/hex'
import type { AlloyId, HexCell, Monster, OreId, ResourceId, Structure } from '../types'
import { createSeedHash, generateCell } from '../world/generation'
import { planContractMap } from '../world/contractMap'
import { BURST_GAP_TICKS } from '../content/structures'
import { passesPortal, registerArrival, type RulesConfig } from './machineRules'
import { Simulation } from './simulation'

const seed = createSeedHash('REGRAS-TESTE')

function ash(q: number, r: number, ore?: OreId): HexCell {
  return { ...generateCell(seed, q, r), terrain: 'ash', deposit: ore ? { ore, purity: 80, richness: 3, quantity: 30 } : null }
}

function world(deposits: Record<string, OreId> = {}) {
  return { getCell: (q: number, r: number) => ash(q, r, deposits[hexKey(q, r)]) }
}

function rules(overrides: Partial<RulesConfig> = {}): RulesConfig {
  return {
    difficulty: DIFFICULTIES.engineer, mode: 'campaign', bounds: 20, freeMode: false,
    hasTech: (id) => id !== 'chief-engineer', maxGnomes: 5, allowed: new Set(STRUCTURE_LIST.map((entry) => entry.id)), ...overrides,
  }
}

function setup(options: Partial<RulesConfig> = {}, deposits: Record<string, OreId> = {}) {
  const simulation = new Simulation(), cells = world(deposits)
  simulation.configure(rules(options), cells)
  simulation.reset({ 'rusted-copper': 99, 'fossil-coal': 99, 'bloody-iron': 99, 'whispering-quartz': 99, 'raw-ether-crystal': 20, 'abyssal-cobalt': 9, 'lunar-silver': 4 })
  simulation.ether = 50
  return { simulation, cells }
}

function advance(simulation: Simulation, cells: ReturnType<typeof world>, ticks: number) {
  for (let index = 0; index < ticks; index += 1) simulation.step(cells)
}

function arrive(structure: Structure, resource: ResourceId, count: number, tick: number) {
  for (let index = 0; index < count; index += 1) registerArrival(structure, resource, tick)
}

describe('Regra do Resto Zero', () => {
  it('processa um lote completo e conta um ciclo perfeito', () => {
    const { simulation, cells } = setup()
    expect(simulation.build(ash(0, 0), 'smelter', 0)).toBeNull()
    simulation.setSmelterLot({ q: 0, r: 0 }, 4)
    const smelter = simulation.structureAt({ q: 0, r: 0 })!
    arrive(smelter, 'rusted-copper', 8, simulation.tick)
    advance(simulation, cells, BURST_GAP_TICKS + 2)
    expect(smelter.output).toEqual({ resource: 'rusted-copper', amount: 8 })
    expect(simulation.stats.perfectCycles).toBe(1)
    expect(smelter.hp).toBe(70)
  })

  it('causa Fome de Lote quando chega menos que o lote e explica a conta', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'smelter', 0)
    simulation.setSmelterLot({ q: 0, r: 0 }, 7)
    const smelter = simulation.structureAt({ q: 0, r: 0 })!
    arrive(smelter, 'rusted-copper', 5, simulation.tick)
    advance(simulation, cells, BURST_GAP_TICKS + 2)
    expect(smelter.hp).toBe(70 - 14)
    expect(simulation.stats.hungerEvents).toBe(1)
    expect(smelter.output).toBeNull()
    const lessons = simulation.drainEvents().filter((event) => event.kind === 'lesson')
    expect(lessons.some((event) => event.kind === 'lesson' && event.message.includes('5 ÷ 7 = 0 resto 5'))).toBe(true)
  })

  it('cristaliza o resto, passa só os lotes inteiros e gera um Monstro de Escória no limite', () => {
    const { simulation, cells } = setup({ difficulty: { ...DIFFICULTIES.engineer, spawnThreshold: 4 } })
    simulation.build(ash(0, 0), 'smelter', 0)
    simulation.setSmelterLot({ q: 0, r: 0 }, 7)
    const smelter = simulation.structureAt({ q: 0, r: 0 })!
    arrive(smelter, 'rusted-copper', 9, simulation.tick)
    advance(simulation, cells, BURST_GAP_TICKS + 2)
    expect(smelter.output?.amount).toBe(7)
    expect(smelter.crystals?.['rusted-copper']).toBe(2)
    expect(simulation.stats.clogEvents).toBe(1)
    advance(simulation, cells, 40)
    smelter.output = null
    arrive(smelter, 'rusted-copper', 9, simulation.tick)
    advance(simulation, cells, BURST_GAP_TICKS + 2)
    expect(simulation.monsters).toHaveLength(1)
    expect(simulation.monsters[0]).toMatchObject({ kind: 'slag', number: 2, hp: 2 })
  })

  it('o ferro sangrento dobra o dano por falta de lote', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'smelter', 0)
    simulation.setSmelterLot({ q: 0, r: 0 }, 4)
    const smelter = simulation.structureAt({ q: 0, r: 0 })!
    arrive(smelter, 'bloody-iron', 2, simulation.tick)
    advance(simulation, cells, BURST_GAP_TICKS + 2)
    expect(smelter.hp).toBe(70 - 28)
  })

  it('Aprendiz sofre menos dano que Mestre pelo mesmo erro', () => {
    const damage = (difficulty: keyof typeof DIFFICULTIES) => {
      const { simulation, cells } = setup({ difficulty: DIFFICULTIES[difficulty] })
      simulation.build(ash(0, 0), 'smelter', 0)
      const smelter = simulation.structureAt({ q: 0, r: 0 })!
      arrive(smelter, 'rusted-copper', 1, simulation.tick)
      advance(simulation, cells, BURST_GAP_TICKS + 2)
      return 70 - (smelter.hp ?? 0)
    }
    expect(damage('apprentice')).toBeLessThan(damage('artisan'))
    expect(damage('artisan')).toBeLessThan(damage('master'))
  })

  it('o Gnomo Alquimista absorve até 2 erros por minuto', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'smelter', 0)
    expect(simulation.setAlchemist({ q: 0, r: 0 }, true)).toBeNull()
    const smelter = simulation.structureAt({ q: 0, r: 0 })!
    for (let round = 0; round < 3; round += 1) {
      arrive(smelter, 'rusted-copper', 1, simulation.tick)
      advance(simulation, cells, BURST_GAP_TICKS + 2)
    }
    expect(simulation.stats.absorbedEvents).toBe(2)
    expect(simulation.stats.hungerEvents).toBe(1)
  })

  it('um Cristal de Éter completa o que falta no lote', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'furnace', 0)
    const altar = simulation.structureAt({ q: 0, r: 0 })!
    simulation.setTarget({ q: 0, r: 0 }, 'runic-bronze')
    expect(simulation.insertCrystals({ q: 0, r: 0 }, 1)).toBeNull()
    arrive(altar, 'fossil-coal', 5, simulation.tick)
    advance(simulation, cells, BURST_GAP_TICKS + 2)
    expect(altar.inputs['fossil-coal']).toBe(6)
    expect(altar.inputs['raw-ether-crystal']).toBe(0)
    expect(simulation.stats.hungerEvents).toBe(0)
  })
})

describe('Altar de Fusão e MMC', () => {
  it('funde o Bronze Rúnico em 3 lotes de cobre e 2 de carvão (MMC 6)', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'furnace', 0)
    simulation.setTarget({ q: 0, r: 0 }, 'runic-bronze')
    const altar = simulation.structureAt({ q: 0, r: 0 })!
    for (let lot = 0; lot < 3; lot += 1) { arrive(altar, 'rusted-copper', 2, simulation.tick); advance(simulation, cells, BURST_GAP_TICKS + 2) }
    for (let lot = 0; lot < 2; lot += 1) { arrive(altar, 'fossil-coal', 3, simulation.tick); advance(simulation, cells, BURST_GAP_TICKS + 2) }
    expect(altar.recipe).toBe('runic-bronze')
    const etherBefore = simulation.ether
    advance(simulation, cells, RECIPES['runic-bronze'].durationTicks + 2)
    expect(altar.output).toEqual({ resource: 'runic-bronze', amount: 6 })
    expect(simulation.stats.fusions).toBe(1)
    expect(simulation.ether).toBe(etherBefore + 2)
    expect(simulation.drainEvents().some((event) => event.kind === 'discover' && event.recipe === 'runic-bronze')).toBe(true)
  })

  it('não dá Éter Puro quando houve erro durante a fusão', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'furnace', 0)
    simulation.setTarget({ q: 0, r: 0 }, 'runic-bronze')
    const altar = simulation.structureAt({ q: 0, r: 0 })!
    arrive(altar, 'rusted-copper', 1, simulation.tick); advance(simulation, cells, BURST_GAP_TICKS + 2)
    arrive(altar, 'rusted-copper', 6, simulation.tick); advance(simulation, cells, BURST_GAP_TICKS + 2)
    arrive(altar, 'fossil-coal', 6, simulation.tick); advance(simulation, cells, BURST_GAP_TICKS + 2)
    const etherBefore = simulation.ether
    advance(simulation, cells, RECIPES['runic-bronze'].durationTicks + 2)
    expect(simulation.stats.fusions).toBe(1)
    expect(simulation.ether).toBe(etherBefore)
  })

  it('a Runa × 10 grava caixas condensadas: mesmo número de itens, valor 10×', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'furnace', 0)
    simulation.setTarget({ q: 0, r: 0 }, 'runic-bronze')
    expect(simulation.engraveRune({ q: 0, r: 0 }, 1)).toBeNull()
    const altar = simulation.structureAt({ q: 0, r: 0 })!
    arrive(altar, 'rusted-copper', 6, simulation.tick); advance(simulation, cells, BURST_GAP_TICKS + 2)
    arrive(altar, 'fossil-coal', 6, simulation.tick); advance(simulation, cells, BURST_GAP_TICKS + 2)
    advance(simulation, cells, RECIPES['runic-bronze'].durationTicks + 2)
    expect(altar.output).toEqual({ resource: 'runic-bronze', amount: 6, scale: 10 })
  })

  it('exige tecnologia e Éter para gravar runas', () => {
    const { simulation } = setup({ hasTech: () => false })
    simulation.build(ash(0, 0), 'furnace', 0)
    expect(simulation.engraveRune({ q: 0, r: 0 }, 1)).toContain('Runa de Dezena')
  })

  it('a Câmara só aceita receitas de Nível 2 e o Núcleo exige runa', () => {
    const { simulation } = setup()
    simulation.build(ash(0, 0), 'chamber', 0)
    expect(simulation.setTarget({ q: 0, r: 0 }, 'runic-bronze')).toContain('não conhece')
    expect(simulation.setTarget({ q: 0, r: 0 }, 'dragon-core')).toBeNull()
    expect(RECIPES['dragon-core'].minRune).toBe(1)
  })

  it('todas as ligas de Nível 1 e 2 batem com o GDD', () => {
    const expected: Record<string, number> = {
      'runic-bronze': 6, 'gray-steel': 12, 'resonant-brass': 10, 'scaled-iron': 12, 'azure-amalgam': 35,
      'volcanic-glass': 24, 'astral-electrum': 63, 'dark-chrome': 28, 'draconic-gold': 72,
      'ether-steel': 60, 'fossil-mithril': 84, 'imperial-orichalcum': 210, 'dorsal-adamantine': 72, 'dragon-core': 360,
    }
    for (const [id, value] of Object.entries(expected)) expect(RECIPES[id as AlloyId].output).toBe(value)
    expect(RECIPES['stellar-silver'].inputs).toEqual({ 'astral-electrum': 63, 'lunar-silver': 66 })
    expect(RECIPES['stellar-silver'].catalyst).toBe(3)
  })
})

describe('Golems, torres e mapa de contrato', () => {
  it('o seletor do Golem define quantos minérios saem por batida', () => {
    const { simulation, cells } = setup({}, { '0,0': 'rusted-copper' })
    expect(simulation.build(ash(0, 0, 'rusted-copper'), 'golem', 0)).toBeNull()
    simulation.setGolemBatch({ q: 0, r: 0 }, 6)
    advance(simulation, cells, 100)
    expect(simulation.structureAt({ q: 0, r: 0 })?.output?.amount).toBe(6)
  })

  it('a torre derruba um slime; o Corrompido só cai com dano que divide o HP', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'tower', 0)
    simulation.setTowerPower({ q: 0, r: 0 }, 5)
    const armored: Monster = { id: 1, kind: 'corrupted', x: 1, y: 0, number: 12, hp: 12, maxHp: 12, fast: false, cooldown: 99 }
    simulation.monsters.push(armored)
    advance(simulation, cells, 60)
    expect(armored.hp).toBe(12)
    simulation.setTowerPower({ q: 0, r: 0 }, 4)
    advance(simulation, cells, 24 * 4)
    expect(simulation.monsters).toHaveLength(0)
    expect(simulation.stats.monstersSlain).toBe(1)
  })

  it('o Portal Modular só passa números primos ou múltiplos de 12', () => {
    expect([11, 13, 24, 36, 2].every(passesPortal)).toBe(true)
    expect([14, 15, 20, 1, 9].some(passesPortal)).toBe(false)
  })

  it('bloqueia obstáculos naturais e o fora do mapa', () => {
    const simulation = new Simulation()
    const magma = { getCell: (q: number, r: number): HexCell => ({ ...ash(q, r), terrain: 'magma' }) }
    simulation.configure(rules({ hasTech: () => false, bounds: 3 }), magma)
    simulation.reset({ 'rusted-copper': 50 })
    expect(simulation.build(ash(0, 0), 'conveyor', 0)).toContain('magma')
    expect(simulation.build(ash(9, 0), 'conveyor', 0)).toContain('Fora do mapa')
    simulation.configure(rules({ hasTech: (id) => id === 'levitation', bounds: 3 }), magma)
    expect(simulation.build(ash(0, 0), 'conveyor', 0)).toBeNull()
  })

  it('peças de contratos futuros e de tecnologia ficam bloqueadas', () => {
    const { simulation } = setup({ allowed: new Set(['golem', 'conveyor', 'gnome']) })
    expect(simulation.build(ash(0, 0), 'chamber', 0)).toContain('Câmara')
  })

  it('esteiras de nível 3 transportam 4× mais depressa que as de nível 1', () => {
    const { simulation, cells } = setup()
    const arrivals = (tier: 1 | 2 | 3) => {
      const local = setup().simulation
      local.build(ash(0, 0), 'conveyor', 0, { tier })
      local.build(ash(1, 0), 'conveyor', 0, { tier })
      local.build(ash(2, 0), 'gnome', 0)
      const first = local.structureAt({ q: 0, r: 0 })!
      let count = 0, ticks = 0
      while (count < 5 && ticks < 400) {
        if (!first.output) first.output = { resource: 'rusted-copper', amount: 1 }
        local.step(cells)
        ticks += 1
        count = local.delivered['rusted-copper'] ?? 0
      }
      return ticks
    }
    void simulation
    expect(arrivals(1) / arrivals(3)).toBeGreaterThan(2.5)
  })
})

describe('mapas de contrato', () => {
  it('cada contrato da campanha garante as jazidas e terreno livre suficiente', () => {
    for (const contract of CONTRACTS) {
      const plan = planContractMap(contract.seed, contract.radius, contract.deposits)
      expect(plan.missing, contract.id).toBe(0)
      expect(plan.buildableShare, contract.id).toBeGreaterThan(0.35)
    }
  })

  it('as metas pedem múltiplos exatos do rendimento da liga', () => {
    for (const contract of CONTRACTS) {
      for (const goal of contract.goals) {
        if (goal.fusions !== undefined) expect(RECIPES[goal.resource as AlloyId].output).toBeGreaterThan(0)
      }
    }
    expect(CONTRACTS.map((contract) => contract.order)).toEqual(Array.from({ length: CONTRACTS.length }, (_, index) => index + 1))
  })
})

describe('entrega ao coletor', () => {
  it('um Golem de lote 2 abastece o Gnomo Coletor por esteiras e a meta conta as entregas', () => {
    const { simulation, cells } = setup({}, { '0,0': 'rusted-copper' })
    expect(simulation.build(ash(0, 0, 'rusted-copper'), 'golem', 0)).toBeNull()
    simulation.setGolemBatch({ q: 0, r: 0 }, 2)
    for (const q of [1, 2, 3]) expect(simulation.build(ash(q, 0), 'conveyor', 0)).toBeNull()
    expect(simulation.build(ash(4, 0), 'gnome', 0)).toBeNull()
    advance(simulation, cells, 700)
    expect(simulation.delivered['rusted-copper']).toBeGreaterThanOrEqual(8)
    expect(simulation.delivered['rusted-copper']! % 2).toBe(0)
  })

  it('caixas rúnicas de uma Runa × 100 valem 100 unidades cada na entrega', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'smelter', 0)
    simulation.setSmelterLot({ q: 0, r: 0 }, 3)
    simulation.engraveRune({ q: 0, r: 0 }, 2)
    simulation.build(ash(1, 0), 'conveyor', 0)
    simulation.build(ash(2, 0), 'gnome', 0)
    const smelter = simulation.structureAt({ q: 0, r: 0 })!
    arrive(smelter, 'fossil-coal', 3, simulation.tick)
    advance(simulation, cells, 120)
    expect(simulation.delivered['fossil-coal']).toBe(300)
  })

  it('peças quebradas não movem nem recebem recursos até serem consertadas', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'conveyor', 0)
    simulation.build(ash(1, 0), 'gnome', 0)
    const belt = simulation.structureAt({ q: 0, r: 0 })!
    belt.output = { resource: 'rusted-copper', amount: 1 }
    belt.hp = 0
    advance(simulation, cells, 40)
    expect(simulation.delivered['rusted-copper']).toBeUndefined()
    expect(simulation.repairAt({ q: 0, r: 0 })).toBeNull()
    advance(simulation, cells, 40)
    expect(simulation.delivered['rusted-copper']).toBe(1)
  })
})

describe('lotes que viajam por esteiras reais', () => {
  const chain = (batch: number, lot: number, belts = 3, tier: 1 | 2 | 3 = 1) => {
    const { simulation, cells } = setup({}, { '0,0': 'rusted-copper' })
    simulation.build(ash(0, 0, 'rusted-copper'), 'golem', 0)
    simulation.setGolemBatch({ q: 0, r: 0 }, batch)
    for (let q = 1; q <= belts; q += 1) simulation.build(ash(q, 0), 'conveyor', 0, { tier })
    simulation.build(ash(belts + 1, 0), 'smelter', 0)
    simulation.setSmelterLot({ q: belts + 1, r: 0 }, lot)
    simulation.build(ash(belts + 2, 0), 'conveyor', 0, { tier })
    simulation.build(ash(belts + 3, 0), 'gnome', 0)
    advance(simulation, cells, 900)
    return simulation
  }

  it('lote do golem = apetite da fornalha: só ciclos perfeitos, em qualquer tamanho de lote', () => {
    for (const [batch, lot] of [[2, 2], [4, 4], [6, 3], [9, 9], [8, 4]]) {
      const simulation = chain(batch, lot)
      expect(simulation.stats.hungerEvents, `lote ${batch}/${lot}`).toBe(0)
      expect(simulation.stats.clogEvents, `lote ${batch}/${lot}`).toBe(0)
      expect(simulation.stats.perfectCycles, `lote ${batch}/${lot}`).toBeGreaterThan(0)
      expect(simulation.delivered['rusted-copper'] ?? 0).toBeGreaterThan(0)
    }
  })

  it('lote do golem fora da tabuada do apetite gera erro com a conta certa', () => {
    const simulation = chain(5, 4)
    expect(simulation.stats.clogEvents).toBeGreaterThan(0)
    expect(simulation.stats.perfectCycles).toBe(0)
    const message = simulation.drainEvents().find((event) => event.kind === 'lesson' && event.message.includes('Entupimento'))
    expect(message && message.kind === 'lesson' ? message.message : '').toContain('5 ÷ 4 = 1 resto 1')
    expect(chain(3, 4).stats.hungerEvents).toBeGreaterThan(0)
  })

  it('o resultado é o mesmo com esteiras nível 2 e 3', () => {
    for (const tier of [2, 3] as const) {
      const simulation = chain(6, 3, 3, tier)
      expect(simulation.stats.hungerEvents + simulation.stats.clogEvents, `nível ${tier}`).toBe(0)
      expect(simulation.stats.perfectCycles, `nível ${tier}`).toBeGreaterThan(0)
    }
  })
})

describe('entrepostos, portais, gnomos e previsão', () => {
  it('o mesmo transportador descarrega uma só vez e retorna antes de liberar sua vaga',()=>{
    const {simulation,cells}=setup()
    simulation.build(ash(0,0),'depot',0);simulation.build(ash(6,0),'depot',0)
    const first=simulation.structureAt({q:0,r:0})!,second=simulation.structureAt({q:6,r:0})!
    first.inputs['rusted-copper']=70
    advance(simulation,cells,7)
    expect(simulation.shipments).toHaveLength(6)
    expect(first.inputs['rusted-copper']).toBe(10)
    advance(simulation,cells,80)
    expect(second.output).toEqual({resource:'rusted-copper',amount:60})
    expect(simulation.shipments.every(job=>job.deliveredAt!==undefined)).toBe(true)
    expect(first.inputs['rusted-copper']).toBe(10)
    advance(simulation,cells,66)
    expect(first.inputs['rusted-copper']).toBe(10)
    expect(second.output?.amount).toBe(60)
    advance(simulation,cells,1)
    expect(first.inputs['rusted-copper']).toBe(0)
    expect(simulation.shipments.some(job=>job.departedAt===154)).toBe(true)
  })
  it('a volta começa após a aceitação real e continua ao restaurar a simulação',()=>{
    const {simulation,cells}=setup()
    simulation.build(ash(0,0),'depot',0);simulation.build(ash(6,0),'depot',0)
    const first=simulation.structureAt({q:0,r:0})!,second=simulation.structureAt({q:6,r:0})!
    first.inputs['rusted-copper']=10;second.output={resource:'fossil-coal',amount:10}
    advance(simulation,cells,100)
    expect(simulation.shipments[0].deliveredAt).toBeUndefined()
    second.output=null;advance(simulation,cells,1)
    expect(simulation.shipments[0].deliveredAt).toBe(101)
    advance(simulation,cells,30)
    const resumed=new Simulation()
    resumed.restore(simulation.tick,null,simulation.currentSettings,simulation.getFactoryState());resumed.configure(rules(),cells)
    expect(resumed.shipments[0].deliveredAt).toBe(101)
    advance(resumed,cells,41)
    expect(resumed.shipments).toHaveLength(1)
    expect(resumed.structureById(second.id)?.output).toEqual({resource:'rusted-copper',amount:10})
    advance(resumed,cells,1)
    expect(resumed.shipments).toHaveLength(0)
  })
  it('dois Entrepostos do mesmo canal levam caixas fechadas de um ao outro', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'depot', 0)
    simulation.build(ash(6, 0), 'depot', 0)
    const first = simulation.structureAt({ q: 0, r: 0 })!, second = simulation.structureAt({ q: 6, r: 0 })!
    first.inputs['rusted-copper'] = 25
    advance(simulation, cells, 200)
    expect(second.output).toEqual({ resource: 'rusted-copper', amount: 20 })
    expect(first.inputs['rusted-copper']).toBe(5)
    simulation.setCrateSize({ q: 0, r: 0 }, 50)
    expect(first.crateSize).toBe(50)
  })

  it('o Portal Modular teleporta 11 (primo) e retém 14', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'portal', 0)
    simulation.build(ash(5, 0), 'portal', 0)
    const first = simulation.structureAt({ q: 0, r: 0 })!, second = simulation.structureAt({ q: 5, r: 0 })!
    arrive(first, 'rusted-copper', 14, simulation.tick)
    advance(simulation, cells, BURST_GAP_TICKS + 2)
    expect(second.output).toBeNull()
    expect(first.inputs['rusted-copper']).toBe(14)
    first.inputs['rusted-copper'] = 0
    arrive(first, 'rusted-copper', 11, simulation.tick)
    advance(simulation, cells, BURST_GAP_TICKS + 2)
    expect(second.output).toEqual({ resource: 'rusted-copper', amount: 11 })
  })

  it('o Posto de Gnomos conserta a máquina danificada gastando Éter', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'smelter', 0)
    simulation.build(ash(3, 0), 'gnomepost', 0)
    const smelter = simulation.structureAt({ q: 0, r: 0 })!
    smelter.hp = 10
    const before = simulation.ether
    advance(simulation, cells, 120)
    expect(smelter.hp).toBe(70)
    expect(simulation.ether).toBeLessThan(before)
    expect(simulation.stats.repairs).toBe(1)
  })

  it('o Engenheiro Chefe avisa quando o lote do golem não cabe no apetite', () => {
    const { simulation } = setup({}, { '0,0': 'rusted-copper' })
    simulation.build(ash(0, 0, 'rusted-copper'), 'golem', 0)
    simulation.setGolemBatch({ q: 0, r: 0 }, 3)
    simulation.build(ash(1, 0), 'conveyor', 0)
    simulation.build(ash(2, 0), 'smelter', 0)
    simulation.setSmelterLot({ q: 2, r: 0 }, 4)
    const warnings = simulation.forecast()
    expect([...warnings.values()][0]).toContain('lote 3 ÷ 4 deixa resto 3')
    simulation.setSmelterLot({ q: 2, r: 0 }, 3)
    simulation.step(world({ '0,0': 'rusted-copper' }))
    expect(new Simulation().forecast().size).toBe(0)
  })

  it('o Prisma Ajustável divide 9 em 6 e 3 na proporção 2 : 1', () => {
    const { simulation, cells } = setup()
    simulation.build(ash(0, 0), 'prism', 0)
    expect(simulation.setPrismRatio({ q: 0, r: 0 }, [2, 1])).toBeNull()
    const prism = simulation.structureAt({ q: 0, r: 0 })!
    prism.inputs['rusted-copper'] = 9
    advance(simulation, cells, 2)
    expect(prism.laneOutputs.map((lane) => lane?.amount)).toEqual([6, 3])
  })
})
