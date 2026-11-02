/** Elementary number theory used by the rules *and* by the teaching UI, so what the game computes is what it explains. */

export function gcd(a: number, b: number): number {
  let x = Math.abs(a), y = Math.abs(b)
  while (y) [x, y] = [y, x % y]
  return x
}

export function lcm(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b)
}

export function lcmMany(values: readonly number[]): number {
  return values.reduce((total, value) => lcm(total, value), 1)
}

export function gcdMany(values: readonly number[]): number {
  return values.reduce((total, value) => gcd(total, value), 0)
}

export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false
  for (let divisor = 2; divisor * divisor <= n; divisor += 1) if (n % divisor === 0) return false
  return true
}

/** Prime → exponent, ordered ascending. */
export function factorize(n: number): [number, number][] {
  const factors: [number, number][] = []
  let rest = Math.abs(Math.trunc(n))
  for (let divisor = 2; divisor * divisor <= rest; divisor += 1) {
    let exponent = 0
    while (rest % divisor === 0) { rest /= divisor; exponent += 1 }
    if (exponent) factors.push([divisor, exponent])
  }
  if (rest > 1) factors.push([rest, 1])
  return factors
}

const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹'
export function superscript(value: number): string {
  return String(value).split('').map((digit) => SUPERSCRIPTS[Number(digit)] ?? digit).join('')
}

export function formatFactorization(n: number): string {
  if (n < 2) return String(n)
  const factors = factorize(n)
  if (factors.length === 1 && factors[0][1] === 1) return `${n} (primo)`
  return factors.map(([prime, exponent]) => exponent > 1 ? `${prime}${superscript(exponent)}` : String(prime)).join(' × ')
}

export function divisors(n: number): number[] {
  const found: number[] = []
  for (let candidate = 1; candidate * candidate <= n; candidate += 1) {
    if (n % candidate) continue
    found.push(candidate)
    if (candidate * candidate !== n) found.push(n / candidate)
  }
  return found.sort((a, b) => a - b)
}

export function multiples(n: number, limit: number): number[] {
  const list: number[] = []
  for (let value = n; value <= limit && list.length < 200; value += n) list.push(value)
  return list
}

export function commonMultiples(a: number, b: number, count: number): number[] {
  const step = lcm(a, b)
  return Array.from({ length: count }, (_, index) => step * (index + 1))
}

export interface Division { quotient: number; remainder: number }
export function divide(amount: number, lot: number): Division {
  return { quotient: Math.floor(amount / lot), remainder: amount % lot }
}

/** "9 ÷ 7 = 1 resto 2": the sentence the player reads when a machine complains. */
export function describeDivision(amount: number, lot: number): string {
  const { quotient, remainder } = divide(amount, lot)
  return `${amount} ÷ ${lot} = ${quotient}${remainder ? ` resto ${remainder}` : ' (exato)'}`
}

export function formatPower10(exponent: number): string {
  return `10${superscript(exponent)}`
}

/** Scientific notation, e.g. 4200 → "4,2 × 10³". */
export function formatScientific(value: number): string {
  if (value === 0) return '0'
  const exponent = Math.floor(Math.log10(Math.abs(value)))
  const mantissa = value / 10 ** exponent
  const text = Number(mantissa.toFixed(3)).toString().replace('.', ',')
  return exponent === 0 ? text : `${text} × ${formatPower10(exponent)}`
}

export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR')
}

export interface Fraction { numerator: number; denominator: number }
export function simplifyFraction(numerator: number, denominator: number): Fraction {
  const divisor = gcd(numerator, denominator) || 1
  return { numerator: numerator / divisor, denominator: denominator / divisor }
}

export function formatFraction(numerator: number, denominator: number): string {
  return `${numerator}/${denominator}`
}
