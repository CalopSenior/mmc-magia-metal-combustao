import type { MathTopic } from '../types'

export type LessonDemo = 'times' | 'division' | 'multiples' | 'gcd' | 'primes' | 'factor' | 'power10' | 'fractions'

export interface LessonSection { readonly heading: string; readonly body: string }

export interface Lesson {
  readonly id: string
  readonly title: string
  readonly grades: string
  readonly topic: MathTopic
  readonly summary: string
  readonly sections: readonly LessonSection[]
  readonly example: { readonly title: string; readonly steps: readonly string[] }
  readonly inGame: string
  readonly demo: LessonDemo
}

export const LESSONS: readonly Lesson[] = [
  {
    id: 'tabuada', title: 'Tabuada e múltiplos', grades: '6º ano', topic: 'times-table',
    summary: 'Cada minério tem um lote: 2, 3, 4… 9. Os múltiplos do lote são as quantidades que cabem sem sobra.',
    sections: [
      { heading: 'O que é um múltiplo?', body: 'Múltiplos de 3 são os resultados da tabuada do 3: 3, 6, 9, 12, 15… Você chega a cada um somando 3 de novo.' },
      { heading: 'Atalhos que ajudam na fábrica', body: 'Múltiplos de 2 terminam em 0, 2, 4, 6 ou 8 (números pares). Múltiplos de 5 terminam em 0 ou 5. Múltiplos de 9 têm algarismos que somam 9, 18, 27…' },
      { heading: 'Por que isso importa?', body: 'Uma máquina com Apetite de Lote 4 só funciona bem se a quantidade que chega por ciclo estiver na tabuada do 4.' },
    ],
    example: { title: 'Lote 4 e uma remessa de 12', steps: ['Tabuada do 4: 4, 8, 12.', '12 está na lista, então 12 é múltiplo de 4.', '3 × 4 = 12: três lotes completos. Resto zero.'] },
    inGame: 'Gire o seletor do Golem Minerador para um múltiplo do lote da máquina que vai receber o minério.',
    demo: 'times',
  },
  {
    id: 'resto', title: 'Divisão com resto', grades: '6º e 7º ano', topic: 'remainder',
    summary: 'Quantidade ÷ lote = quociente e resto. Em M.M.C., só o resto zero é perfeito.',
    sections: [
      { heading: 'Quociente e resto', body: 'Dividir 9 por 7 dá 1 e sobram 2: 9 = 1 × 7 + 2. O 1 é o quociente (lotes completos) e o 2 é o resto.' },
      { heading: 'Falta e sobra', body: 'Se a quantidade é menor que o lote (5 para um lote de 7), a máquina opera no vazio: é a Fome de Lote. Se sobra resto (9 para 7), os minérios excedentes cristalizam: é o Entupimento.' },
      { heading: 'Resto zero', body: 'Quando o resto é 0, a produção tem 100% de eficiência e gera Éter Puro de bônus.' },
    ],
    example: { title: 'Fornalha de lote 7', steps: ['Chegam 14: 14 ÷ 7 = 2 resto 0. Perfeito.', 'Chegam 9: 9 ÷ 7 = 1 resto 2. Dois minérios cristalizam.', 'Chegam 5: 5 ÷ 7 = 0 resto 5. A máquina sofre Fome de Lote.'] },
    inGame: 'Passe o mouse numa máquina com a Visão Matemática ligada e leia a conta: ela mostra quociente e resto de cada lote que chega.',
    demo: 'division',
  },
  {
    id: 'mmc', title: 'Mínimo Múltiplo Comum (MMC)', grades: '6º e 7º ano', topic: 'lcm',
    summary: 'O MMC é o menor número que é múltiplo de dois lotes ao mesmo tempo. É a quantidade em que um Altar fecha sem sobras.',
    sections: [
      { heading: 'Listando múltiplos', body: 'Múltiplos de 2: 2, 4, 6, 8… Múltiplos de 3: 3, 6, 9… O primeiro que aparece nas duas listas é o 6. Então MMC(2, 3) = 6.' },
      { heading: 'Quantos lotes de cada?', body: 'MMC ÷ lote dá o número de lotes: 6 ÷ 2 = 3 lotes de Cobre e 6 ÷ 3 = 2 lotes de Carvão. É a "proporção de lotes" do Bronze Rúnico.' },
      { heading: 'Quando um lote já é múltiplo do outro', body: 'MMC(24, 72) = 72, pois 72 já é múltiplo de 24. Reconhecer isso economiza tempo.' },
    ],
    example: { title: 'Aço Cinzento: Carvão (3) e Ferro (4)', steps: ['Múltiplos de 3: 3, 6, 9, 12…', 'Múltiplos de 4: 4, 8, 12…', 'MMC(3, 4) = 12 → 12 ÷ 3 = 4 lotes de Carvão; 12 ÷ 4 = 3 lotes de Ferro.'] },
    inGame: 'Ao escolher uma receita no Altar, o Códice e a Visão Matemática mostram o MMC e a proporção de lotes. O Oráculo do MMC, no Grimório, desenha as réguas de múltiplos.',
    demo: 'multiples',
  },
  {
    id: 'mdc', title: 'Máximo Divisor Comum (MDC)', grades: '8º e 9º ano', topic: 'gcd',
    summary: 'O MDC é o maior número que divide os dois lotes. Ele revela quanto minério você economiza.',
    sections: [
      { heading: 'Divisores em comum', body: 'Divisores de 4: 1, 2, 4. Divisores de 6: 1, 2, 3, 6. O maior em comum é 2. Então MDC(4, 6) = 2.' },
      { heading: 'A relação entre MMC e MDC', body: 'Para dois números a e b: MMC(a, b) × MDC(a, b) = a × b. Por isso MMC(4, 6) = 24 ÷ 2 = 12.' },
      { heading: 'Coprimos', body: 'Quando o MDC é 1, os números são coprimos e o MMC é o produto: MMC(5, 7) = 35.' },
    ],
    example: { title: 'Ferro Escamado: Ferro (4) e Escamas (6)', steps: ['MDC(4, 6) = 2.', 'MMC = 4 × 6 ÷ 2 = 12.', 'Sem o fator comum, seriam 24 de cada minério. Com ele, 12.'] },
    inGame: 'Compare ligas de lotes coprimos (Amálgama Azul, 35) com as de lotes que dividem fatores (Adamantina, 72).',
    demo: 'gcd',
  },
  {
    id: 'primos', title: 'Números primos', grades: '6º ao 9º ano', topic: 'primes',
    summary: 'Um primo só tem dois divisores: 1 e ele mesmo. Prata Lunar (11) e Mercúrio Cinzento (13) são primos.',
    sections: [
      { heading: 'Reconhecendo primos', body: '2, 3, 5, 7, 11, 13, 17, 19… Para testar um número, tente dividi-lo pelos primos menores que sua raiz quadrada.' },
      { heading: 'Lotes primos', body: 'Um lote primo não se divide em lotes menores iguais. Para montar um lote de 11, use um Silo configurado em 11, ou some 9 + 2 numa Confluência sincronizada.' },
      { heading: 'Primos e o Teleporte', body: 'O Portal Modular só aceita quantidades que sejam um número primo ou múltiplo de 12: 11 passa, 13 passa, 24 passa, 14 não passa.' },
    ],
    example: { title: 'Prata Estelar: 63 e 11', steps: ['63 = 3² × 7 e 11 é primo.', 'MMC(63, 11) = 693: grande demais.', 'Truque do contrato: 63 + 3 de Éter = 66 = 6 × 11.'] },
    inGame: 'Use o Cristal de Éter Bruto, o curinga, para corrigir uma falta de 1 a 9 unidades em um lote.',
    demo: 'primes',
  },
  {
    id: 'fatoracao', title: 'Fatoração em primos', grades: '8º e 9º ano', topic: 'factorization',
    summary: 'Todo número se decompõe em fatores primos. Com isso, o MMC e o MDC saem sem listar múltiplos.',
    sections: [
      { heading: 'Árvore de fatores', body: '60 = 2 × 30 = 2 × 2 × 15 = 2 × 2 × 3 × 5 = 2² × 3 × 5.' },
      { heading: 'MMC pelos fatores', body: 'Tome cada primo com o MAIOR expoente. 12 = 2² × 3 e 10 = 2 × 5 → MMC = 2² × 3 × 5 = 60.' },
      { heading: 'MDC pelos fatores', body: 'Tome apenas os primos que aparecem nos dois, com o MENOR expoente. 12 = 2² × 3 e 18 = 2 × 3² → MDC = 2 × 3 = 6.' },
    ],
    example: { title: 'Núcleo de Dragão: 60 e 72', steps: ['60 = 2² × 3 × 5', '72 = 2³ × 3²', 'MMC = 2³ × 3² × 5 = 360.'] },
    inGame: 'Câmaras de Transmutação usam números grandes: fatore antes de ligar as esteiras. O Golem Corrompido só cai com dano que é divisor do HP.',
    demo: 'factor',
  },
  {
    id: 'fracoes', title: 'Frações e proporções', grades: '7º e 8º ano', topic: 'fractions',
    summary: 'Dividir um fluxo em partes iguais é o mesmo que escrever uma fração. Proporção 2 : 1 significa 2/3 e 1/3.',
    sections: [
      { heading: 'Divisão igual', body: 'Um Prisma de 3 saídas dá 1/3 do lote para cada uma. Com 12 unidades, saem 4 em cada.' },
      { heading: 'Divisão que não fecha', body: '14 unidades em 3 saídas: 14 ÷ 3 = 4 resto 2. O Prisma trava e retém o resto até chegar mais minério.' },
      { heading: 'Proporção', body: 'Com o Prisma Ajustável, 2 : 1 divide em 2/3 e 1/3. Uma remessa de 9 vira 6 e 3. O lote precisa ser múltiplo de 2 + 1 = 3.' },
    ],
    example: { title: 'Simplificando 14/21', steps: ['MDC(14, 21) = 7.', '14 ÷ 7 = 2 e 21 ÷ 7 = 3.', 'Então 14/21 = 2/3: a proporção 2 : 3 também fecha o ciclo.'] },
    inGame: 'Configure o número de saídas do Prisma e veja a Visão Matemática mostrar a fração de cada saída.',
    demo: 'fractions',
  },
  {
    id: 'potencias10', title: 'Potências de 10 e notação científica', grades: '9º ano ao 3º médio', topic: 'powers10',
    summary: 'Runas × 10, × 100 e × 1000 multiplicam por 10¹, 10² e 10³. Contratos gigantes ficam fáceis de escrever.',
    sections: [
      { heading: 'Potência de 10', body: '10¹ = 10, 10² = 100, 10³ = 1000. O expoente é a quantidade de zeros.' },
      { heading: 'Notação científica', body: 'Um número grande vira "mantissa × 10 elevado a n": 3 600 = 3,6 × 10³. A mantissa fica entre 1 e 10.' },
      { heading: 'Multiplicando', body: 'Multiplicar por 10ⁿ desloca a vírgula n casas para a direita: 3,6 × 10² = 360.' },
    ],
    example: { title: 'Núcleo de Dragão: 360 unidades por fusão', steps: ['Runa × 10: 360 × 10 = 3 600 = 3,6 × 10³.', 'Runa × 100: 360 × 100 = 36 000 = 3,6 × 10⁴.', 'Runa × 1000: 360 000 = 3,6 × 10⁵.'] },
    inGame: 'A Caixa Rúnica Condensada é um único objeto com o valor 10ⁿ: a engine não precisa de milhares de sprites.',
    demo: 'power10',
  },
]

export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((lesson) => [lesson.id, lesson])) as Record<string, Lesson>
