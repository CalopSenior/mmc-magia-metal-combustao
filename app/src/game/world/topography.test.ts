import { describe, expect, it } from 'vitest'
import { createSeedHash, generateCell } from './generation'
import { interpolateField, sampleTerrainField, sampleVisualTerrainField, surfaceTerrain, terrainColor, terrainGrain } from './topography'
import { getBiomeAt, getBiomeBlend } from './biomeField'

describe('topografia numérica contínua', () => {
  const seed = createSeedHash('TOPOGRAFIA-MMC')

  it('interpola calor, relevo e cor através das antigas divisões abruptas de bioma',()=>{
    let boundaries=0
    for(let r=-40;r<40;r+=5) for(let q=-40;q<40;q++) {
      if(getBiomeAt(seed,q,r)===getBiomeAt(seed,q+1,r)) continue
      let left=q,right=q+1
      const biome=getBiomeAt(seed,left,r)
      for(let i=0;i<20;i++) {const middle=(left+right)/2;if(getBiomeAt(seed,middle,r)===biome) left=middle;else right=middle}
      const a=sampleVisualTerrainField(seed,left-.0001,r),b=sampleVisualTerrainField(seed,right+.0001,r)
      for(const key of ['heat','height','ether','red','green','blue'] as const) expect(Math.abs(a[key]-b[key])).toBeLessThan(.01)
      const weights=Object.values(getBiomeBlend(seed,left,r))
      expect(weights.reduce((sum,n)=>sum+n,0)).toBeCloseTo(1)
      expect(weights.every(n=>n>=0&&n<=1)).toBe(true)
      boundaries++
    }
    expect(boundaries).toBeGreaterThan(10)
  })

  it('repete campos e texturas em coordenadas negativas após descarregamento', () => {
    expect(sampleTerrainField(seed, -8, 16)).toEqual(sampleTerrainField(seed, -8, 16))
    expect(terrainGrain(seed, -1, -2048)).toBe(terrainGrain(seed, -1, -2048))
    expect(sampleTerrainField(seed, -8, 16)).not.toEqual(sampleTerrainField(createSeedHash('OUTRO-MUNDO'), -8, 16))
  })

  it('compartilha as bordas interpoladas entre chunks adjacentes', () => {
    const a = sampleTerrainField(seed, 7.5, -8), b = sampleTerrainField(seed, 8, -8), c = sampleTerrainField(seed, 8.5, -8)
    const d = sampleTerrainField(seed, 7.5, -7.5), e = sampleTerrainField(seed, 8, -7.5), f = sampleTerrainField(seed, 8.5, -7.5)
    expect(interpolateField(a, b, d, e, 1, 0.37)).toEqual(interpolateField(b, c, e, f, 0, 0.37))
  })

  it('ilumina encostas opostas e produz degraus sem deslocar a projeção', () => {
    const dry = { ...sampleTerrainField(seed, 0, 0), heat: 0, ether: 0, moisture: 0.4, height: 0.43 }
    const lit = terrainColor(dry, -0.02, -0.03, 0.5)
    const shadow = terrainColor(dry, 0.02, 0.03, 0.5)
    expect(lit).toBeGreaterThan(shadow)
    expect(terrainColor({ ...dry, height: 0.5 }, 0, 0, 0.5)).not.toBe(terrainColor({ ...dry, height: 0.51 }, 0, 0, 0.5))
  })

  it('faz lagos, magma e canais cristalinos concordarem com a inspeção das células', () => {
    const seen = new Set<string>()
    for (let r = -48; r <= 48; r += 3) {
      for (let q = -48; q <= 48; q += 3) {
        const field = sampleTerrainField(seed, q, r)
        expect(generateCell(seed, q, r).relief).toBe(field.height)
        const terrain = surfaceTerrain(field)
        if (terrain) { expect(generateCell(seed, q, r).terrain).toBe(terrain); seen.add(terrain) }
      }
    }
    expect(seen).toEqual(new Set(['acid', 'magma', 'crystal']))
  })
})
