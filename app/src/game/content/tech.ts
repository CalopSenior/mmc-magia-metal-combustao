import type { Profile } from '../types'

export interface TechNode {
  readonly id: string
  readonly branch: 1 | 2 | 3 | 4
  readonly tier: 1 | 2 | 3 | 4
  readonly name: string
  readonly description: string
  readonly teaches: string
  readonly ether: number
  readonly seals: number
}

export const TECH_BRANCHES = [
  { id: 1, name: 'Metalurgia e Escala', subtitle: 'Potências e limites' },
  { id: 2, name: 'Logística e Geometria', subtitle: 'Espaço e proporção' },
  { id: 3, name: 'Automação Gnômica', subtitle: 'Manutenção e prevenção' },
  { id: 4, name: 'Visão Arcana', subtitle: 'Apoio pedagógico' },
] as const

export const TECH: readonly TechNode[] = [
  { id: 'twin-forges', branch: 1, tier: 1, name: 'Forjas Geminadas', ether: 30, seals: 0,
    description: 'Acopla duas fornalhas iguais: a Fornalha Devoradora, o Altar e a Câmara dobram a produção por ciclo no mesmo espaço.',
    teaches: 'Dobro e paridade: 2 × lote.' },
  { id: 'rune-10', branch: 1, tier: 2, name: 'Runa de Dezena (× 10)', ether: 60, seals: 0,
    description: 'Libera a Runa × 10: toda a operação da máquina é multiplicada por 10 em uma única Caixa Rúnica Condensada.',
    teaches: 'Multiplicar por 10 desloca a vírgula: 6 → 60.' },
  { id: 'metallurgy-2', branch: 1, tier: 3, name: 'Metalurgia Nível 2', ether: 100, seals: 1,
    description: 'Libera a Câmara de Transmutação Etérea e as seis ligas de Nível 2.',
    teaches: 'MMC de números maiores (60, 84, 210…).' },
  { id: 'rune-100', branch: 1, tier: 4, name: 'Runas de Centena e Milhar', ether: 160, seals: 2,
    description: 'Libera as Runas × 100 e × 1000 e o modo de Contratos Infinitos sem limite de escala.',
    teaches: 'Potências de 10: 10², 10³ e notação científica.' },
  { id: 'levitation', branch: 2, tier: 1, name: 'Esteiras de Levitação', ether: 30, seals: 0,
    description: 'Esteiras podem cruzar fendas de magma e lagos ácidos.',
    teaches: 'Menor caminho: contar células para estimar o tempo.' },
  { id: 'adjustable-prism', branch: 2, tier: 2, name: 'Prisma Ajustável', ether: 60, seals: 0,
    description: 'O Prisma de duas saídas aceita proporções assimétricas, como 2/3 para um lado e 1/3 para o outro.',
    teaches: 'Frações e razões: 2 : 1 divide 9 em 6 e 3.' },
  { id: 'mithril-bridges', branch: 2, tier: 3, name: 'Pontes de Mithril', ether: 100, seals: 1,
    description: 'Permite cruzar uma esteira sobre a outra sem misturar minérios.',
    teaches: 'Dois fluxos independentes.' },
  { id: 'modular-teleport', branch: 2, tier: 4, name: 'Teleporte Modular', ether: 160, seals: 2,
    description: 'Portais que transferem lotes instantaneamente se a quantidade for um número primo ou múltiplo de 12.',
    teaches: 'Primos e múltiplos de 12.' },
  { id: 'gnome-guild', branch: 3, tier: 1, name: 'Guilda dos Gnomos', ether: 30, seals: 0,
    description: 'Eleva o limite de Gnomos Operários ativos de 2 para 5 e desbloqueia o Gnomo Alquimista (tolerância de resto).',
    teaches: 'Tolerância: absorver até 2 erros por minuto.' },
  { id: 'mercury-boots', branch: 3, tier: 2, name: 'Botas de Mercúrio', ether: 60, seals: 0,
    description: 'Gnomos se movem e consertam 50% mais depressa.',
    teaches: 'Porcentagem: +50% = × 1,5.' },
  { id: 'slag-recycling', branch: 3, tier: 3, name: 'Reciclagem de Escória', ether: 100, seals: 1,
    description: 'Monstros de Escória derrotados se transformam em Pontos de Éter e Cristais de Éter Bruto.',
    teaches: 'O resto da conta vira recurso quando é tratado.' },
  { id: 'chief-engineer', branch: 3, tier: 4, name: 'Engenheiro Chefe', ether: 160, seals: 2,
    description: 'Um Alquimista permanente que prevê erros: avisa antes que um lote errado chegue à máquina.',
    teaches: 'Verificar antes: lote ÷ apetite = resto?' },
  { id: 'flow-lens', branch: 4, tier: 1, name: 'Lente de Fluxo', ether: 30, seals: 0,
    description: 'Mostra o número exato de minérios por minuto passando em cada esteira.',
    teaches: 'Taxa: unidades ÷ tempo.' },
  { id: 'mmc-oracle', branch: 4, tier: 2, name: 'Oráculo do MMC', ether: 60, seals: 0,
    description: 'No Códice, escolha dois minérios para ver as réguas de múltiplos e procurar o ponto de encontro — sem receber a resposta pronta.',
    teaches: 'Múltiplos comuns, um por um.' },
  { id: 'pulse-simulator', branch: 4, tier: 3, name: 'Simulador de Pulso', ether: 100, seals: 1,
    description: 'Libera o tempo em 4× para testar se a matemática da fábrica aguenta sem quebrar.',
    teaches: 'Teste de estresse: o plano ainda funciona mais rápido?' },
] as const

export const TECH_BY_ID = Object.fromEntries(TECH.map((node) => [node.id, node])) as Record<string, TechNode>

export function previousTech(node: TechNode): TechNode | null {
  return TECH.find((candidate) => candidate.branch === node.branch && candidate.tier === node.tier - 1) ?? null
}

export type TechStatus = 'owned' | 'available' | 'locked' | 'poor'

export function techStatus(node: TechNode, profile: Pick<Profile, 'tech' | 'ether' | 'seals'>): TechStatus {
  if (profile.tech.includes(node.id)) return 'owned'
  const previous = previousTech(node)
  if (previous && !profile.tech.includes(previous.id)) return 'locked'
  return profile.ether >= node.ether && profile.seals >= node.seals ? 'available' : 'poor'
}

/** Free workshop mode owns the whole tree. */
export function hasTech(profile: Pick<Profile, 'tech'>, id: string, freeMode = false): boolean {
  return freeMode || profile.tech.includes(id)
}

export function maxRuneLevel(profile: Pick<Profile, 'tech'>, freeMode = false): 0 | 1 | 2 | 3 {
  if (hasTech(profile, 'rune-100', freeMode)) return 3
  if (hasTech(profile, 'rune-10', freeMode)) return 1
  return 0
}

export function maxGnomes(profile: Pick<Profile, 'tech'>, freeMode = false): number {
  return hasTech(profile, 'gnome-guild', freeMode) ? 5 : 2
}
