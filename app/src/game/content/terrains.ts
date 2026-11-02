import type { Terrain } from '../types'

export interface TerrainDefinition {
  readonly id: Terrain
  readonly name: string
  readonly state: string
  readonly description: string
  readonly fill: string
  readonly stroke: string
  readonly detail: string
}

export const TERRAINS: Record<Terrain, TerrainDefinition> = {
  ash: {
    id: 'ash', name: 'Planície de cinzas', state: 'Sedimento estável',
    description: 'Camada macia de cinza e poeira mineral, atravessada por pequenos veios expostos.',
    fill: '#29352f', stroke: '#43564a', detail: '#94a393',
  },
  basalt: {
    id: 'basalt', name: 'Pilar de basalto', state: 'Rocha consolidada',
    description: 'Formações prismáticas de rocha vulcânica que elevam e fragmentam o relevo.',
    fill: '#30343a', stroke: '#505963', detail: '#a4afb6',
  },
  magma: {
    id: 'magma', name: 'Fenda de magma', state: 'Calor extremo',
    description: 'Crosta fina sobre canais incandescentes. O terreno é instável e emite calor contínuo.',
    fill: '#4b2b25', stroke: '#8a4835', detail: '#ff9b51',
  },
  acid: {
    id: 'acid', name: 'Lago ácido', state: 'Superfície corrosiva',
    description: 'Poça mineral esverdeada cercada por depósitos evaporíticos e rocha corroída.',
    fill: '#203b31', stroke: '#3d7453', detail: '#8bd58b',
  },
  ruin: {
    id: 'ruin', name: 'Ruína antiga', state: 'Estrutura remanescente',
    description: 'Restos de alvenaria e mecanismos de uma ocupação anterior, parcialmente tomados pelo terreno.',
    fill: '#3a342d', stroke: '#6a5b47', detail: '#d0b581',
  },
  crystal: {
    id: 'crystal', name: 'Formação cristalina', state: 'Ressonância latente',
    description: 'Agregados translúcidos emergem do solo e concentram vibrações de Éter.',
    fill: '#233b40', stroke: '#3d6970', detail: '#91e4dc',
  },
  slag: {
    id: 'slag', name: 'Campo de escória', state: 'Resíduo mineralizado',
    description: 'Mistura de rocha queimada, óxidos e rejeitos metálicos acumulados em camadas irregulares.',
    fill: '#40352d', stroke: '#6e5642', detail: '#c99565',
  },
  ironstone: {
    id: 'ironstone', name: 'Crista ferruginosa', state: 'Veio estrutural',
    description: 'Afloramento avermelhado e resistente, marcado por fraturas profundas e veios de ferro.',
    fill: '#41312e', stroke: '#714c42', detail: '#cf7f65',
  },
  obsidian: {
    id: 'obsidian', name: 'Campo de obsidiana', state: 'Vidro vulcânico',
    description: 'Placas negras e afiadas formadas pelo resfriamento rápido de fluxos vulcânicos.',
    fill: '#292632', stroke: '#50465f', detail: '#a488bb',
  },
  ether: {
    id: 'ether', name: 'Relva de Éter', state: 'Fluxo arcano ativo',
    description: 'Solo claro coberto por filamentos luminosos que acompanham correntes invisíveis de energia.',
    fill: '#203a38', stroke: '#397169', detail: '#7ee0c9',
  },
}

export const TERRAIN_LIST: readonly TerrainDefinition[] = Object.values(TERRAINS)
