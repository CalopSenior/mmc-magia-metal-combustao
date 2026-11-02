import { DEFAULT_SETTINGS } from '../config'
import { createExhibition, EXHIBITION_SEED, exhibitionRules, exhibitionSnapshot } from '../content/exhibition'
import type { SaveSnapshot } from '../types'
import { ChunkWorld } from '../world/ChunkWorld'
import { Simulation } from './simulation'

let prepared:Promise<SaveSnapshot>|null=null
/** Commission once in memory; every visit restores a fresh copy, never a save. */
export function prepareExhibition():Promise<SaveSnapshot> {
  if(!prepared) prepared=(async()=>{
    const plan=createExhibition(),world=new ChunkWorld(EXHIBITION_SEED,1,plan.overrides),sim=new Simulation()
    sim.restore(0,null,DEFAULT_SETTINGS,plan.factory);sim.configure(exhibitionRules(),world);sim.ether=100000
    for(let tick=0;tick<3600;tick++) {
      sim.step(world);sim.drainTransferMotions();sim.drainCues();sim.drainEvents()
      if(tick%120===119) await new Promise<void>(resolve=>setTimeout(resolve,0))
    }
    const snapshot=exhibitionSnapshot(sim.getFactoryState(),sim.tick)
    snapshot.profile.ether=sim.ether;snapshot.run.stats={...sim.stats}
    return snapshot
  })()
  return prepared
}
