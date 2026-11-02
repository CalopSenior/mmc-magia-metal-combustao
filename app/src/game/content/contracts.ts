import type { AlloyId, BiomeId, ContractGoal, DepositRequest, DifficultyId, MathTopic, ResourceId } from '../types'
import { DIFFICULTIES } from './difficulty'
import { RECIPES } from './structures'

export interface GoalSpec {
  readonly resource: ResourceId | 'perfect-cycles'
  /** Whole fusions of an alloy (amount = fusions × yield × difficulty multiplier). */
  readonly fusions?: number
  /** Fixed amount, still scaled by the difficulty multiplier unless `byDifficulty` is given. */
  readonly amount?: number
  readonly byDifficulty?: Partial<Record<DifficultyId, number>>
}

export interface ContractDefinition {
  readonly id: string
  readonly order: number
  readonly biome: BiomeId
  readonly name: string
  readonly tagline: string
  readonly briefing: readonly string[]
  readonly topics: readonly MathTopic[]
  readonly lesson: string
  readonly goals: readonly GoalSpec[]
  readonly radius: number
  readonly seed: string
  readonly deposits: readonly DepositRequest[]
  /** Par duration in ticks at 1×; faster finishes earn more Éter. */
  readonly par: number
  readonly etherBase: number
  readonly requiresTech?: string
  /** Step-by-step plan shown to Aprendiz (and on demand to the others). */
  readonly plan: readonly string[]
}

