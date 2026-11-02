import type { AlloyId, ResourceId } from '../types'
import { ORES } from './ores'

export interface AlloyDefinition {
  readonly id: AlloyId
  readonly name: string
  readonly shortName: string
  readonly color: string
  readonly highlight: string
  readonly description: string
  /** 0 = workshop alloy from the sandbox, 1 = Altar de Fusão, 2 = Câmara de Transmutação. */
  readonly tier: 0 | 1 | 2
  /** Geometric symbol, so colour is never the only way to tell resources apart. */
  readonly glyph: 'circle' | 'square' | 'diamond' | 'triangle' | 'hexagon' | 'cross'
}

export const ALLOYS: Record<AlloyId, AlloyDefinition> = {
  'draconic-steel': {
    id: 'draconic-steel', name: 'Aço Dracônico', shortName: 'Aço Drac.', color: '#71868b', highlight: '#c5e2e4', tier: 0, glyph: 'square',
    description: 'Ferro Sangrento consolidado pelo calor do Carvão Fóssil. Uma liga de oficina para a Forja livre.',
  },
  electrum: {
    id: 'electrum', name: 'Életron', shortName: 'Életron', color: '#c8b86a', highlight: '#fff0a6', tier: 0, glyph: 'diamond',
    description: 'A união luminosa de Ouro Solar e Prata Lunar, adequada a circuitos e condutores arcanos.',
  },
  'ether-brass': {
    id: 'ether-brass', name: 'Latão Etéreo', shortName: 'Latão Et.', color: '#8ea66f', highlight: '#dcf3a5', tier: 0, glyph: 'circle',
    description: 'Cobre infiltrado por Éter cristalino. Leve, dúctil e capaz de preservar uma carga arcana.',
  },
  'runic-bronze': {
    id: 'runic-bronze', name: 'Bronze Rúnico', shortName: 'Bronze', color: '#a8794b', highlight: '#f0c48a', tier: 1, glyph: 'circle',
    description: 'Cobre e Carvão fundidos em proporção 3 : 2. Liga inicial para engrenagens e esteiras velozes.',
  },
  'gray-steel': {
    id: 'gray-steel', name: 'Aço Cinzento', shortName: 'Aço Cinz.', color: '#7b8590', highlight: '#d3dde5', tier: 1, glyph: 'square',
    description: 'Carvão e Ferro em proporção 4 : 3. Estrutura básica das máquinas de Tier 2 e das armaduras de Golem.',
  },
  'resonant-brass': {
    id: 'resonant-brass', name: 'Latão Ressonante', shortName: 'Latão', color: '#c6a64b', highlight: '#fbe38e', tier: 1, glyph: 'diamond',
    description: 'Cobre e Quartzo em proporção 5 : 2. Usado em componentes ópticos, Prismas Divisores e sensores de fluxo.',
  },
  'scaled-iron': {
    id: 'scaled-iron', name: 'Ferro Escamado', shortName: 'Ferro Esc.', color: '#7e5b49', highlight: '#d3a283', tier: 1, glyph: 'hexagon',
    description: 'Ferro e Escamas em proporção 3 : 2. Liga resistente ao calor para fornalhas de alta pressão.',
  },
  'azure-amalgam': {
    id: 'azure-amalgam', name: 'Amálgama Azul', shortName: 'Amálgama', color: '#4b7fb5', highlight: '#a3d3ff', tier: 1, glyph: 'triangle',
    description: 'Quartzo e Cobalto em proporção 7 : 5. O primeiro grande teste da tabuada (5 × 7). Condutor de mana líquida.',
  },
  'volcanic-glass': {
    id: 'volcanic-glass', name: 'Vidro Vulcânico', shortName: 'Vidro', color: '#5b4b72', highlight: '#c3a5e6', tier: 1, glyph: 'triangle',
    description: 'Escamas e Obsidiana em proporção 4 : 3. Isolante mágico para tubulações e contenção de escória.',
  },
  'astral-electrum': {
    id: 'astral-electrum', name: 'Electrum Astral', shortName: 'Electrum', color: '#d6c35e', highlight: '#fff6b0', tier: 1, glyph: 'diamond',
    description: 'Cobalto e Ouro Solar em proporção 9 : 7. Desafio de tabuada (7 × 9) e base de encantamentos de escala.',
  },
  'dark-chrome': {
    id: 'dark-chrome', name: 'Cromo Sombrio', shortName: 'Cromo', color: '#47506a', highlight: '#9aa7d1', tier: 1, glyph: 'square',
    description: 'Ferro e Cobalto em proporção 7 : 4. Metal anticorrosivo necessário em mapas com lagos ácidos.',
  },
  'draconic-gold': {
    id: 'draconic-gold', name: 'Ouro Dracônico', shortName: 'Ouro Drac.', color: '#e0a631', highlight: '#ffe08a', tier: 1, glyph: 'hexagon',
    description: 'Obsidiana e Ouro Solar em proporção 9 : 8. O ápice das ligas duplas tradicionais (8 × 9).',
  },
  'ether-steel': {
    id: 'ether-steel', name: 'Aço Etéreo', shortName: 'Aço Etér.', color: '#6fa7a8', highlight: '#c4fff4', tier: 2, glyph: 'square',
    description: 'Aço Cinzento (lote 12) com Latão Ressonante (lote 10). MMC 60: 5 ciclos de Aço e 6 de Latão. Liga da guarda real.',
  },
  'fossil-mithril': {
    id: 'fossil-mithril', name: 'Mithril Fóssil', shortName: 'Mithril', color: '#a4b5c9', highlight: '#f2f8ff', tier: 2, glyph: 'triangle',
    description: 'Ferro Escamado (12) com Cromo Sombrio (28). MMC 84: 7 ciclos de Ferro e 3 de Cromo. Leve o bastante para pontes aéreas.',
  },
  'imperial-orichalcum': {
    id: 'imperial-orichalcum', name: 'Oricalco Imperial', shortName: 'Oricalco', color: '#c9753e', highlight: '#ffc58c', tier: 2, glyph: 'hexagon',
    description: 'Bronze Rúnico (6) com Amálgama Azul (35). MMC 210. Uma Runa Multiplicadora evita encher o mapa de caixas.',
  },
  'dorsal-adamantine': {
    id: 'dorsal-adamantine', name: 'Adamantina Dorsal', shortName: 'Adamantina', color: '#7a5aa6', highlight: '#d8b8ff', tier: 2, glyph: 'diamond',
    description: 'Vidro Vulcânico (24) com Ouro Dracônico (72). 72 já é múltiplo de 24: o MMC é o próprio 72.',
  },
  'stellar-silver': {
    id: 'stellar-silver', name: 'Prata Estelar', shortName: 'Prata Est.', color: '#b8c8e6', highlight: '#ffffff', tier: 2, glyph: 'cross',
    description: 'Electrum Astral (63) com Prata Lunar (11). Como 63 não é múltiplo de 11, 3 Cristais de Éter ajustam 63 para 66 = 6 × 11.',
  },
  'dragon-core': {
    id: 'dragon-core', name: 'Núcleo de Dragão', shortName: 'Núcleo', color: '#d1473a', highlight: '#ffb09a', tier: 2, glyph: 'cross',
    description: 'Aço Etéreo (60) com Adamantina Dorsal (72). MMC 360. Contratos lendários exigem Runas × 10 e × 100.',
  },
}

export const ALLOY_LIST: readonly AlloyDefinition[] = Object.values(ALLOYS)

export type ResourceView = { name: string; shortName: string; color: string; highlight: string }

export function getResource(resource: ResourceId): ResourceView {
  if (resource in ALLOYS) return ALLOYS[resource as AlloyId]
  return ORES[resource as keyof typeof ORES]
}

export function resourceName(resource: ResourceId): string {
  return getResource(resource).name
}

const ORE_GLYPHS = ['circle', 'square', 'diamond', 'triangle', 'hexagon', 'cross'] as const
/** Shape drawn beside each resource for colour-blind players (GDD 9.1, Oficina de Acessibilidade). */
export function resourceGlyph(resource: ResourceId): AlloyDefinition['glyph'] {
  if (resource in ALLOYS) return ALLOYS[resource as AlloyId].glyph
  const keys = Object.keys(ORES)
  return ORE_GLYPHS[keys.indexOf(resource) % ORE_GLYPHS.length]
}

export function glyphCharacter(glyph: AlloyDefinition['glyph']): string {
  return { circle: '●', square: '■', diamond: '◆', triangle: '▲', hexagon: '⬢', cross: '✚' }[glyph]
}
