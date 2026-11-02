import type { PixelMatrix } from './pixelMatrices'

export interface Person {
  /** Key of the pixel-art portrait in `PORTRAIT_ART`. */
  readonly id: string
  readonly name: string
  /** Shown under the first name, in the order of the official credits. */
  readonly first: string
  readonly rest: string
}

const person = (id: string, first: string, rest: string): Person => ({ id, name: `${first} ${rest}`, first, rest })

export const TEAM: readonly Person[] = [
  person('daniela', 'Daniela', 'Estelina Lopes Cunha'),
  person('denise', 'Denise', 'de Assis Moura Avelar'),
  person('fernanda', 'Fernanda', 'Arruda da Conceição'),
  person('gabriel', 'Gabriel', 'dos Santos Divino'),
  person('luiz', 'Luiz', 'Gustavo Couto de Oliveira'),
  person('marilia', 'Marília', 'da Silva de Jesus'),
  person('thiago', 'Thiago', 'Neves de Assis de Paula'),
  person('vitoria', 'Vitória', 'Naomi Kobama'),
]

export const SUPERVISOR: Person = person('aline', 'Aline', 'Barcelo da Costa')
export const COORDINATOR: Person = person('isabella', 'Isabella', 'Moreira de Paiva Correa')

export interface Supporter {
  readonly id: 'ifrj' | 'fevre' | 'pibid'
  readonly name: string
  readonly caption: string
  readonly palette: readonly string[]
  readonly matrix: PixelMatrix
}

function fevreMark(): PixelMatrix {
  const width = 17, height = 15
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const half = Math.floor(y * 8.4 / (height - 1)), distance = Math.hypot(x - 8, y - 9.2)
    if (distance <= 3.7) return 2
    if (distance <= 4.7) return 3
    return Math.abs(x - 8) <= half ? 1 : 0
  }))
}

export const SUPPORTERS: readonly Supporter[] = [
  {
    id: 'ifrj', name: 'Instituto Federal do Rio de Janeiro', caption: 'Campus Volta Redonda',
    palette: ['', '#c9252c', '#3a9a3a'],
    matrix: [
      [1, 0, 2, 2, 2, 2],
      [2, 0, 2, 0, 0, 0],
      [2, 0, 2, 2, 2, 0],
      [2, 0, 2, 0, 0, 0],
      [2, 0, 2, 0, 0, 0],
    ],
  },
  { id: 'fevre', name: 'Colégio Getúlio Vargas', caption: 'Escola parceira do Pibid', palette: ['', '#d32f2f', '#14237a', '#f6efe0'], matrix: fevreMark() },
  {
    id: 'pibid', name: 'Pibid', caption: 'Programa Institucional de Bolsa de Iniciação à Docência',
    palette: ['', '#1f6fa5', '#4fa83f', '#cfe3f0'],
    matrix: [
      [0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 3, 3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 3, 3, 1],
      [1, 3, 1, 1, 1, 1, 3, 1, 3, 1, 1, 1, 1, 3, 1],
      [1, 3, 3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 3, 3, 1],
      [1, 3, 1, 1, 1, 1, 3, 1, 3, 1, 1, 1, 1, 3, 1],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    ],
  },
]

/** The maths the player has really practised: shown at the end, as the answer to "what did I learn?". */
export const PRACTISED_TOPICS: readonly { readonly title: string; readonly line: string }[] = [
  { title: 'Múltiplos e MMC', line: 'Cada liga pede lotes do mesmo tamanho: o MMC diz quando eles se encontram.' },
  { title: 'Divisão com resto', line: 'Resto zero é ciclo perfeito. Resto diferente de zero vira Entupimento.' },
  { title: 'Divisores e primos', line: 'O Portal Modular só deixa passar primos e múltiplos de 12.' },
  { title: 'Potências de 10', line: 'As Runas ×10, ×100 e ×1000 mostram a notação científica na prática.' },
  { title: 'Proporção', line: 'O Prisma divide a carga na razão que você escolher.' },
]