export const CONTRACTS: readonly ContractDefinition[] = [
  {
    id: 'vale-1', order: 1, biome: 'copper-vale', name: 'Primeiras Batidas', tagline: 'Tabuada do 2 em ferro e cobre.',
    briefing: [
      'A guilda precisa de cobre para as primeiras engrenagens. Seu Golem Minerador tem um seletor nas costas: cada batida extrai exatamente esse número de minérios.',
      'O cobre vem em lotes de 2. Escolha um seletor que seja múltiplo de 2 (2, 4, 6 ou 8) e entregue o cobre ao Gnomo Coletor.',
    ],
    topics: ['times-table', 'multiples'], lesson: 'tabuada', radius: 9, seed: 'MMC-VALE-1-400',
    goals: [{ resource: 'rusted-copper', amount: 12 }], deposits: [{ ore: 'rusted-copper', count: 2 }], par: 1800, etherBase: 30,
    plan: ['Abra a Oficina e escolha o Golem Minerador na aba Extração; posicione-o sobre uma jazida de cobre.', 'Examine o Golem e gire o seletor de lote para 2, 4, 6 ou 8.', 'Construa esteiras até o Gnomo Coletor, apontando a saída na direção do fluxo.'],
  },
  {
    id: 'vale-2', order: 2, biome: 'copper-vale', name: 'A Fome da Fornalha', tagline: 'Resto zero: nem falta, nem sobra.',
    briefing: [
      'A Fornalha Devoradora só aceita lotes completos. O número gravado na boca dela é o Apetite de Lote: se o lote que chega não for múltiplo dele, a máquina sofre.',
      'Entregue 24 de cobre e conclua pelo menos 6 ciclos perfeitos, sem falta (fome) e sem sobra (cristais).',
    ],
    topics: ['remainder', 'multiples'], lesson: 'resto', radius: 9, seed: 'MMC-VALE-2-346',
    goals: [{ resource: 'rusted-copper', amount: 24 }, { resource: 'perfect-cycles', amount: 6 }], deposits: [{ ore: 'rusted-copper', count: 2 }], par: 2600, etherBase: 40,
    plan: ['Posicione a Fornalha Devoradora entre o Golem e o Coletor e regule o lote dela em 2 ou 4.', 'Regule o seletor do Golem num múltiplo do lote da Fornalha: lote 4 → seletor 4 ou 8.', 'Ligue o Golem à Fornalha, e a Fornalha ao Coletor; veja a Visão Matemática confirmar o resto 0.'],
  },
  {
    id: 'vale-3', order: 3, biome: 'copper-vale', name: 'Cobre e Carvão', tagline: 'A primeira liga: MMC(2, 3) = 6.',
    briefing: [
      'O Bronze Rúnico une Cobre (lote 2) e Carvão (lote 3). Para o Altar de Fusão fechar sem sobras, cada entrada precisa receber o MMC dos lotes: 6 unidades.',
      'Isso são 3 lotes de Cobre e 2 lotes de Carvão. Entregue as ligas ao Coletor.',
    ],
    topics: ['lcm', 'multiples'], lesson: 'mmc', radius: 10, seed: 'MMC-VALE-3-21',
    goals: [{ resource: 'runic-bronze', fusions: 1 }], deposits: [{ ore: 'rusted-copper', count: 2 }, { ore: 'fossil-coal', count: 2 }], par: 3200, etherBase: 55,
    plan: ['Construa o Altar de Fusão (3×3) e escolha a receita Bronze Rúnico.', 'Um Golem de cobre com seletor 2 (ou 6) e um de carvão com seletor 3 (ou 6).', 'Ligue cada um a uma borda do Altar. A cada 6 + 6 unidades sai uma remessa de 6 de Bronze.'],
  },
  {
    id: 'vale-4', order: 4, biome: 'copper-vale', name: 'Dobrando a Fornada', tagline: 'Prismas, confluências e silos.',
    briefing: [
      'A demanda cresce: é preciso dividir o fluxo e juntar lotes. O Prisma Divisor reparte lotes iguais, a Confluência soma lotes que chegam juntos e o Silo só libera múltiplos completos.',
      'Produza mais Bronze Rúnico usando ao menos uma dessas peças e termine com 12 ciclos perfeitos.',
    ],
    topics: ['fractions', 'multiples', 'lcm'], lesson: 'fracoes', radius: 11, seed: 'MMC-VALE-4-242',
    goals: [{ resource: 'runic-bronze', fusions: 3 }, { resource: 'perfect-cycles', amount: 12 }], deposits: [{ ore: 'rusted-copper', count: 3 }, { ore: 'fossil-coal', count: 3 }], par: 5400, etherBase: 70,
    plan: ['Um Golem de cobre com seletor 1 alimenta um Silo configurado em 6: ele só libera 6, 12, 18…', 'Use um Prisma para dividir um lote de 6 em 2 saídas de 3.', 'Ligue as saídas aos dois lados do Altar de Bronze.'],
  },
  {
    id: 'gorge-1', order: 5, biome: 'iron-gorge', name: 'Aço da Garganta', tagline: 'MMC(3, 4) = 12.',
    briefing: [
      'O Aço Cinzento é o esqueleto das máquinas de Tier 2: Carvão (lote 3) com Ferro Sangrento (lote 4). O MMC é 12: 4 lotes de Carvão e 3 lotes de Ferro.',
      'Atenção: o Ferro Sangrento causa o dobro de dano de "Fome de Lote" quando falta. Instale um Posto de Gnomos para consertar a fornalha.',
    ],
    topics: ['lcm', 'remainder'], lesson: 'mmc', radius: 11, seed: 'MMC-GORGE-5-151',
    goals: [{ resource: 'gray-steel', fusions: 2 }], deposits: [{ ore: 'fossil-coal', count: 2 }, { ore: 'bloody-iron', count: 2 }], par: 4800, etherBase: 80,
    plan: ['Carvão com seletor 3 ou 6; Ferro com seletor 4 ou 8.', 'O Altar de Aço Cinzento precisa de 12 de cada. 12 ÷ 3 = 4 lotes; 12 ÷ 4 = 3 lotes.', 'Um Posto de Gnomos perto do Altar conserta danos acidentais (gasta Éter).'],
  },
  {
    id: 'gorge-2', order: 6, biome: 'iron-gorge', name: 'Latão para os Prismas', tagline: 'MMC(2, 5) = 10 e as primeiras torres.',
    briefing: [
      'O Latão Ressonante junta Cobre (lote 2) e Quartzo (lote 5). Como 2 e 5 não têm fator em comum, o MMC é o produto: 10.',
      'Restos de cálculo viram Monstros de Escória, e o número no corpo deles é o resto que os criou. A Torre de Dano Exato os derruba.',
    ],
    topics: ['lcm', 'fractions', 'remainder'], lesson: 'mmc', radius: 11, seed: 'MMC-GORGE-6-205',
    goals: [{ resource: 'resonant-brass', fusions: 2 }], deposits: [{ ore: 'rusted-copper', count: 2 }, { ore: 'whispering-quartz', count: 2 }], par: 4800, etherBase: 85,
    plan: ['Cobre com seletor 2, 4, 6 ou 10; Quartzo com seletor 5.', 'Para 10 de cada: 5 lotes de Cobre e 2 lotes de Quartzo.', 'Uma Torre perto da fábrica protege contra a escória. Dano 1 derruba um slime de resto 1.'],
  },
  {
    id: 'gorge-3', order: 7, biome: 'iron-gorge', name: 'Ferro Escamado', tagline: 'MDC: o que os lotes têm em comum.',
    briefing: [
      'Ferro (lote 4) e Escamas (lote 6) compartilham o fator 2. MDC(4, 6) = 2, então o MMC é 4 × 6 ÷ 2 = 12 — bem menor que o produto 24.',
      'Quanto maior o MDC, menos minério é preciso para fechar a fusão. Descubra a economia.',
    ],
    topics: ['gcd', 'lcm'], lesson: 'mdc', radius: 12, seed: 'MMC-GORGE-7-68',
    goals: [{ resource: 'scaled-iron', fusions: 2 }], deposits: [{ ore: 'bloody-iron', count: 2 }, { ore: 'raw-scales', count: 2 }], par: 5400, etherBase: 90,
    plan: ['Ferro com seletor 4 ou 8; Escamas com seletor 6.', 'Cada fusão pede 12 de Ferro (3 lotes) e 12 de Escamas (2 lotes).', 'Compare: 4 × 6 = 24, mas 24 ÷ MDC 2 = 12.'],
  },
  {
    id: 'gorge-4', order: 8, biome: 'iron-gorge', name: 'Sincronia de Tempo', tagline: 'Distância, velocidade e Entrepostos.',
    briefing: [
      'Duas jazidas distantes, duas esteiras de comprimentos diferentes. O recurso da esteira longa chega depois; use esteiras mais rápidas (2× e 4×) ou um Entreposto de Carga para sincronizar a chegada.',
      'Entreposto: fecha caixas de 10, 50 ou 100 e um Golem Transportador leva a caixa por cima dos obstáculos.',
    ],
    topics: ['fractions', 'multiples', 'lcm'], lesson: 'fracoes', radius: 13, seed: 'MMC-GORGE-8-127',
    goals: [{ resource: 'gray-steel', fusions: 2 }, { resource: 'resonant-brass', fusions: 1 }], deposits: [{ ore: 'fossil-coal', count: 2 }, { ore: 'bloody-iron', count: 2 }, { ore: 'rusted-copper', count: 2 }, { ore: 'whispering-quartz', count: 2 }], par: 7800, etherBase: 110,
    plan: ['Tempo = distância ÷ velocidade. Uma esteira nível 2 percorre o dobro da distância no mesmo tempo.', 'Dois Entrepostos com o mesmo canal formam um par: o primeiro recebe, o segundo entrega.', 'Caixas de 10 combinam bem com lotes de 2 e 5.'],
  },
  {
    id: 'crater-1', order: 9, biome: 'obsidian-crater', name: 'Amálgama Azul', tagline: 'Fatoração: 5 × 7 = 35.',
    briefing: [
      'Quartzo (5) e Cobalto Abissal (7) são números primos entre si: nenhum fator em comum. O MMC é o produto, 35.',
      'O Cobalto instável, se entupir a esteira, gera Monstros de Escória velozes. Não deixe sobrar resto.',
    ],
    topics: ['primes', 'factorization', 'lcm'], lesson: 'primos', radius: 12, seed: 'MMC-CRATER-9-236',
    goals: [{ resource: 'azure-amalgam', fusions: 1 }], deposits: [{ ore: 'whispering-quartz', count: 2 }, { ore: 'abyssal-cobalt', count: 2 }], par: 6000, etherBase: 110,
    plan: ['Quartzo com seletor 5; Cobalto com seletor 7 (a tabuada do 7).', '35 = 5 × 7: 7 lotes de Quartzo e 5 lotes de Cobalto.', 'Uma Torre com dano 1 resolve slimes de resto pequeno.'],
  },
  {
    id: 'crater-2', order: 10, biome: 'obsidian-crater', name: 'Vidro Vulcânico', tagline: 'Fatores primos: 6 = 2·3 e 8 = 2³.',
    briefing: [
      'Para achar o MMC por fatoração, tome cada primo com o MAIOR expoente. 6 = 2 × 3 e 8 = 2³. Então o MMC = 2³ × 3 = 24.',
      'O Vidro Vulcânico isola as tubulações e conterá a escória.',
    ],
    topics: ['factorization', 'lcm'], lesson: 'fatoracao', radius: 12, seed: 'MMC-CRATER-10-198',
    goals: [{ resource: 'volcanic-glass', fusions: 2 }], deposits: [{ ore: 'raw-scales', count: 2 }, { ore: 'draconic-obsidian', count: 2 }], par: 7200, etherBase: 120,
    plan: ['Escamas com seletor 6; Obsidiana com seletor 8 (é pesada: esteiras reforçadas ajudam).', '24 = 4 lotes de 6 e 3 lotes de 8.', 'Use esteiras de nível 2 no trecho longo da Obsidiana.'],
  },
  {
    id: 'crater-3', order: 11, biome: 'obsidian-crater', name: 'Cromo contra a Acidez', tagline: 'Coprimos: MDC(4, 7) = 1.',
    briefing: [
      'Os lagos ácidos corroem tudo. O Cromo Sombrio (Ferro 4 + Cobalto 7) resiste ao ácido. Como 4 e 7 são coprimos, MDC = 1 e MMC = 28.',
      'Esteiras só atravessam a lava e o ácido com a Levitação — sem ela, contorne.',
    ],
    topics: ['gcd', 'lcm', 'primes'], lesson: 'mdc', radius: 13, seed: 'MMC-CRATER-11-201',
    goals: [{ resource: 'dark-chrome', fusions: 2 }], deposits: [{ ore: 'bloody-iron', count: 2 }, { ore: 'abyssal-cobalt', count: 2 }], par: 7800, etherBase: 125,
    plan: ['Ferro com seletor 4 ou 8; Cobalto com seletor 7.', '28 = 7 lotes de Ferro e 4 lotes de Cobalto.', 'Planeje o caminho: obstáculos tornam o trajeto mais longo, e esteiras longas atrasam o minério.'],
  },
  {
    id: 'crater-4', order: 12, biome: 'obsidian-crater', name: 'Ouro Dracônico', tagline: 'O ápice das ligas duplas: 8 × 9 = 72.',
    briefing: [
      'Obsidiana (8) e Ouro Solar (9): coprimos de novo, MMC = 72. Cada fusão pede 72 de cada: 9 lotes de Obsidiana e 8 de Ouro.',
      'O valor comercial é altíssimo. Se tiver a Runa × 10, a produção rende dez vezes mais por fusão.',
    ],
    topics: ['lcm', 'powers10', 'times-table'], lesson: 'potencias10', radius: 13, seed: 'MMC-CRATER-12-112',
    goals: [{ resource: 'draconic-gold', fusions: 1 }], deposits: [{ ore: 'draconic-obsidian', count: 3 }, { ore: 'solar-gold', count: 3 }], par: 9600, etherBase: 150,
    plan: ['Obsidiana com seletor 8; Ouro com seletor 9 (tabuada do 9).', 'Um Silo ajuda a juntar 72 antes de entregar.', 'Opcional: uma Runa × 10 no Altar multiplica o rendimento.'],
  },
  {
    id: 'ether-1', order: 13, biome: 'ether-citadel', name: 'Electrum Astral', tagline: '7 × 9 = 63, com Runas.',
    briefing: [
      'Cobalto (7) e Ouro Solar (9) fazem o Electrum Astral: MMC 63, um grande teste de tabuada.',
      'O Electrum é a base dos encantamentos de escala e entrará, mais tarde, na Prata Estelar.',
    ],
    topics: ['times-table', 'lcm'], lesson: 'mmc', radius: 13, seed: 'MMC-ETHER-13-144',
    goals: [{ resource: 'astral-electrum', fusions: 2 }], deposits: [{ ore: 'abyssal-cobalt', count: 2 }, { ore: 'solar-gold', count: 2 }], par: 9000, etherBase: 160,
    plan: ['Cobalto com seletor 7; Ouro com seletor 9.', '63 = 9 lotes de Cobalto e 7 lotes de Ouro.', 'Cuide dos primos: o 7 não "fecha" com o 9 antes do 63.'],
  },
  {
    id: 'ether-2', order: 14, biome: 'ether-citadel', name: 'Aço Etéreo', tagline: 'Câmara de Transmutação: MMC(12, 10) = 60.',
    briefing: [
      'A Câmara de Transmutação combina duas ligas de Nível 1. Aço Cinzento tem lote 12 e Latão Ressonante tem lote 10: 12 = 2² × 3 e 10 = 2 × 5, então MMC = 2² × 3 × 5 = 60.',
      'São 5 remessas de Aço Cinzento e 6 de Latão Ressonante. Se a Câmara tiver fome e entupimento ao mesmo tempo, nasce um Golem Corrompido.',
    ],
    topics: ['factorization', 'lcm'], lesson: 'fatoracao', radius: 14, seed: 'MMC-ETHER-14-15', requiresTech: 'metallurgy-2',
    goals: [{ resource: 'ether-steel', fusions: 1 }], deposits: [{ ore: 'fossil-coal', count: 2 }, { ore: 'bloody-iron', count: 2 }, { ore: 'rusted-copper', count: 2 }, { ore: 'whispering-quartz', count: 2 }], par: 14400, etherBase: 220,
    plan: ['Dois Altares: um de Aço Cinzento (carvão 3 + ferro 4) e um de Latão (cobre 2 + quartzo 5).', 'A Câmara recebe 60 de cada liga: o Aço chega em 5 remessas de 12 e o Latão em 6 de 10.', 'Para o Golem Corrompido: dano que divide o HP (60): 1, 2, 3, 4, 5, 6, 10 ou 12.'],
  },
  {
    id: 'ether-3', order: 15, biome: 'ether-citadel', name: 'Prata Estelar', tagline: 'Catalisador modular: 63 + 3 = 66 = 6 × 11.',
    briefing: [
      '63 (Electrum) não é múltiplo de 11 (Prata Lunar). O Cristal de Éter Bruto é curinga: três cristais levam 63 a 66 = 6 × 11.',
      'Monte lotes de 11 com um Silo configurado em 11 e insira os cristais no botão de ajuste da Câmara.',
    ],
    topics: ['primes', 'multiples', 'remainder'], lesson: 'primos', radius: 14, seed: 'MMC-ETHER-15-321', requiresTech: 'metallurgy-2',
    goals: [{ resource: 'stellar-silver', fusions: 1 }], deposits: [{ ore: 'abyssal-cobalt', count: 2 }, { ore: 'solar-gold', count: 2 }, { ore: 'lunar-silver', count: 2 }, { ore: 'raw-ether-crystal', count: 1 }], par: 16200, etherBase: 240,
    plan: ['Produza Electrum Astral (63) num Altar e leve-o à Câmara.', 'Prata Lunar sai de um Silo com lote 11; precisa de 66 (6 lotes).', 'No Examinar, insira 3 Cristais de Éter na Câmara: 63 + 3 = 66.'],
  },
  {
    id: 'ether-4', order: 16, biome: 'ether-citadel', name: 'Núcleo de Dragão', tagline: 'MMC(60, 72) = 360 e notação científica.',
    briefing: [
      'O Núcleo de Dragão exige Aço Etéreo (60) e Adamantina Dorsal (72): 60 = 2² × 3 × 5 e 72 = 2³ × 3², MMC = 2³ × 3² × 5 = 360.',
      'Contratos lendários pedem milhares de unidades. Runas × 10 e × 100 condensam a produção em caixas rúnicas: 3,6 × 10² vira 3,6 × 10⁴.',
    ],
    topics: ['powers10', 'factorization', 'lcm'], lesson: 'potencias10', radius: 15, seed: 'MMC-ETHER-16-308', requiresTech: 'rune-10',
    goals: [{ resource: 'dragon-core', byDifficulty: { apprentice: 3600, artisan: 3600, engineer: 36000, master: 360000 } }],
    deposits: [{ ore: 'fossil-coal', count: 2 }, { ore: 'bloody-iron', count: 2 }, { ore: 'rusted-copper', count: 2 }, { ore: 'whispering-quartz', count: 2 }, { ore: 'raw-scales', count: 2 }, { ore: 'draconic-obsidian', count: 2 }, { ore: 'solar-gold', count: 2 }],
    par: 24000, etherBase: 400,
    plan: ['Aço Etéreo (60) e Adamantina Dorsal (72, de Vidro Vulcânico e Ouro Dracônico) chegam à Câmara.', 'A Câmara precisa de uma Runa × 10 no mínimo; cada nível de runa multiplica a saída por 10.', 'Aprendiz: 3 600 = 3,6 × 10³. Mestre: 360 000 = 3,6 × 10⁵.'],
  },
]

