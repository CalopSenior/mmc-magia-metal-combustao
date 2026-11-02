import { hashCoordinates } from '../core/prng'

export function unitFromHash(hash: number): number {
  return (hash >>> 0) / 4294967296
}

export function unitAt(seedHash: number, q: number, r: number, salt: number): number {
  return unitFromHash(hashCoordinates(seedHash ^ Math.imul(salt, 0x45d9f3b), q, r))
}

function smooth(value: number): number {
  return value * value * (3 - 2 * value)
}

function mix(a: number, b: number, amount: number): number {
  return a + (b - a) * amount
}

export function valueNoise(seedHash: number, x: number, y: number, salt: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = smooth(x - x0)
  const ty = smooth(y - y0)
  const top = mix(unitAt(seedHash, x0, y0, salt), unitAt(seedHash, x0 + 1, y0, salt), tx)
  const bottom = mix(unitAt(seedHash, x0, y0 + 1, salt), unitAt(seedHash, x0 + 1, y0 + 1, salt), tx)
  return mix(top, bottom, ty)
}

export function fbm(seedHash: number, x: number, y: number, salt: number, octaves = 4): number {
  let frequency = 1
  let amplitude = 0.5
  let total = 0
  let normalization = 0
  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise(seedHash, x * frequency, y * frequency, salt + octave * 37) * amplitude
    normalization += amplitude
    frequency *= 2
    amplitude *= 0.5
  }
  return total / normalization
}
