import { formatFactorization, gcdMany, lcmMany } from '../math/number'
import type { AlloyId, CodexCategory, CodexTarget, HexCell, ResourceId, StructureType } from '../types'
import { BIOME_LIST, BIOMES } from './biomes'
import { LESSONS, LESSON_BY_ID } from './lessons'
import { ORE_LIST, ORES } from './ores'
import { ALLOY_LIST, ALLOYS, resourceName } from './resources'
import { DOCK_TABS, RECIPES, STRUCTURES, STRUCTURE_LIST, recipeLots } from './structures'
import { TERRAIN_LIST, TERRAINS } from './terrains'
import { MACHINE_GUIDES, type MachineGuide } from './machineGuides'
import { CARRIER_GUIDE, isCreature } from './creatures'

export interface CodexDetail {
  readonly label: string
  readonly value: string
}

export interface CodexEntry {
  readonly category: CodexCategory
  readonly id: string
  readonly name: string
  readonly subtitle: string
  readonly description: string
  readonly accent: string
  readonly details: readonly CodexDetail[]
  readonly mechanics?:MachineGuide
}

export interface CellInspection {
  readonly title: string
  readonly subtitle: string
  readonly state: string
  readonly description: string
  readonly target: CodexTarget
}

export const CODEX_CATEGORY_LABELS: Record<CodexCategory, string> = {
  biomes: 'Biomas',
  ores: 'Minérios',
  alloys: 'Ligas',
  terrains: 'Terrenos',
  machines: 'Maquinário',
  creatures: 'Criaturas',
  lessons: 'Aulas',
}

export function formatBaseLot(lot: number | readonly [number, number]): string {
  return typeof lot === 'number' ? `${lot}` : `${lot[0]}–${lot[1]}`
}

export function getCellInspection(cell: HexCell): CellInspection {
  const biome = BIOMES[cell.biome]
  const terrain = TERRAINS[cell.terrain]
  if (cell.deposit) {
    const ore = ORES[cell.deposit.ore]
    return {
      title: ore.name,
      subtitle: `${terrain.name} · ${biome.name}`,
      state: `Jazida intacta · ${cell.deposit.purity}% de pureza · riqueza ${cell.deposit.richness}/3`,
      description: ore.description,
      target: { category: 'ores', id: ore.id },
    }
  }
  return {
    title: terrain.name,
    subtitle: biome.name,
    state: `${terrain.state} · sem jazida exposta`,
    description: terrain.description,
    target: { category: 'terrains', id: terrain.id },
  }
}

export interface FusionBreakdown {
  readonly lines: readonly { resource: ResourceId; name: string; amount: number; lot: number; lots: number; factors: string }[]
  readonly lcm: number
  readonly gcd: number
  readonly sentence: string
  readonly output: number
}

/** The numbers behind a recipe — the same ones that the machines use, written the way a student would show their work. */
export function fusionBreakdown(id: AlloyId): FusionBreakdown | null {
  const recipe = RECIPES[id]
  if (recipe.tier === 0) return null
  const lines = recipeLots(recipe).map((entry) => ({ ...entry, name: resourceName(entry.resource), factors: formatFactorization(entry.lot) }))
  const lots = lines.map((line) => line.lot)
  const lcm = lcmMany(lots), gcd = gcdMany(lots)
  const sentence = `MMC(${lots.join(', ')}) = ${lcm}` + (recipe.catalyst ? ` (ajustado com ${recipe.catalyst} Cristais de Éter)` : '')
    + ' → ' + lines.map((line) => `${line.lots} ${line.lots === 1 ? 'lote' : 'lotes'} de ${line.name}`).join(' + ')
  return { lines, lcm, gcd, sentence, output: recipe.output }
}

