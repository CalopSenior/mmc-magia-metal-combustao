import { createRng } from '../core/prng'
import { commonMultiples, divisors, factorize, formatScientific, gcd, isPrime, lcm, simplifyFraction } from '../math/number'
import type { DifficultyId, MathTopic } from '../types'
import { DIFFICULTIES } from './difficulty'

export interface QuizQuestion {
  readonly topic: MathTopic
  readonly prompt: string
  readonly answer: number
  /** Present for multiple-choice difficulties. */
  readonly choices?: readonly number[]
  readonly explanation: string
}

type Rng = () => number
const pick = <T,>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)]
const between = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))

function distractors(rng: Rng, answer: number, count = 3): number[] {
  const options = new Set<number>()
  const spread = Math.max(2, Math.round(answer * 0.25))
  let guard = 0
  while (options.size < count && guard++ < 60) {
    const candidate = answer + between(rng, -spread, spread)
    if (candidate !== answer && candidate > 0) options.add(candidate)
  }
  for (let fill = 1; options.size < count; fill += 1) options.add(answer + fill * 7)
  return [...options]
}

function shuffled<T>(rng: Rng, list: readonly T[]): T[] {
  const copy = [...list]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

function build(rng: Rng, difficulty: DifficultyId, base: Omit<QuizQuestion, 'choices'>): QuizQuestion {
  if (DIFFICULTIES[difficulty].quiz === 'input') return base
  return { ...base, choices: shuffled(rng, [base.answer, ...distractors(rng, base.answer)]) }
}

const LOT_POOL = [2, 3, 4, 5, 6, 7, 8, 9]

export function makeQuestion(topic: MathTopic, difficulty: DifficultyId, rng: Rng): QuizQuestion {
  const maxLot = DIFFICULTIES[difficulty].maxLot
  const lots = LOT_POOL.filter((lot) => lot <= Math.max(6, maxLot))
  switch (topic) {
    case 'times-table': {
      const a = pick(rng, lots), b = between(rng, 3, 9)
      return build(rng, difficulty, { topic, prompt: `Um Golem com seletor ${a} bate ${b} vezes. Quantos minérios ele extrai no total?`, answer: a * b, explanation: `${a} × ${b} = ${a * b}. É a tabuada do ${a}.` })
    }
    case 'multiples': {
      const lot = pick(rng, lots), k = between(rng, 3, 8)
      return build(rng, difficulty, { topic, prompt: `Quantos lotes completos de ${lot} cabem em ${lot * k}?`, answer: k, explanation: `${lot * k} ÷ ${lot} = ${k}. Como ${lot} × ${k} = ${lot * k}, ${lot * k} é múltiplo de ${lot}.` })
    }
    case 'remainder': {
      const lot = pick(rng, lots), q = between(rng, 1, 4), r = between(rng, 1, lot - 1), amount = lot * q + r
      return build(rng, difficulty, { topic, prompt: `Uma fornalha de lote ${lot} recebe ${amount} minérios. Quantos cristalizam (resto)?`, answer: r, explanation: `${amount} ÷ ${lot} = ${q} resto ${r}. Os ${r} que sobram cristalizam na entrada.` })
    }
    case 'lcm': {
      const a = pick(rng, lots), b = pick(rng, lots.filter((lot) => lot !== a))
      return build(rng, difficulty, { topic, prompt: `Um Altar recebe minérios de lote ${a} e de lote ${b}. Qual é o MMC (quantidade de cada um por fusão)?`, answer: lcm(a, b), explanation: `Múltiplos de ${a}: ${commonMultiples(a, 1, 4).join(', ')}… Múltiplos de ${b}: ${commonMultiples(b, 1, 4).join(', ')}… O menor em comum é ${lcm(a, b)}.` })
    }
    case 'gcd': {
      const pairs = [[4, 6], [6, 9], [8, 12], [12, 18], [10, 15], [24, 36], [12, 20], [18, 24]]
      const [a, b] = pick(rng, pairs)
      return build(rng, difficulty, { topic, prompt: `Qual é o MDC de ${a} e ${b}?`, answer: gcd(a, b), explanation: `Divisores de ${a}: ${divisors(a).join(', ')}. Divisores de ${b}: ${divisors(b).join(', ')}. O maior em comum é ${gcd(a, b)}.` })
    }
    case 'primes': {
      const count = pick(rng, [[10, 20], [20, 30], [30, 40]] as const)
      const found = Array.from({ length: count[1] - count[0] + 1 }, (_, i) => count[0] + i).filter(isPrime)
      return build(rng, difficulty, { topic, prompt: `Quantos números primos existem entre ${count[0]} e ${count[1]} (inclusive)?`, answer: found.length, explanation: `Os primos nesse intervalo são ${found.join(', ')}: ${found.length} números.` })
    }
    case 'factorization': {
      const n = pick(rng, [12, 18, 24, 36, 40, 45, 48, 60, 72, 84])
      const factors = factorize(n), prime = pick(rng, factors.map(([p]) => p)), exponent = factors.find(([p]) => p === prime)![1]
      return build(rng, difficulty, { topic, prompt: `Na fatoração de ${n} em primos, qual é o expoente do ${prime}?`, answer: exponent, explanation: `${n} = ${factors.map(([p, e]) => `${p}${e > 1 ? `^${e}` : ''}`).join(' × ')}. O ${prime} aparece com expoente ${exponent}.` })
    }
    case 'fractions': {
      const base = pick(rng, [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]]), k = between(rng, 2, 5)
      const reduced = simplifyFraction(base[0] * k, base[1] * k)
      return build(rng, difficulty, { topic, prompt: `Simplifique ${base[0] * k}/${base[1] * k}. Qual é o denominador?`, answer: reduced.denominator, explanation: `MDC(${base[0] * k}, ${base[1] * k}) = ${k}. Dividindo os dois por ${k}: ${reduced.numerator}/${reduced.denominator}.` })
    }
    case 'powers10': {
      const mantissa = pick(rng, [1.2, 2.5, 3.6, 4.8, 7.5]), exponent = between(rng, 2, 4)
      const value = Math.round(mantissa * 10 ** exponent)
      return build(rng, difficulty, { topic, prompt: `Quanto vale ${formatScientific(value)}? (escreva por extenso, sem pontos)`, answer: value, explanation: `${String(mantissa).replace('.', ',')} × 10^${exponent}: desloque a vírgula ${exponent} casas para a direita → ${value}.` })
    }
  }
}

/** Two questions per contract, drawn from the contract's topics first and the difficulty's topics second. */
export function makeContractQuiz(topics: readonly MathTopic[], difficulty: DifficultyId, seed: string, count = 2): QuizQuestion[] {
  const rng = createRng(`quiz:${seed}`)
  const allowed = DIFFICULTIES[difficulty].topics
  const preferred = topics.filter((topic) => allowed.includes(topic))
  const pool = preferred.length ? preferred : [...allowed]
  const questions: QuizQuestion[] = []
  for (let index = 0; index < count; index += 1) questions.push(makeQuestion(pool[index % pool.length], difficulty, rng))
  return questions
}

export function checkAnswer(question: QuizQuestion, value: number): boolean {
  return Number.isFinite(value) && value === question.answer
}

