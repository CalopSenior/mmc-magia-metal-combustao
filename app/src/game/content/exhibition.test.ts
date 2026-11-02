import { describe,expect,it } from 'vitest'
import { createExhibition, EXHIBITION_SEED, exhibitionRules } from './exhibition'
import { Simulation } from '../core/simulation'
import { ChunkWorld } from '../world/ChunkWorld'
import { DEFAULT_SETTINGS } from '../config'
import { connectionForLane, outputDirections } from '../core/structureGeometry'
import { STRUCTURE_LIST, TIER1_RECIPE_LIST, TIER2_RECIPE_LIST } from './structures'

describe('Cidadela Pibid de Matemática',()=>{
  it('não sobrepõe peças e liga todas as saídas produtivas a receptores válidos',()=>{
    const plan=createExhibition(),sim=new Simulation()
    sim.restore(0,null,DEFAULT_SETTINGS,plan.factory)
    expect(plan.factory.structures.length).toBeGreaterThan(1500)
    expect(sim.structureAtCoords(0,0)?.type).toBe('gnome')
    expect(new Set(plan.factory.structures.map(s=>s.type))).toEqual(new Set(STRUCTURE_LIST.map(s=>s.id)))
    for(const structure of sim.structures) {
      if(['gnome','tower','gnomepost','energizer','paving','lantern'].includes(structure.type)) continue
      // The golem beside a Ponto de Coleta hands its sack over there instead of using a belt.
      if(structure.type==='golem'&&[...sim.structures].some(other=>other.type==='collector'&&Math.max(Math.abs(other.q-structure.q),Math.abs(other.r-structure.r))<=9)) continue
      for(const [lane] of outputDirections(structure).entries()) {
        // Remote senders intentionally ship through their paired depot/portal.
        if((structure.type==='depot'||structure.type==='portal')&&!connectionForLane(structure,lane,(q,r)=>sim.structureAtCoords(q,r))) continue
        expect(connectionForLane(structure,lane,(q,r)=>sim.structureAtCoords(q,r)),`Saída ${structure.type} ${structure.q},${structure.r}`).not.toBeNull()
      }
    }
  })
  it('produz todas as ligas atuais sem fome, cristais ou dano em uma execução prolongada',()=>{
    const plan=createExhibition(),world=new ChunkWorld(EXHIBITION_SEED,1,plan.overrides),sim=new Simulation()
    sim.restore(0,null,DEFAULT_SETTINGS,plan.factory);sim.configure(exhibitionRules(),world);sim.ether=100000
    for(let tick=0;tick<8000;tick++) {sim.step(world);sim.drainTransferMotions();sim.drainEvents();sim.drainCues()}
    expect(sim.stats.hungerEvents).toBe(0)
    expect(sim.stats.clogEvents).toBe(0)
    expect(sim.stats.damageTaken).toBe(0)
    expect(sim.stats.fusions).toBeGreaterThan(100)
    for(const recipe of [...TIER1_RECIPE_LIST,...TIER2_RECIPE_LIST]) expect(sim.inventory[recipe.id]??0,recipe.id).toBeGreaterThan(0)
  },240000)
  it('fecha o laço do Reator Recursivo: os Núcleos que a árvore forja alimentam as Mesas que alimentam a árvore',()=>{
    const plan=createExhibition(),world=new ChunkWorld(EXHIBITION_SEED,1,plan.overrides),sim=new Simulation()
    sim.restore(0,null,DEFAULT_SETTINGS,plan.factory);sim.configure(exhibitionRules(),world);sim.ether=100000
    const tables=[...sim.structures].filter(s=>s.type==='alchemy')
    expect(tables.length).toBeGreaterThanOrEqual(17)
    for(let tick=0;tick<7000;tick++) {sim.step(world);sim.drainTransferMotions();sim.drainEvents();sim.drainCues()}
    // Every table of the reactor still has Núcleos to burn: the root keeps forging new ones (360 × 10 per fusion).
    for(const table of tables.filter(s=>s.q>=20&&s.q<=140&&s.r>=60&&s.r<=140)) expect((table.inputs['dragon-core']??0)+(table.sourceResource?1:0),`Mesa ${table.q},${table.r}`).toBeGreaterThan(0)
    expect(sim.inventory['dragon-core']??0).toBeGreaterThan(1000)
    // The orchard returns 18 per Núcleo to its Gnomos: far more ore than its seeds could ever supply.
    expect(sim.inventory['abyssal-cobalt']??0).toBeGreaterThan(500)
    expect(sim.inventory['rusted-copper']??0).toBeGreaterThan(1500)
  },240000)
})
