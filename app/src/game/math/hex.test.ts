import { describe, expect, it } from 'vitest'
import { axialToPixel, hexDistance, pixelToAxial } from './hex'

describe('coordenadas hexagonais axiais', () => {
  it('faz a conversão axial → pixel → axial sem perder a célula', () => {
    for (let q = -8; q <= 8; q += 1) {
      for (let r = -8; r <= 8; r += 1) {
        expect(pixelToAxial(axialToPixel({ q, r }, 38), 38)).toEqual({ q, r })
      }
    }
  })

  it('calcula distância cúbica no grid', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2)
    expect(hexDistance({ q: -2, r: 3 }, { q: 1, r: 1 })).toBe(3)
  })
})
