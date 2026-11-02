import { describe,it,expect } from 'vitest'
import { CHANNEL_COLORS,DEFAULT_CHANNEL,assignChannel,channelColors,isChannelSequence,legacyChannelColors,sameChannel } from '../content/channels'
import { Simulation } from './simulation'
import { exhibitionRules } from '../content/exhibition'
import { DEFAULT_SETTINGS } from '../config'
import { createNewSnapshot } from '../persistence/slots'
import { parseSaveText,serializeSave,validateSave } from '../persistence/save'
import { createSeedHash,generateCell } from '../world/generation'
import type { ChannelSequence,Structure } from '../types'

const BCP:ChannelSequence=['white','gray','black'],BPC:ChannelSequence=['white','black','gray']
const seed=createSeedHash('CHANNEL-SEQUENCES')
const world={getCell:(q:number,r:number)=>({...generateCell(seed,q,r),terrain:'ash' as const,deposit:null})}
function setup(type:'depot'|'portal') {
  const sim=new Simulation();sim.configure({...exhibitionRules(),freeMode:true},world)
  sim.build(world.getCell(0,0),type,0);sim.build(world.getCell(6,0),type,0)
  const a=sim.structureAtCoords(0,0)!,b=sim.structureAtCoords(6,0)!
  sim.setChannel(a,BCP);sim.setChannel(b,BPC)
  return {sim,a,b}
}
describe('canais por sequência de cores',()=>{
  it('representa as 1.728 sequências sem colisões e aceita repetições',()=>{
    const keys=new Set<string>()
    for(const a of CHANNEL_COLORS)for(const b of CHANNEL_COLORS)for(const c of CHANNEL_COLORS) {
      const colors:ChannelSequence=[a.id,b.id,c.id]
      expect(isChannelSequence(colors)).toBe(true)
      keys.add(colors.join(':'))
      expect(sameChannel({channelColors:colors},{channelColors:[...colors]})).toBe(true)
    }
    expect(keys.size).toBe(1728)
    expect(sameChannel({channelColors:BCP},{channelColors:BPC})).toBe(false)
    expect(sameChannel({channelColors:['white','white','gray']},{channelColors:['gray','gray','white']})).toBe(false)
    expect(isChannelSequence(['white','gray'])).toBe(false)
    expect(isChannelSequence(['white','gray','invalid'])).toBe(false)
  })
  it('preserva os nove pares antigos e migra para sequências independentes',()=>{
    const sequences=Array.from({length:9},(_,i)=>legacyChannelColors(i+1))
    expect(new Set(sequences.map(colors=>colors.join(':'))).size).toBe(9)
    sequences.forEach((colors,i)=>expect(sameChannel({channel:i+1},{channelColors:colors})).toBe(true))
    const source={type:'depot',channel:9} as Structure
    assignChannel(source,sequences[8])
    expect(source.channel).toBeUndefined()
    expect(source.channelColors).toEqual(sequences[8])
    expect(channelColors({})).toEqual(DEFAULT_CHANNEL)
  })
  it('só envia caixas entre Entrepostos com a mesma ordem de cores',()=>{
    const {sim,a,b}=setup('depot');a.inputs['rusted-copper']=10
    for(let i=0;i<25;i++)sim.step(world)
    expect(sim.shipments).toHaveLength(0);expect(a.inputs['rusted-copper']).toBe(10)
    sim.setChannel(b,BCP)
    for(let i=0;i<100;i++)sim.step(world)
    expect(b.output).toEqual({resource:'rusted-copper',amount:10})
    expect(sim.shipments[0].deliveredAt).toBeDefined()
  })
  it('aplica os canais de cores também aos Portais e mantém as regras dos lotes',()=>{
    const {sim,a,b}=setup('portal');a.inputs['rusted-copper']=11
    sim.step(world);expect(b.output).toBeNull()
    sim.setChannel(b,BCP);sim.step(world)
    expect(b.output).toEqual({resource:'rusted-copper',amount:11})
    b.output=null;a.inputs['rusted-copper']=10;sim.step(world)
    expect(b.output).toBeNull();expect(a.inputs['rusted-copper']).toBe(10)
  })
  it('salva cores repetidas e mantém estoque, remessas e pares de um save antigo',()=>{
    const {sim,a,b}=setup('depot')
    const snapshot=createNewSnapshot('slot-1','Cores','artisan','free')
    const factory=sim.getFactoryState()
    const old={...snapshot,factory:{...factory,structures:factory.structures.map(s=>{const copy={...s,channel:7};delete copy.channelColors;return copy})}}
    const migrated=parseSaveText(serializeSave(old))
    expect(migrated.factory.structures.every(s=>s.channel===undefined&&s.channelColors?.[2]==='yellow')).toBe(true)
    const repeated:ChannelSequence=['magenta','magenta','magenta']
    sim.setChannel(a,repeated);sim.setChannel(b,repeated)
    const roundtrip=parseSaveText(serializeSave({...snapshot,factory:sim.getFactoryState()}))
    expect(roundtrip.factory.structures[0].channelColors).toEqual(repeated)
    expect(validateSave({...snapshot,factory:{...factory,structures:[{...a,channelColors:['white','black']}]}})).toBeNull()
    expect(validateSave({...snapshot,factory:{...factory,structures:[{...a,channelColors:['white','black','pink']}]}})).toBeNull()
    const resumed=new Simulation();resumed.restore(0,null,DEFAULT_SETTINGS,roundtrip.factory)
    expect(channelColors(resumed.structureById(a.id)!)).toEqual(repeated)
    expect(sameChannel(resumed.structureById(a.id)!,resumed.structureById(b.id)!)).toBe(true)
    expect(resumed.setChannel(a,['white','invalid','black'] as unknown as ChannelSequence)).toBe(false)
    expect(channelColors(resumed.structureById(a.id)!)).toEqual(repeated)
  })
})
