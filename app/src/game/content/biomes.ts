import type { BiomeId, OreId, Terrain } from '../types'

export interface Weighted<T> {
  readonly id: T
  readonly weight: number
}

export interface BiomeDefinition {
  readonly id: BiomeId
  readonly name: string
  readonly epithet: string
  readonly description: string
  readonly reliefDescription: string
  readonly elevation: readonly [number, number]
  readonly terrainWeights: readonly Weighted<Terrain>[]
  readonly oreChance: number
  readonly oreWeights: readonly Weighted<OreId>[]
  readonly ground: string
  readonly edge: string
  readonly accent: string
}

export const BIOMES: Record<BiomeId, BiomeDefinition> = {
  'copper-vale': {
    id: 'copper-vale', name: 'Vale do Cobre', epithet: 'Encostas oxidadas',
    description: 'Vales abertos cobertos por cinza, escória e antigas ruínas de oficina. Os metais iniciais afloram entre camadas sedimentares.',
    reliefDescription: 'Relevo suave e ondulado, com poucos degraus e amplas áreas transitáveis.',
    elevation: [0, 3], oreChance: 0.34,
    terrainWeights: [
      { id: 'ash', weight: 38 }, { id: 'slag', weight: 22 }, { id: 'basalt', weight: 16 },
      { id: 'ruin', weight: 12 }, { id: 'acid', weight: 7 }, { id: 'crystal', weight: 5 },
    ],
    oreWeights: [
      { id: 'rusted-copper', weight: 44 }, { id: 'fossil-coal', weight: 22 },
      { id: 'bloody-iron', weight: 11 }, { id: 'whispering-quartz', weight: 7 },
      { id: 'raw-scales', weight: 5 }, { id: 'solar-gold', weight: 3 },
      { id: 'lunar-silver', weight: 3 }, { id: 'gray-mercury', weight: 2 },
      { id: 'abyssal-cobalt', weight: 2 }, { id: 'raw-ether-crystal', weight: 1 },
    ],
    ground: '#33453a', edge: '#9b754e', accent: '#e0aa6d',
  },
  'iron-gorge': {
    id: 'iron-gorge', name: 'Garganta de Ferro', epithet: 'Cristas de ferro sangrento',
    description: 'Corredores profundos entre paredes ferruginosas. O minério é abundante, mas o relevo quebra o terreno em cristas e degraus.',
    reliefDescription: 'Dorsais acentuadas e desníveis altos, gerados por ruído de crista em vez de colinas suaves.',
    elevation: [1, 6], oreChance: 0.39,
    terrainWeights: [
      { id: 'ironstone', weight: 38 }, { id: 'basalt', weight: 28 }, { id: 'ash', weight: 11 },
      { id: 'slag', weight: 9 }, { id: 'ruin', weight: 7 }, { id: 'magma', weight: 7 },
    ],
    oreWeights: [
      { id: 'bloody-iron', weight: 39 }, { id: 'fossil-coal', weight: 18 },
      { id: 'rusted-copper', weight: 9 }, { id: 'abyssal-cobalt', weight: 10 },
      { id: 'raw-scales', weight: 8 }, { id: 'whispering-quartz', weight: 6 },
      { id: 'draconic-obsidian', weight: 4 }, { id: 'solar-gold', weight: 2 },
      { id: 'lunar-silver', weight: 2 }, { id: 'gray-mercury', weight: 1 },
      { id: 'raw-ether-crystal', weight: 1 },
    ],
    ground: '#453630', edge: '#a05845', accent: '#e28a72',
  },
  'obsidian-crater': {
    id: 'obsidian-crater', name: 'Cratera de Obsidiana', epithet: 'Vidro e fogo dracônico',
    description: 'Uma região de placas vítreas, fendas incandescentes e jazidas raras. O calor revela minerais ausentes das regiões mais brandas.',
    reliefDescription: 'Elevações bruscas e bordas afiadas, com grande contraste entre crostas altas e fendas baixas.',
    elevation: [2, 7], oreChance: 0.31,
    terrainWeights: [
      { id: 'obsidian', weight: 37 }, { id: 'magma', weight: 23 }, { id: 'basalt', weight: 20 },
      { id: 'ash', weight: 8 }, { id: 'crystal', weight: 7 }, { id: 'acid', weight: 5 },
    ],
    oreWeights: [
      { id: 'draconic-obsidian', weight: 31 }, { id: 'fossil-coal', weight: 15 },
      { id: 'abyssal-cobalt', weight: 12 }, { id: 'bloody-iron', weight: 10 },
      { id: 'gray-mercury', weight: 9 }, { id: 'solar-gold', weight: 8 },
      { id: 'raw-scales', weight: 5 }, { id: 'whispering-quartz', weight: 4 },
      { id: 'rusted-copper', weight: 2 }, { id: 'lunar-silver', weight: 2 },
      { id: 'raw-ether-crystal', weight: 2 },
    ],
    ground: '#302b38', edge: '#86566f', accent: '#c18bce',
  },
  'ether-citadel': {
    id: 'ether-citadel', name: 'Cidadela Etérea', epithet: 'Terraços de ressonância',
    description: 'Terraços cristalinos tomados por relva luminosa e ruínas antigas. O Éter altera tanto a paisagem quanto a composição das jazidas.',
    reliefDescription: 'Plataformas escalonadas e suaves terraços, com elevação quantizada pelo fluxo de Éter.',
    elevation: [-1, 4], oreChance: 0.36,
    terrainWeights: [
      { id: 'ether', weight: 37 }, { id: 'crystal', weight: 29 }, { id: 'ruin', weight: 14 },
      { id: 'basalt', weight: 8 }, { id: 'acid', weight: 6 }, { id: 'ash', weight: 6 },
    ],
    oreWeights: [
      { id: 'raw-ether-crystal', weight: 31 }, { id: 'whispering-quartz', weight: 22 },
      { id: 'lunar-silver', weight: 14 }, { id: 'gray-mercury', weight: 10 },
      { id: 'solar-gold', weight: 8 }, { id: 'abyssal-cobalt', weight: 6 },
      { id: 'rusted-copper', weight: 3 }, { id: 'bloody-iron', weight: 2 },
      { id: 'fossil-coal', weight: 2 }, { id: 'draconic-obsidian', weight: 2 },
    ],
    ground: '#28443f', edge: '#4b9e8e', accent: '#8cf2d9',
  },
}

export const BIOME_LIST: readonly BiomeDefinition[] = Object.values(BIOMES)
