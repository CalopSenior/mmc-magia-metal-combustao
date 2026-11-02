import { describe, expect, it } from 'vitest'
import { commonMultiples, describeDivision, divisors, factorize, formatFactorization, formatScientific, gcd, isPrime, lcm, lcmMany, simplifyFraction } from './number'

describe('number theory helpers', () => {
  it('computes gcd and lcm for the GDD alloy table', () => {
    expect(lcm(2, 3)).toBe(6)
    expect(lcm(3, 4)).toBe(12)
    expect(lcm(5, 7)).toBe(35)
    expect(lcm(8, 9)).toBe(72)
    expect(lcm(12, 10)).toBe(60)
    expect(lcm(24, 72)).toBe(72)
    expect(lcm(60, 72)).toBe(360)
    expect(gcd(24, 72)).toBe(24)
    expect(lcmMany([2, 3, 4])).toBe(12)
  })

  it('factorizes and recognises primes', () => {
    expect(factorize(360)).toEqual([[2, 3], [3, 2], [5, 1]])
    expect(formatFactorization(360)).toBe('2³ × 3² × 5')
    expect(formatFactorization(13)).toBe('13 (primo)')
    expect(isPrime(11)).toBe(true)
    expect(isPrime(63)).toBe(false)
    expect(isPrime(1)).toBe(false)
  })

  it('lists divisors, common multiples and remainders', () => {
    expect(divisors(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36])
    expect(commonMultiples(4, 6, 3)).toEqual([12, 24, 36])
    expect(describeDivision(9, 7)).toBe('9 ÷ 7 = 1 resto 2')
    expect(describeDivision(14, 7)).toBe('14 ÷ 7 = 2 (exato)')
  })

  it('formats scientific notation and simplifies fractions', () => {
    expect(formatScientific(4200)).toBe('4,2 × 10³')
    expect(formatScientific(7)).toBe('7')
    expect(simplifyFraction(14, 21)).toEqual({ numerator: 2, denominator: 3 })
  })
})
