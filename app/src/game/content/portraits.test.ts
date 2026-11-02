import { describe, expect, it } from 'vitest'
import { COORDINATOR, SUPERVISOR, SUPPORTERS, TEAM } from './credits'
import { PORTRAIT_ART } from './portraitArt'

describe('créditos em pixel art', () => {
  const everyone = [...TEAM, SUPERVISOR, COORDINATOR]

  it('cada pessoa tem um retrato proporcional cujas cores existem na paleta', () => {
    for (const person of everyone) {
      const art = PORTRAIT_ART[person.id]
      expect(art, person.name).toBeDefined()
      expect(art.rows).toHaveLength(144)
      const width=art.rows[0].length
      expect(width).toBe(128)
      expect(width/art.rows.length).toBeCloseTo(8/9)
      for (const [index,row] of art.rows.entries()) {
        expect(row).toHaveLength(width)
        expect([...row].every(char=>char==='.'||Boolean(art.palette[parseInt(char,36)])),`${person.name}, linha ${index+1}`).toBe(true)
      }
    }
  })
  it('os dez retratos usam a mesma resolução e não conservam versões antigas',()=>{
    const ids=everyone.map(person=>person.id)
    const silhouettes=ids.map(id=>PORTRAIT_ART[id].rows.join('|'))
    expect(new Set(silhouettes).size).toBe(10)
    expect(Object.keys(PORTRAIT_ART).sort()).toEqual([...ids].sort())
    for(const id of ids){expect(PORTRAIT_ART[id].rows).toHaveLength(144);expect(PORTRAIT_ART[id].rows[0]).toHaveLength(128);expect(PORTRAIT_ART[id].palette.length).toBeLessThanOrEqual(36)}
  })

  it('lista a equipe completa e os três apoiadores', () => {
    expect(TEAM).toHaveLength(8)
    expect(new Set(everyone.map((person) => person.id)).size).toBe(10)
    expect(SUPPORTERS.map((supporter) => supporter.id)).toEqual(['ifrj', 'fevre', 'pibid'])
  })
})