export const CONTRACT_BY_ID = Object.fromEntries(CONTRACTS.map((contract) => [contract.id, contract])) as Record<string, ContractDefinition>

export function contractsForBiome(biome: BiomeId): ContractDefinition[] {
  return CONTRACTS.filter((contract) => contract.biome === biome)
}

export function resolveGoals(goals: readonly GoalSpec[], difficulty: DifficultyId): ContractGoal[] {
  const multiplier = DIFFICULTIES[difficulty].goalMultiplier
  return goals.map((goal) => {
    if (goal.byDifficulty) return { resource: goal.resource, amount: goal.byDifficulty[difficulty] ?? Object.values(goal.byDifficulty)[0] ?? 0 }
    if (goal.fusions !== undefined) {
      const output = RECIPES[goal.resource as AlloyId].output
      return { resource: goal.resource, amount: goal.fusions * multiplier * output }
    }
    return { resource: goal.resource, amount: (goal.amount ?? 0) * multiplier }
  })
}

/** Highest campaign order the player may start: finishing a contract opens the next one. */
export function unlockedOrder(campaign: Record<string, { completed: boolean }>): number {
  let highest = 0
  for (const [id, record] of Object.entries(campaign)) {
    if (record.completed) highest = Math.max(highest, CONTRACT_BY_ID[id]?.order ?? 0)
  }
  return highest + 1
}