export function getCodexEntry(target: CodexTarget): CodexEntry {
  if (target.category === 'biomes') {
    const biome = BIOMES[target.id]
    return {
      category: target.category,
      id: biome.id,
      name: biome.name,
      subtitle: biome.epithet,
      description: biome.description,
      accent: biome.accent,
      details: [
        { label: 'Relevo', value: biome.reliefDescription },
        { label: 'Elevação', value: `${biome.elevation[0]} a ${biome.elevation[1]}` },
        { label: 'Chance de jazida', value: `${Math.round(biome.oreChance * 100)}% antes dos modificadores locais` },
        { label: 'Minérios característicos', value: biome.oreWeights.slice(0, 4).map(({ id }) => ORES[id].name).join(', ') },
        { label: 'Terrenos característicos', value: biome.terrainWeights.slice(0, 4).map(({ id }) => TERRAINS[id].name).join(', ') },
      ],
    }
  }
  if (target.category === 'ores') {
    const ore = ORES[target.id]
    const occurrences = BIOME_LIST
      .map((biome) => ({ biome, weight: biome.oreWeights.find((item) => item.id === ore.id)?.weight ?? 0 }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(({ biome }) => biome.name)
      .join(', ')
    const lot = typeof ore.baseLot === 'number' ? ore.baseLot : null
    const speed = ['Muito rápida', 'Rápida', 'Média', 'Lenta', 'Muito lenta'][ore.extraction - 1] ?? 'Média'
    return {
      category: target.category,
      id: ore.id,
      name: ore.name,
      subtitle: `${ore.rarity} · minério`,
      description: ore.description,
      accent: ore.highlight,
      details: [
        { label: 'Lote base', value: lot ? `${formatBaseLot(ore.baseLot)} — múltiplos: ${[1, 2, 3, 4, 5, 6].map((n) => n * lot).join(', ')}…` : `${formatBaseLot(ore.baseLot)} (curinga: assume o valor que falta)` },
        ...(lot ? [{ label: 'Fatoração do lote', value: formatFactorization(lot) }] : []),
        { label: 'Velocidade de extração', value: `${speed} (nível ${ore.extraction} de 5)` },
        { label: 'Raridade', value: ore.rarity },
        { label: 'Ocorrências favorecidas', value: occurrences },
      ],
    }
  }
  if (target.category === 'alloys') {
    const alloy = ALLOYS[target.id]
    const recipe = RECIPES[target.id]
    const breakdown = fusionBreakdown(target.id)
    const structureName = recipe.tier === 2 ? STRUCTURES.chamber.name : recipe.tier === 1 ? STRUCTURES.furnace.name : 'Forja livre (modo oficina)'
    return {
      category: target.category,
      id: alloy.id,
      name: alloy.name,
      subtitle: recipe.tier === 2 ? 'Liga de Nível 2' : recipe.tier === 1 ? 'Liga de Nível 1' : 'Liga de oficina',
      description: alloy.description,
      accent: alloy.highlight,
      details: [
        { label: 'Receita', value: Object.entries(recipe.inputs).map(([resource, amount]) => `${amount} × ${resourceName(resource as ResourceId)}`).join(' + ') + (recipe.catalyst ? ` + ${recipe.catalyst} × Cristal de Éter` : '') },
        ...(breakdown ? [
          { label: 'Cálculo de sincronia', value: breakdown.sentence },
          { label: 'Lotes e fatores', value: breakdown.lines.map((line) => `${line.name}: lote ${line.lot} = ${line.factors}`).join(' · ') },
          { label: 'MDC dos lotes', value: `${breakdown.gcd}${breakdown.gcd === 1 ? ' (coprimos: o MMC é o produto)' : ' (fator comum que reduz o MMC)'}` },
          { label: 'Rendimento por fusão', value: `${breakdown.output} unidades` },
        ] : []),
        ...(recipe.minRune ? [{ label: 'Exige', value: 'Runa Multiplicadora na Câmara' }] : []),
        ...(recipe.etherCost ? [{ label: 'Custo em Éter Puro', value: `${recipe.etherCost} Pontos de Éter por fusão` }] : []),
        { label: 'Tempo de fundição', value: `${(recipe.durationTicks / 20).toFixed(1)}s em velocidade 1×` },
        { label: 'Estrutura', value: structureName },
      ],
    }
  }
  if(target.category==='creatures'&&target.id==='carrier')return {
    category:'creatures',id:'carrier',name:'Golem Transportador',subtitle:'Colosso rúnico · logística viva',accent:'#c5ae70',
    description:'Um gigante de rocha coberta de musgo, com ombreiras talhadas e braços capazes de erguer pilhas de caixas. Runas douradas despertam sua força; ele recolhe, carrega e entrega as remessas dos Entrepostos.',
    mechanics:CARRIER_GUIDE,
    details:[{label:'Como convocar',value:'Automaticamente pelos Entrepostos de Carga pareados; não ocupa uma vaga de construção.'},{label:'Caixas',value:'10, 50 ou 100 unidades do mesmo recurso.'},{label:'Viagem',value:'1 segundo de preparação + 0,5 segundo por célula em velocidade 1×. Após a descarga, volta vazio à origem à mesma velocidade. A volta continua ao reabrir a partida.'},{label:'Terreno',value:'Atravessa obstáculos; sua área visual maior não altera a ocupação da malha.'}],
  }
  if (target.category === 'machines'||target.category==='creatures') {
    const machine = STRUCTURES[target.id as StructureType]
    const tab = DOCK_TABS.find((candidate) => candidate.id === machine.tab)?.label ?? ''
    return {
      category: isCreature(machine.id)?'creatures':'machines',
      id: machine.id,
      name: machine.name,
      subtitle: `${isCreature(machine.id)?'Criatura':'Aba '+tab} · ${machine.size}×${machine.size}`,
      description: machine.description,
      mechanics:MACHINE_GUIDES[machine.id],
      accent: machine.color,
      details: [
        { label: 'Custo', value: Object.entries(machine.cost).map(([resource, amount]) => `${amount} × ${resourceName(resource as ResourceId)}`).join(', ') },
        { label: 'Durabilidade', value: `${machine.maxHp} pontos de vida` },
        { label: 'Matemática da peça', value: machine.lesson },
        { label: 'Liberação', value: machine.tech ? 'Melhoria do Grande Grimório' : machine.introOrder > 1 ? `Contrato ${machine.introOrder} da campanha` : 'Disponível desde o início' },
      ],
    }
  }
  if (target.category === 'lessons') {
    const lesson = LESSON_BY_ID[target.id] ?? LESSONS[0]
    return {
      category: target.category,
      id: lesson.id,
      name: lesson.title,
      subtitle: lesson.grades,
      description: lesson.summary,
      accent: '#e9b969',
      details: [],
    }
  }
  const terrain = TERRAINS[target.id]
  const occurrences = BIOME_LIST
    .map((biome) => ({ biome, weight: biome.terrainWeights.find((item) => item.id === terrain.id)?.weight ?? 0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(({ biome }) => biome.name)
    .join(', ')
  return {
    category: target.category,
    id: terrain.id,
    name: terrain.name,
    subtitle: terrain.state,
    description: terrain.description,
    accent: terrain.detail,
    details: [
      { label: 'Estado', value: terrain.state },
      { label: 'Ocorrências favorecidas', value: occurrences },
      { label: 'Em contratos', value: ['magma', 'acid', 'basalt', 'ruin'].includes(terrain.id) ? 'Obstáculo natural: não é possível construir aqui (esteiras de levitação cruzam líquidos).' : 'Terreno livre para construção.' },
    ],
  }
}

export function getCodexEntries(category: CodexCategory): readonly CodexEntry[] {
  if (category === 'biomes') return BIOME_LIST.map((item) => getCodexEntry({ category, id: item.id }))
  if (category === 'ores') return ORE_LIST.map((item) => getCodexEntry({ category, id: item.id }))
  if (category === 'alloys') return ALLOY_LIST.map((item) => getCodexEntry({ category, id: item.id }))
  if (category === 'machines') return STRUCTURE_LIST.filter(item=>!isCreature(item.id)).map((item) => getCodexEntry({ category, id: item.id as StructureType }))
  if (category === 'creatures') return (['golem','carrier','gnome'] as const).map(id=>getCodexEntry({category,id}))
  if (category === 'lessons') return LESSONS.map((item) => getCodexEntry({ category, id: item.id }))
  return TERRAIN_LIST.map((item) => getCodexEntry({ category, id: item.id }))
}
