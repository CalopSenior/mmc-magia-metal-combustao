import type { OreId } from '../types'

export type OreRarity = 'Comum' | 'Incomum' | 'Raro' | 'Épico' | 'Lendário'
export type OreShape = 'node' | 'seam' | 'cluster' | 'shard' | 'scales' | 'liquid'

export interface OreDefinition {
  readonly id: OreId
  readonly name: string
  readonly shortName: string
  readonly baseLot: number | readonly [number, number]
  readonly extraction: 1 | 2 | 3 | 4 | 5
  readonly rarity: OreRarity
  readonly color: string
  readonly highlight: string
  readonly shape: OreShape
  readonly description: string
}

export const ORES: Record<OreId, OreDefinition> = {
  'rusted-copper': {
    id: 'rusted-copper', name: 'Cobre Enferrujado', shortName: 'Cobre', baseLot: 2,
    extraction: 1, rarity: 'Comum', color: '#b96f45', highlight: '#f0b27c', shape: 'node',
    description: 'Veios oxidados e maleáveis, comuns nas encostas do Vale. É a base metálica mais acessível para as primeiras oficinas.',
  },
  'fossil-coal': {
    id: 'fossil-coal', name: 'Carvão Fóssil', shortName: 'Carvão', baseLot: 3,
    extraction: 1, rarity: 'Comum', color: '#32383b', highlight: '#8b969b', shape: 'seam',
    description: 'Camadas densas de matéria carbonizada. Seu valor está no calor constante necessário às caldeiras e fornalhas.',
  },
  'bloody-iron': {
    id: 'bloody-iron', name: 'Ferro Sangrento', shortName: 'Ferro', baseLot: 4,
    extraction: 2, rarity: 'Incomum', color: '#8e4038', highlight: '#e28a72', shape: 'seam',
    description: 'Um ferro de tonalidade rubra encontrado nas paredes profundas da Garganta, resistente e impregnado de sais minerais.',
  },
  'whispering-quartz': {
    id: 'whispering-quartz', name: 'Quartzo Sussurrante', shortName: 'Quartzo', baseLot: 5,
    extraction: 2, rarity: 'Incomum', color: '#a8c8c5', highlight: '#e0ffef', shape: 'cluster',
    description: 'Cristais que vibram próximo a correntes de Éter. Os filamentos internos parecem repetir ecos de sons distantes.',
  },
  'raw-scales': {
    id: 'raw-scales', name: 'Escamas Brutas', shortName: 'Escamas', baseLot: 6,
    extraction: 3, rarity: 'Raro', color: '#647557', highlight: '#b9cb83', shape: 'scales',
    description: 'Fragmentos mineralizados de antigas criaturas do dorso dracônico. Duros, laminados e difíceis de separar da rocha.',
  },
  'abyssal-cobalt': {
    id: 'abyssal-cobalt', name: 'Cobalto Abissal', shortName: 'Cobalto', baseLot: 7,
    extraction: 3, rarity: 'Raro', color: '#345b91', highlight: '#7db9ef', shape: 'node',
    description: 'Nódulos azul-escuros formados sob pressão extrema. Reservam energia em suas inclusões metálicas frias.',
  },
  'draconic-obsidian': {
    id: 'draconic-obsidian', name: 'Obsidiana Dracônica', shortName: 'Obsidiana', baseLot: 8,
    extraction: 4, rarity: 'Épico', color: '#382d48', highlight: '#b083cf', shape: 'shard',
    description: 'Vidro vulcânico negro atravessado por reflexos violeta. As bordas naturais são extremamente cortantes.',
  },
  'solar-gold': {
    id: 'solar-gold', name: 'Ouro Solar', shortName: 'Ouro', baseLot: 9,
    extraction: 4, rarity: 'Épico', color: '#c7922f', highlight: '#ffe394', shape: 'seam',
    description: 'Lâminas douradas que conservam calor e brilho mesmo na penumbra. Aparece em veios antigos e pouco frequentes.',
  },
  'lunar-silver': {
    id: 'lunar-silver', name: 'Prata Lunar', shortName: 'Prata', baseLot: 11,
    extraction: 4, rarity: 'Épico', color: '#aab6c8', highlight: '#eef4ff', shape: 'cluster',
    description: 'Metal claro de resposta sensível ao Éter. Seus agregados cristalinos refletem uma luminosidade fria.',
  },
  'gray-mercury': {
    id: 'gray-mercury', name: 'Mercúrio Cinzento', shortName: 'Mercúrio', baseLot: 13,
    extraction: 5, rarity: 'Lendário', color: '#788789', highlight: '#d2e3dd', shape: 'liquid',
    description: 'Gotas metálicas instáveis retidas em cavidades minerais. Exige contenção cuidadosa antes de qualquer extração.',
  },
  'raw-ether-crystal': {
    id: 'raw-ether-crystal', name: 'Cristal de Éter Bruto', shortName: 'Éter', baseLot: [1, 9],
    extraction: 5, rarity: 'Lendário', color: '#3caea4', highlight: '#b3fff0', shape: 'shard',
    description: 'Cristal saturado de energia arcana, de lote imprevisível. Cada fragmento pulsa em um ritmo próprio.',
  },
}

export const ORE_LIST: readonly OreDefinition[] = Object.values(ORES)
