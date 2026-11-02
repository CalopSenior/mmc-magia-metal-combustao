import { describe,expect,it } from 'vitest'
import { ORE_LIST } from './ores'
import { ALLOY_LIST } from './resources'
import { resourceSprite } from './resourceSprites'
import { STRUCTURE_LIST } from './structures'
import { getCodexEntry } from './codex'

describe('identidade visual dos recursos',()=>{
  it('distingue todos os minérios pela silhueta, mesmo sem as cores',()=>{
    const silhouettes=ORE_LIST.map(ore=>resourceSprite(ore.id).matrix.map(row=>row.map(n=>n?1:0).join('')).join('|'))
    expect(new Set(silhouettes).size).toBe(11)
  })
  it('cobre os recursos com matrizes íntegras e índices de paleta válidos',()=>{
    for(const resource of [...ORE_LIST,...ALLOY_LIST]) {
      const {matrix,palette}=resourceSprite(resource.id)
      expect(matrix).toHaveLength(16)
      expect(matrix.every(row=>row.length===16&&row.every(n=>Number.isInteger(n)&&n>=0&&n<palette.length))).toBe(true)
      expect(matrix.flat().filter(Boolean).length).toBeGreaterThan(20)
      expect(resourceSprite(resource.id).matrix).toBe(matrix)
    }
  })
  it('mantém famílias visuais distintas de ligas e marcas de metal prensado',()=>{
    const silhouettes=ALLOY_LIST.map(alloy=>resourceSprite(alloy.id).matrix.map(row=>row.map(n=>n?1:0).join('')).join('|'))
    expect(new Set(silhouettes).size).toBeGreaterThanOrEqual(6)
    expect(resourceSprite('gray-steel').matrix.flat()).toContain(5)
    expect(resourceSprite('gray-steel').matrix).not.toEqual(resourceSprite('runic-bronze').matrix)
  })
})

describe('orientação mecânica no Códice',()=>{
  it('oferece instruções operacionais para todas as máquinas',()=>{
    for(const machine of STRUCTURE_LIST) {
      const guide=getCodexEntry({category:'machines',id:machine.id}).mechanics!
      expect(guide).toBeDefined()
      for(const text of Object.values(guide)) expect(text.length).toBeGreaterThan(35)
    }
  })
  it('diferencia a Fornalha de uma máquina de fusão',()=>{
    const guide=getCodexEntry({category:'machines',id:'smelter'}).mechanics!
    expect(guide.purpose).toContain('não transforma')
    expect(guide.output).toContain('mesmo minério')
    expect(guide.example).toContain('6 ÷ 3')
    expect(guide.failure).toContain('sobra 1')
    expect(getCodexEntry({category:'machines',id:'furnace'}).mechanics?.output).toContain('liga nova')
  })
})
