import type { DifficultyId, MathTopic } from '../types'

export type HintLevel = 'guided' | 'light' | 'none'

export interface DifficultyDefinition {
  readonly id: DifficultyId
  readonly name: string
  readonly grades: string
  readonly tagline: string
  readonly focus: string
  readonly details: readonly string[]
  /** Multiplies fatigue / monster damage. */
  readonly penalty: number
  /** Crystals needed before a Monstro de Escória is born. */
  readonly spawnThreshold: number
  readonly monsters: boolean
  /** Whether a collapsing factory ends the contract. */
  readonly canFail: boolean
  readonly hints: HintLevel
  /** Contract goals are multiplied by this many fusions. */
  readonly goalMultiplier: number
  readonly startEther: number
  readonly etherMultiplier: number
  /** Quiz style at the end of a contract. */
  readonly quiz: 'choice' | 'input'
  /** The largest lot the contracts and endless generator ask for. */
  readonly maxLot: number
  readonly topics: readonly MathTopic[]
  /** Math Vision starts switched on. */
  readonly mathVision: boolean
  readonly color: string
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDefinition> = {
  apprentice: {
    id: 'apprentice', name: 'Aprendiz', grades: '6º e 7º ano', color: '#8fcf8c',
    tagline: 'Tabuada, múltiplos e divisão com resto.',
    focus: 'Fixar a tabuada e perceber o que é "resto zero".',
    details: [
      'Erros avisam e explicam a conta, mas quase não machucam as máquinas.',
      'A Visão Matemática começa ligada e mostra as contas prontas.',
      'Provas finais com alternativas e dicas.',
      'Monstros de Escória aparecem devagar e são fracos.',
    ],
    penalty: 0.4, spawnThreshold: 8, monsters: true, canFail: false, hints: 'guided', goalMultiplier: 1,
    startEther: 40, etherMultiplier: 1, quiz: 'choice', maxLot: 6,
    topics: ['times-table', 'multiples', 'remainder'], mathVision: true,
  },
  artisan: {
    id: 'artisan', name: 'Artesão', grades: '8º e 9º ano', color: '#e0c06a',
    tagline: 'MMC, MDC e proporções.',
    focus: 'Calcular o MMC de dois lotes e perceber como o MDC economiza máquinas.',
    details: [
      'Danos moderados; a fábrica pode quebrar se você ignorar os avisos.',
      'Dicas surgem só quando a máquina falha.',
      'Provas finais com alternativas.',
      'Metas pedem o dobro de fusões.',
    ],
    penalty: 0.75, spawnThreshold: 6, monsters: true, canFail: true, hints: 'light', goalMultiplier: 2,
    startEther: 30, etherMultiplier: 1.15, quiz: 'choice', maxLot: 9,
    topics: ['multiples', 'remainder', 'lcm', 'gcd', 'fractions'], mathVision: true,
  },
  engineer: {
    id: 'engineer',
    name: 'Engenheiro', grades: '1º e 2º ano do Ensino Médio', color: '#e0956a',
    tagline: 'Fatoração, números primos e potências de 10.',
    focus: 'Decompor em fatores primos, lidar com 11 e 13 e usar Runas de base 10.',
    details: [
      'Dano total e monstros em ritmo normal.',
      'A Visão Matemática mostra a conta, mas não a resposta.',
      'Provas finais com resposta digitada.',
      'Metas maiores e primos nas jazidas.',
    ],
    penalty: 1, spawnThreshold: 4, monsters: true, canFail: true, hints: 'light', goalMultiplier: 2,
    startEther: 20, etherMultiplier: 1.3, quiz: 'input', maxLot: 13,
    topics: ['lcm', 'gcd', 'primes', 'factorization', 'fractions', 'powers10'], mathVision: false,
  },
  master: {
    id: 'master', name: 'Mestre Etéreo', grades: '3º ano do Ensino Médio', color: '#c58be6',
    tagline: 'Notação científica, escala e otimização.',
    focus: 'Planejar a fábrica inteira antes de ligar: metas em notação científica e poucos erros possíveis.',
    details: [
      'Dano 50% maior e monstros mais rápidos; um colapso encerra o contrato.',
      'Sem dicas: o Códice e o Oráculo são a sua consulta.',
      'Provas com resposta digitada e metas em notação científica.',
      'Maior recompensa de Éter.',
    ],
    penalty: 1.5, spawnThreshold: 3, monsters: true, canFail: true, hints: 'none', goalMultiplier: 3,
    startEther: 10, etherMultiplier: 1.6, quiz: 'input', maxLot: 13,
    topics: ['lcm', 'gcd', 'primes', 'factorization', 'powers10'], mathVision: false,
  },
}

export const DIFFICULTY_LIST: readonly DifficultyDefinition[] = Object.values(DIFFICULTIES)

export const TOPIC_LABELS: Record<MathTopic, string> = {
  'times-table': 'Tabuada',
  multiples: 'Múltiplos',
  remainder: 'Divisão com resto',
  lcm: 'MMC',
  gcd: 'MDC',
  primes: 'Números primos',
  factorization: 'Fatoração',
  fractions: 'Frações e proporções',
  powers10: 'Potências de 10',
}
