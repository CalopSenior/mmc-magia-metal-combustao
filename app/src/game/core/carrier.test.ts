import { describe,it,expect,vi } from 'vitest'
import { CarrierRenderer,carrierTravel,CARRIER_WORLD_SIZE } from './carrierRenderer'
import { CARRIER_HEIGHT,CARRIER_WIDTH,CARRIER_PALETTE,carrierMatrix,carrierFacing,type CarrierFacing } from '../content/carrierSprites'
import { getCodexEntries,getCodexEntry } from '../content/codex'
import { normalizeCodexTarget,structureCodexTarget } from '../content/creatures'
import { DOCK_TABS,STRUCTURES } from '../content/structures'
import { operationDemo } from '../content/operationDemos'
import { Camera } from './camera'
import { carrierHomeward,carrierReturnAt } from './carrierMotion'
import type { Shipment,Structure } from '../types'

const shipment:Shipment={from:1,to:2,resource:'bloody-iron',amount:100,departedAt:10,arriveAt:130}
const source={id:1,type:'depot',q:0,r:0} as Structure,destination={id:2,type:'depot',q:10,r:0} as Structure
const byId=(id:number)=>id===1?source:id===2?destination:undefined
describe('colosso transportador e criaturas',()=>{
  it('reserva a preparação para pegar a carga e só caminha depois de erguê-la',()=>{
    expect(carrierTravel(shipment,10)).toEqual({pose:'pickup',progress:0,travel:0})
    expect(carrierTravel(shipment,20)).toEqual({pose:'pickup',progress:.5,travel:0})
    expect(carrierTravel(shipment,30)).toEqual({pose:'walk',progress:1,travel:0})
    expect(carrierTravel(shipment,80).travel).toBe(.5)
    expect(carrierTravel(shipment,130)).toEqual({pose:'carry',progress:1,travel:1})
    expect(carrierTravel(shipment,300).travel).toBe(1)
  })
  it('não descarrega por passagem do tempo: espera a aceitação real sem alterar a remessa',()=>{
    const renderer=new CarrierRenderer(),copy={...shipment}
    renderer.update([copy],10,byId);renderer.update([copy],130,byId);renderer.update([copy],150,byId)
    expect(renderer.finishingCount).toBe(0)
    expect(copy).toEqual(shipment)
    const delivered={...copy,deliveredAt:151}
    renderer.update([delivered],151,byId)
    expect(renderer.finishingCount).toBe(1)
    renderer.update([delivered],163,byId)
    expect(renderer.finishingCount).toBe(1)
    renderer.update([delivered],263,byId)
    expect(renderer.finishingCount).toBe(0)
  })
  it('cancela criaturas de remessas removidas cedo ou com Entreposto demolido',()=>{
    const renderer=new CarrierRenderer()
    renderer.update([shipment],10,byId);renderer.update([],40,byId)
    expect(renderer.finishingCount).toBe(0)
    renderer.update([shipment],130,byId);renderer.update([],131,id=>id===1?source:undefined)
    expect(renderer.finishingCount).toBe(0)
    renderer.update([{...shipment,deliveredAt:130}],130,byId)
    expect(renderer.finishingCount).toBe(1)
    renderer.clear();expect(renderer.finishingCount).toBe(0)
  })
  it('completa a descarga e inverte o mesmo trajeto sem carga, com duração proporcional à distância',()=>{
    const delivered={...shipment,deliveredAt:150}
    expect(carrierHomeward(delivered,150)).toEqual({pose:'deliver',progress:0,travel:1})
    expect(carrierHomeward(delivered,161)).toEqual({pose:'deliver',progress:1,travel:1})
    expect(carrierHomeward(delivered,162)).toEqual({pose:'return',progress:1,travel:1})
    expect(carrierHomeward(delivered,212)).toEqual({pose:'return',progress:1,travel:.5})
    expect(carrierHomeward(delivered,262)).toEqual({pose:'return',progress:1,travel:0})
    expect(carrierReturnAt(delivered)).toBe(262)
    expect(carrierReturnAt(shipment)).toBeNull()
    const reloaded=new CarrierRenderer()
    reloaded.update([delivered],212,byId)
    expect(reloaded.finishingCount).toBe(1)
  })
  it('reavalia a remoção de Entrepostos mesmo com a fábrica pausada no mesmo tick',()=>{
    const renderer=new CarrierRenderer(),camera=new Camera(),fillRect=vi.fn()
    camera.resize(640,400);camera.restore({x:200,y:0,zoom:.3})
    renderer.update([shipment],60,byId)
    renderer.update([],60,()=>undefined)
    renderer.draw({fillRect} as unknown as CanvasRenderingContext2D,camera,60,true,false,'13px sans-serif')
    expect(fillRect).not.toHaveBeenCalled();expect(renderer.finishingCount).toBe(0)
  })
  it('usa somente um nó sólido de carga no radar',()=>{
    const renderer=new CarrierRenderer(),camera=new Camera(),fillRect=vi.fn()
    camera.resize(640,400);camera.restore({x:200,y:0,zoom:.3})
    renderer.update([shipment],60,byId)
    renderer.draw({fillRect} as unknown as CanvasRenderingContext2D,camera,60,true,false,'13px sans-serif')
    expect(fillRect).toHaveBeenCalledTimes(1)
    expect(fillRect.mock.calls[0].slice(2)).toEqual([4,4])
  })
  it('é um colosso de cerca de duas células, com poses numéricas distintas e passos acessíveis',()=>{
    expect(CARRIER_WORLD_SIZE.width).toBeGreaterThan(1.8);expect(CARRIER_WORLD_SIZE.height).toBeGreaterThan(2)
    const options={pose:'walk' as const,progress:1,step:0,facing:'south-east' as const,amount:100}
    for(const facing of ['east','south-east','south','south-west','west','north-west','north','north-east'] as CarrierFacing[])for(const pose of ['pickup','walk','carry','deliver','return','idle'] as const) {
      const matrix=carrierMatrix({...options,facing,pose})
      expect(matrix).toHaveLength(CARRIER_HEIGHT)
      expect(matrix.every(row=>row.length===CARRIER_WIDTH&&row.every(n=>Number.isInteger(n)&&n>=0&&n<CARRIER_PALETTE.length))).toBe(true)
    }
    expect(carrierMatrix(options)).not.toEqual(carrierMatrix({...options,step:2}))
    expect(carrierMatrix({...options,reducedMotion:true})).toEqual(carrierMatrix({...options,step:2,reducedMotion:true}))
    expect(carrierMatrix({...options,pose:'pickup',progress:0})).not.toEqual(carrierMatrix({...options,pose:'pickup',progress:1}))
    expect(carrierMatrix({...options,pose:'deliver',progress:0})).not.toEqual(carrierMatrix({...options,pose:'deliver',progress:1}))
    expect(carrierMatrix({...options,amount:10})).not.toEqual(carrierMatrix(options))
    const empty=carrierMatrix({...options,pose:'return'})
    expect(empty.flat().some(index=>index>=10&&index<=13)).toBe(false)
    expect(empty).not.toEqual(carrierMatrix({...options,pose:'return',step:2}))
    expect(carrierFacing(-1,0)).toBe('west');expect(carrierFacing(1,-1)).toBe('north-east')
  })
  it('separa o bestiário da maquinaria, preservando os links antigos',()=>{
    expect(getCodexEntries('machines').some(entry=>['golem','gnome','carrier'].includes(entry.id))).toBe(false)
    expect(getCodexEntries('creatures').map(entry=>entry.id)).toEqual(['golem','carrier','gnome'])
    expect(normalizeCodexTarget({category:'machines',id:'golem'})).toEqual({category:'creatures',id:'golem'})
    expect(structureCodexTarget('gnome')).toEqual({category:'creatures',id:'gnome'})
    expect(structureCodexTarget('depot')).toEqual({category:'machines',id:'depot'})
    expect(STRUCTURES.golem.tab).toBe('creatures');expect(DOCK_TABS.some(tab=>tab.id==='creatures')).toBe(true)
    expect(getCodexEntry({category:'creatures',id:'carrier'}).mechanics?.failure).toContain('espera com a caixa')
    expect(operationDemo({category:'creatures',id:'carrier'})?.outputs).toEqual([{resource:'bloody-iron',amount:100}])
  })
})
