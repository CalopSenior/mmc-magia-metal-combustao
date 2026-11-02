import { describe, expect, it } from 'vitest'
import { AUDIBLE_RADIUS_CELLS, NEAR_FIELD_CELLS, altitudeGain, distanceGain, muffleCutoff, placeSound } from './spatial'

const at = (x: number, y: number, zoom = 0.9) => ({ x, y, zoom })

describe('som espacial', () => {
  it('é máximo perto, cai de forma contínua e cessa no raio audível', () => {
    expect(distanceGain(0)).toBe(1)
    expect(distanceGain(NEAR_FIELD_CELLS)).toBe(1)
    let previous = 1
    for (let distance = NEAR_FIELD_CELLS + 0.5; distance < AUDIBLE_RADIUS_CELLS; distance += 0.5) {
      const gain = distanceGain(distance)
      expect(gain).toBeLessThan(previous)
      expect(gain).toBeGreaterThan(0)
      previous = gain
    }
    expect(distanceGain(AUDIBLE_RADIUS_CELLS)).toBe(0)
    expect(distanceGain(AUDIBLE_RADIUS_CELLS + 40)).toBe(0)
  })

  it('aproximar a câmera deixa a máquina mais alta; afastar deixa mais baixa até silenciar', () => {
    // The camera walks towards a machine standing at x = 0.
    const gains = [17, 14, 9, 5, 2, 0].map((cameraX) => placeSound(at(cameraX, 0), 0, 0).gain)
    for (let index = 1; index < gains.length; index += 1) expect(gains[index]).toBeGreaterThan(gains[index - 1])
    expect(placeSound(at(25, 0), 0, 0)).toMatchObject({ gain: 0 })
  })

  it('pan segue o lado da máquina e fica centralizado quando ela está debaixo da câmera', () => {
    expect(placeSound(at(0, 0), -8, 0).pan).toBeLessThan(-0.3)
    expect(placeSound(at(0, 0), 8, 0).pan).toBeGreaterThan(0.3)
    expect(Math.abs(placeSound(at(0, 0), 0.2, 0).pan)).toBeLessThan(0.1)
    expect(Math.abs(placeSound(at(0, 0), 17, 0).pan)).toBeLessThanOrEqual(0.9)
  })

  it('o zoom funciona como altura da câmera e o abafamento cresce com a distância', () => {
    expect(altitudeGain(2.4)).toBeGreaterThan(altitudeGain(0.9))
    expect(altitudeGain(0.9)).toBeGreaterThan(altitudeGain(0.2))
    expect(placeSound(at(0, 0), 14, 0).muffle).toBeGreaterThan(placeSound(at(0, 0), 4, 0).muffle)
    expect(muffleCutoff(0)).toBeGreaterThan(muffleCutoff(0.5))
    expect(muffleCutoff(0.5)).toBeGreaterThan(muffleCutoff(1))
  })
})
