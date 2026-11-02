import { describe,expect,it } from 'vitest'
import { codexLinks } from './codexLinks'
import { getCodexEntry } from './codex'
import { ALLOY_LIST } from './resources'
import { ORE_LIST } from './ores'
import { STRUCTURE_LIST } from './structures'
import { operationDemo } from './operationDemos'
import { createNewSnapshot,createSlot,deleteSlot } from '../persistence/slots'
import { writeSaveRecord } from '../persistence/database'
import { DEMO_SLOT_ID } from '../config'

describe('referências navegáveis e demonstrações operacionais',()=>{
  it('resolve todos os links de recursos para páginas existentes',()=>{
    for(const resource of [...ORE_LIST,...ALLOY_LIST]) {
      const target={category:resource.id in Object.fromEntries(ALLOY_LIST.map(a=>[a.id,true]))?'alloys':'ores',id:resource.id} as Parameters<typeof codexLinks>[0]
      for(const group of codexLinks(target)) for(const link of group.links) expect(getCodexEntry(link.target).name).toBe(link.name)
    }
    const copper=codexLinks({category:'ores',id:'rusted-copper'})
    expect(copper.find(group=>group.title==='Usado para fabricar')?.links.some(link=>link.target.id==='runic-bronze')).toBe(true)
    expect(codexLinks({category:'alloys',id:'ether-steel'}).find(group=>group.title==='Ingredientes desta liga')?.links.map(link=>link.target.id)).toEqual(['gray-steel','resonant-brass'])
  })
  it('explica operações distintas em todas as máquinas',()=>{
    const models=STRUCTURE_LIST.map(s=>operationDemo({category:'machines',id:s.id})!)
    expect(models.every(model=>model.stages.length===4&&model.captions.every(c=>c.trim().length>0))).toBe(true)
    expect(new Set(models.map(model=>model.result)).size).toBeGreaterThanOrEqual(12)
  })
  it('demonstra saída e retenção corretas nas três situações da Fornalha',()=>{
    const target={category:'machines',id:'smelter'} as const
    expect(operationDemo(target,'exact')?.outputs).toEqual([{resource:'rusted-copper',amount:6}])
    expect(operationDemo(target,'surplus')?.retained).toEqual([{resource:'rusted-copper',amount:1}])
    expect(operationDemo(target,'shortage')?.outputs).toEqual([])
    expect(operationDemo(target,'shortage')?.retained).toEqual([])
  })
  it('mostra divisão, estoque e elegibilidade sem inventar conversões',()=>{
    expect(operationDemo({category:'machines',id:'prism'},'surplus')?.outputs.map(s=>s.amount)).toEqual([4,4,4])
    expect(operationDemo({category:'machines',id:'silo'})?.retained[0].amount).toBe(1)
    expect(operationDemo({category:'machines',id:'portal'},'shortage')?.bad).toBe(true)
    expect(operationDemo({category:'machines',id:'portal'},'surplus')?.outputs[0].amount).toBe(24)
  })
})

describe('criação de mundos e proteção do quarto slot',()=>{
  it('cria uma campanha com o primeiro contrato ou uma Oficina livre sem metas',()=>{
    const campaign=createNewSnapshot('slot-1','A','artisan','campaign'),free=createNewSnapshot('slot-2','B','artisan','free')
    expect(campaign.run.mode).toBe('campaign');expect(campaign.run.contractId).not.toBeNull()
    expect(free.run.mode).toBe('free');expect(free.run.contractId).toBeNull()
    expect(campaign.factory.structures).toHaveLength(0);expect(free.factory.structures).toHaveLength(0)
  })
  it('bloqueia criação, gravação e exclusão da exposição antes de acessar o IndexedDB',async()=>{
    expect(()=>createNewSnapshot(DEMO_SLOT_ID,'X','artisan')).toThrow(/exposição/i)
    await expect(createSlot(DEMO_SLOT_ID,'X','artisan')).rejects.toThrow(/exposição/i)
    await expect(writeSaveRecord({id:DEMO_SLOT_ID})).rejects.toThrow(/protegida/i)
    await expect(deleteSlot(DEMO_SLOT_ID)).rejects.toThrow(/protegida/i)
  })
})
